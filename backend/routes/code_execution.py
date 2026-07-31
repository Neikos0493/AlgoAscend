"""代码编译与执行路由"""
import subprocess, os, uuid, time, json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import SessionLocal, get_db_sync
from models import Submission, Exercise, StudentProfile
from problem_detail_service import get_problem_detail as resolve_problem_detail
from problem_identity import resolve_problem_identity
from routes.scrape import (
    LEETCODE_GRAPHQL_URL, LEETCODE_HEADERS, LUOGU_DIFFICULTY_MAP,
    _build_nowcoder_headers, _parse_nowcoder_detail,
)
from problem_media_service import serve_problem_media

router = APIRouter(prefix="/api/code", tags=["code"])
WORK_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "generated")
_SENSITIVE_CHILD_ENV_KEYS = {
    "NOWCODER_COOKIE",
    "LLM_API_KEY",
    "VITE_DEEPSEEK_API_KEY",
}
_NOWCODER_DETAIL_FIELD_BYTES = 128 * 1024
_NOWCODER_DETAIL_TOTAL_BYTES = 512 * 1024


def _bounded_utf8(value, byte_limit: int) -> tuple[str, bool]:
    """Bound untrusted statement text without breaking a UTF-8 code point."""
    text = str(value or "").replace("\r\n", "\n").replace("\r", "\n")
    encoded = text.encode("utf-8")
    if len(encoded) <= byte_limit:
        return text, False
    return encoded[:byte_limit].decode("utf-8", errors="ignore"), True


def _bound_nowcoder_detail(parsed: dict) -> dict:
    """Apply explicit field and total limits while reporting partial statements."""
    detail = {}
    total_bytes = 0
    truncated = False
    for key in (
        "title", "description", "input_description", "output_description",
        "notes", "constraints",
    ):
        remaining = max(0, _NOWCODER_DETAIL_TOTAL_BYTES - total_bytes)
        text, field_truncated = _bounded_utf8(
            parsed.get(key, ""), min(_NOWCODER_DETAIL_FIELD_BYTES, remaining),
        )
        detail[key] = text
        total_bytes += len(text.encode("utf-8"))
        truncated = truncated or field_truncated

    hints = []
    for value in parsed.get("hints", []) if isinstance(parsed.get("hints"), list) else []:
        remaining = max(0, _NOWCODER_DETAIL_TOTAL_BYTES - total_bytes)
        hint, field_truncated = _bounded_utf8(value, min(_NOWCODER_DETAIL_FIELD_BYTES, remaining))
        if hint:
            hints.append(hint)
            total_bytes += len(hint.encode("utf-8"))
        truncated = truncated or field_truncated
        if not remaining:
            break
    detail["hints"] = hints
    detail["samples"] = parsed.get("samples", [])
    has_statement = bool(detail.get("description"))
    has_io = bool(
        detail["samples"]
        or (detail.get("input_description") and detail.get("output_description"))
    )
    detail["detail_status"] = "complete" if has_statement and has_io and not truncated else "partial"
    if truncated:
        detail["warning"] = "牛客题面内容超过安全响应上限，已显示部分内容"
    elif not (has_statement and has_io):
        detail["warning"] = "牛客题面信息不完整，可重新加载以尝试补全"
    return detail


def _user_code_environment() -> dict[str, str]:
    """Keep compiler/runtime basics while excluding backend credentials."""
    return {
        key: value for key, value in os.environ.items()
        if key not in _SENSITIVE_CHILD_ENV_KEYS
    }


@router.get("/problem-media/{media_key}")
async def get_problem_media(media_key: str):
    """Serve only registered, validated, same-origin problem media."""
    return await serve_problem_media(media_key, session_factory=SessionLocal)


@router.get("/problem-detail")
async def get_problem_detail(platform: str = "", pid: str = "", url: str = ""):
    """Return a stable local-first problem detail response."""
    try:
        identity = resolve_problem_identity(platform, pid, url)
    except ValueError as exc:
        return {
            "id": "", "pid": "", "native_id": "", "platform": platform,
            "title": "", "description": "", "difficulty": "", "tags": [],
            "samples": [], "hints": [], "url": url, "source": "invalid",
            "error": str(exc),
        }

    detail, _ = await resolve_problem_detail(
        identity.platform,
        identity.native_id,
        identity.canonical_url,
        fetchers={
            "luogu": _fetch_luogu_detail,
            "leetcode": _fetch_leetcode_detail,
            "nowcoder": _fetch_nowcoder_detail,
        },
        session_factory=SessionLocal,
    )
    return detail


async def _fetch_luogu_detail(pid: str):
    import httpx
    url = f"https://www.luogu.com.cn/problem/{pid}?_contentOnly=1"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0), follow_redirects=True) as client:
            resp = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/json",
            })
            if resp.status_code != 200:
                return {
                    "title": "", "description": "", "samples": [],
                    "error": f"洛谷 API 返回 HTTP {resp.status_code}",
                }
            data = resp.json()
            problem = data.get("currentData", {}).get("problem", {}) if isinstance(data, dict) else {}
            meaningful_keys = (
                "title", "description", "background", "inputFormat",
                "outputFormat", "samples", "hints",
            )
            if not isinstance(problem, dict) or not any(problem.get(key) not in (None, "", []) for key in meaningful_keys):
                return {
                    "title": "", "description": "", "samples": [],
                    "error": "洛谷题目数据为空，请确认题目 ID 正确",
                }
            desc = problem.get("description", "") or problem.get("background", "")
            samples = problem.get("samples", []) if isinstance(problem.get("samples"), list) else []
            hints = problem.get("hints", []) if isinstance(problem.get("hints"), list) else []
            detail = {
                "title": problem.get("title", ""),
                "description": _strip_html(desc)[:3000] if isinstance(desc, str) else "",
                "input_description": _strip_html(problem.get("inputFormat", ""))[:3000] if isinstance(problem.get("inputFormat", ""), str) else "",
                "output_description": _strip_html(problem.get("outputFormat", ""))[:3000] if isinstance(problem.get("outputFormat", ""), str) else "",
                "difficulty": _luogu_diff(problem.get("difficulty", 0)),
                "samples": [
                    {"input": str(sample[0]), "output": str(sample[1])}
                    for sample in samples[:3]
                    if isinstance(sample, (list, tuple)) and len(sample) >= 2
                ],
                "hints": [_strip_html(hint) for hint in hints[:3] if isinstance(hint, str)],
                "url": f"https://www.luogu.com.cn/problem/{pid}",
            }
            return detail
    except Exception as e:
        return {
            "title": "", "description": "", "samples": [],
            "error": f"洛谷请求失败: {str(e)[:100]}",
        }


LEETCODE_DETAIL_QUERY = """
query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    title
    translatedTitle
    content
    translatedContent
    difficulty
    topicTags { name translatedName }
  }
}
"""


async def _fetch_leetcode_detail(slug: str):
    import httpx

    identity = resolve_problem_identity("leetcode", slug)
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0), follow_redirects=True) as client:
            response = await client.post(
                LEETCODE_GRAPHQL_URL,
                json={"query": LEETCODE_DETAIL_QUERY, "variables": {"titleSlug": identity.native_id}},
                headers={**LEETCODE_HEADERS, "Referer": identity.canonical_url},
            )
            response.raise_for_status()
            payload = response.json()
    except Exception as exc:
        return {"title": "", "description": "", "samples": [], "error": f"力扣请求失败: {str(exc)[:100]}"}

    if not isinstance(payload, dict):
        return {"title": "", "description": "", "samples": [], "error": "力扣 GraphQL 返回无效数据"}
    errors = payload.get("errors")
    if errors:
        messages = [str(item.get("message", "")) for item in errors if isinstance(item, dict)] if isinstance(errors, list) else []
        message = "; ".join(filter(None, messages)) or "未知 GraphQL 错误"
        return {"title": "", "description": "", "samples": [], "error": f"力扣 GraphQL 错误: {message[:160]}"}
    data = payload.get("data")
    question = data.get("question") if isinstance(data, dict) else None
    if not isinstance(question, dict):
        return {"title": "", "description": "", "samples": [], "error": "力扣 GraphQL 未返回题目数据"}

    tags = question.get("topicTags") if isinstance(question.get("topicTags"), list) else []
    return {
        "title": question.get("translatedTitle") or question.get("title") or "",
        "description": _strip_html(question.get("translatedContent") or question.get("content") or ""),
        "difficulty": question.get("difficulty") or "",
        "tags": [tag.get("translatedName") or tag.get("name") for tag in tags if isinstance(tag, dict) and (tag.get("translatedName") or tag.get("name"))],
        "samples": [],
        "url": identity.canonical_url,
    }


async def _fetch_nowcoder_detail(pid: str):
    import httpx

    identity = resolve_problem_identity("nowcoder", pid)
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0), follow_redirects=True) as client:
            resp = await client.get(identity.canonical_url, headers=_build_nowcoder_headers())
            resp.raise_for_status()
        parsed = _parse_nowcoder_detail(resp.text)
        detail = _bound_nowcoder_detail(parsed)
        detail["url"] = identity.canonical_url
        meaningful = any(
            detail.get(key) not in (None, "", [])
            for key in (
                "description", "input_description", "output_description",
                "notes", "constraints", "hints", "samples",
            )
        )
        if not meaningful:
            detail["error"] = "牛客题面解析失败，请重新登录或稍后重试"
        for key in ("time_limit", "space_limit", "accepted", "submitted", "ac_rate"):
            if parsed.get(key) is not None:
                detail[key] = parsed[key]
        if parsed.get("media"):
            detail["media"] = parsed["media"]
        if parsed.get("waf_blocked"):
            detail["error"] = "被牛客 WAF 拦截"
    except Exception as exc:
        detail = {
            "title": "",
            "description": "",
            "samples": [],
            "url": identity.canonical_url,
            "error": str(exc)[:100],
        }
    return detail


def _strip_html(html: str) -> str:
    """Strip markup while retaining image positions as Markdown references."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(str(html or ""), "html.parser")
    for image in soup.find_all("img"):
        source = str(image.get("src") or image.get("data-src") or "").strip()
        alt = str(image.get("alt") or "").replace("]", "").strip()
        image.replace_with(f"\n![{alt}]({source})\n" if source else "")
    text = soup.get_text("\n", strip=True)
    text = text.replace("\\n", "\n").replace("\\t", " ")
    return text.strip()


def _luogu_diff(d: int) -> str:
    return "暂未评定" if d == 0 else LUOGU_DIFFICULTY_MAP.get(d, f"难度{d}")


class CodeRunRequest(BaseModel):
    code: str
    stdin: str = ""
    student_id: int = 1
    problem_id: str = ""
    problem_title: str = ""
    problem_platform: str = ""
    problem_difficulty: str = ""
    problem_tags: list = []
    timeout_ms: int = 5000
    memory_limit_kb: int = 262144


class TestCase(BaseModel):
    stdin: str = ""
    expected: str = ""


class RunTestsRequest(BaseModel):
    code: str
    test_cases: list[TestCase] = []
    student_id: int = 1
    problem_id: str = ""
    problem_title: str = ""
    timeout_ms: int = 5000


class AISummaryRequest(BaseModel):
    code: str
    problem_id: str = ""
    problem_title: str = ""
    problem_platform: str = ""
    status: str = ""
    stdout: str = ""
    stderr: str = ""
    compile_output: str = ""
    runtime_ms: float = 0.0
    memory_kb: float = 0.0


@router.get("/g++-check")
async def check_compiler():
    try:
        result = subprocess.run(
            ["g++", "--version"], capture_output=True, text=True, timeout=5,
            env=_user_code_environment(),
        )
        return {
            "available": True,
            "version": result.stdout.splitlines()[0] if result.stdout else "unknown",
        }
    except Exception:
        return {"available": False, "message": "g++ 未安装或不在 PATH 中。请安装 MinGW-w64。"}


def _compile_error_hint(stderr_text: str) -> str:
    """根据编译错误信息返回可能的原因提示"""
    lower = stderr_text.lower()
    if "was not declared in this scope" in lower or "undeclared" in lower:
        return "变量或函数未声明，请检查拼写或是否包含了正确的头文件"
    if "expected ';'" in lower or "expected '}'" in lower:
        return "语法错误，缺少分号或花括号"
    if "no match for" in lower or "cannot convert" in lower:
        return "类型不匹配，请检查变量类型和赋值"
    if "undefined reference" in lower:
        return "链接错误，函数已声明但未定义，或缺少库链接"
    if "file not found" in lower or "No such file" in lower:
        return "头文件未找到，请检查 #include 路径"
    if "error:" in lower:
        return "编译错误，请检查上方具体报错信息"
    return "请仔细检查代码语法"


def _runtime_error_hint(stderr_text: str, exit_code: int) -> str:
    """根据运行时错误返回可能的原因"""
    if exit_code == -1073741819:  # 0xC0000005 ACCESS_VIOLATION
        return "内存访问违规(ACCESS_VIOLATION)，可能是数组越界、空指针或访问已释放的内存"
    if exit_code == -1073741571:  # 0xC00000FD STACK_OVERFLOW
        return "栈溢出(STACK_OVERFLOW)，可能是递归过深或局部数组过大"
    lower = stderr_text.lower()
    if "segmentation fault" in lower:
        return "段错误(Segmentation Fault)，通常是数组越界、空指针解引用或访问非法内存"
    if "assert" in lower:
        return "断言失败(Assertion Failed)，程序运行时某个条件不满足"
    if "terminate called" in lower:
        return "程序异常终止，可能是未捕获的异常或内存分配失败"
    if "stack overflow" in lower:
        return "栈溢出，递归过深或局部变量过大"
    return f"程序异常退出(exit code: {exit_code})"


@router.post("/run")
async def run_code(req: CodeRunRequest):
    if not req.code.strip():
        raise HTTPException(400, "代码不能为空")

    os.makedirs(WORK_DIR, exist_ok=True)
    job_id = str(uuid.uuid4())[:8]
    src = os.path.join(WORK_DIR, f"temp_{job_id}.cpp")
    exe = os.path.join(WORK_DIR, f"temp_{job_id}.exe")

    submission_id = 0
    db = get_db_sync()
    try:
        submission = Submission(
            student_id=req.student_id,
            problem_id=req.problem_id,
            problem_title=req.problem_title,
            problem_platform=req.problem_platform,
            problem_difficulty=req.problem_difficulty,
            problem_tags=req.problem_tags,
            code=req.code,
            language="cpp",
            status="compiling",
            stdin=req.stdin,
        )
        db.add(submission)
        db.commit()
        submission_id = submission.id
    except Exception as e:
        db.rollback()
        # DB 失败不影响执行，继续但无 submission_id
        print(f"[code run] db error: {e}")
    finally:
        db.close()

    try:
        with open(src, "w", encoding="utf-8", errors="replace") as f:
            f.write(req.code)

        # 编译
        compile_start = time.perf_counter()
        try:
            compile_proc = subprocess.run(
                ["g++", "-std=c++17", "-O2", "-Wall", "-o", exe, src],
                capture_output=True, text=True, timeout=15,
                env=_user_code_environment(),
            )
        except FileNotFoundError:
            _cleanup(src, exe)
            return {
                "status": "compile_error",
                "stdout": "", "stderr": "",
                "compile_output": "系统未安装 g++ 编译器。请安装 MinGW-w64 并将 g++.exe 加入 PATH 环境变量。",
                "runtime_ms": 0, "memory_kb": 0,
                "submission_id": submission_id,
                "possible_cause": "g++ 编译器未安装或未配置。下载地址: https://winlibs.com 或安装 MSYS2/MinGW-w64",
            }

        compile_ms = (time.perf_counter() - compile_start) * 1000

        if compile_proc.returncode != 0:
            stderr_text = compile_proc.stderr[:3000]
            _quick_update(submission_id, status="compile_error",
                          compile_output=stderr_text, runtime_ms=round(compile_ms, 1))
            _update_profile_from_submission(submission_id)
            _cleanup(src, exe)
            return {
                "status": "compile_error",
                "stdout": "", "stderr": stderr_text,
                "compile_output": stderr_text,
                "runtime_ms": round(compile_ms, 1), "memory_kb": 0,
                "submission_id": submission_id,
                "possible_cause": _compile_error_hint(stderr_text),
            }

        # 执行
        try:
            run_start = time.perf_counter()
            exec_proc = subprocess.Popen(
                [exe], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                stderr=subprocess.PIPE, text=True,
                env=_user_code_environment(),
            )
            try:
                outs, errs = exec_proc.communicate(
                    input=req.stdin, timeout=max(1, req.timeout_ms / 1000)
                )
                runtime_ms = round((time.perf_counter() - run_start) * 1000, 1)
                mem_bytes = 0
                try:
                    import psutil
                    p = psutil.Process(exec_proc.pid)
                    mem_bytes = p.memory_info().rss
                except Exception:
                    pass
                memory_kb = round(mem_bytes / 1024, 1)

                if runtime_ms > req.timeout_ms:
                    status = "time_limit"
                elif exec_proc.returncode != 0:
                    status = "runtime_error"
                else:
                    status = "accepted"

                possible_cause = None
                if status == "runtime_error":
                    possible_cause = _runtime_error_hint(errs, exec_proc.returncode)

                _quick_update(submission_id, status=status,
                              stdout=outs[:5000], stderr=errs[:3000],
                              runtime_ms=runtime_ms, memory_kb=memory_kb,
                              exit_code=exec_proc.returncode)
                _update_profile_from_submission(submission_id)
                _cleanup(src, exe)
                return {
                    "status": status,
                    "stdout": outs[:5000], "stderr": errs[:3000],
                    "compile_output": "",
                    "runtime_ms": runtime_ms, "memory_kb": memory_kb,
                    "submission_id": submission_id,
                    "possible_cause": possible_cause,
                }
            except subprocess.TimeoutExpired:
                exec_proc.kill()
                exec_proc.wait()
                elapsed = round((time.perf_counter() - run_start) * 1000, 1)
                _quick_update(submission_id, status="time_limit", runtime_ms=elapsed)
                _update_profile_from_submission(submission_id)
                _cleanup(src, exe)
                return {
                    "status": "time_limit",
                    "stdout": "", "stderr": "",
                    "compile_output": "",
                    "runtime_ms": elapsed, "memory_kb": 0,
                    "submission_id": submission_id,
                    "possible_cause": f"程序运行时间超过限制({req.timeout_ms}ms)。可能是死循环、算法复杂度过高或输入数据量过大。",
                }
        except FileNotFoundError:
            _quick_update(submission_id, status="runtime_error", stderr="可执行文件未生成")
            _cleanup(src, exe)
            return {
                "status": "compile_error",
                "stdout": "", "stderr": "可执行文件未生成，编译可能未成功",
                "compile_output": "",
                "runtime_ms": 0, "memory_kb": 0,
                "submission_id": submission_id,
                "possible_cause": "编译产物未生成，请检查 g++ 是否正确安装",
            }
    except Exception as e:
        _quick_update(submission_id, status="runtime_error", stderr=str(e)[:3000])
        _cleanup(src, exe)
        return {
            "status": "runtime_error",
            "stdout": "", "stderr": str(e)[:3000],
            "compile_output": "",
            "runtime_ms": 0, "memory_kb": 0,
            "submission_id": submission_id,
            "possible_cause": f"执行异常: {str(e)[:200]}",
        }


@router.post("/run-tests")
async def run_tests(req: RunTestsRequest):
    """批量运行测试用例，逐条对比输出"""
    if not req.code.strip():
        raise HTTPException(400, "代码不能为空")
    if not req.test_cases:
        raise HTTPException(400, "至少需要一个测试用例")

    os.makedirs(WORK_DIR, exist_ok=True)
    job_id = str(uuid.uuid4())[:8]
    src = os.path.join(WORK_DIR, f"temp_{job_id}.cpp")
    exe = os.path.join(WORK_DIR, f"temp_{job_id}.exe")

    # 编译
    try:
        with open(src, "w", encoding="utf-8", errors="replace") as f:
            f.write(req.code)
    except Exception as e:
        return {"status": "compile_error", "compile_output": str(e), "results": []}

    try:
        compile_proc = subprocess.run(
            ["g++", "-std=c++17", "-O2", "-Wall", "-o", exe, src],
            capture_output=True, text=True, timeout=15,
            env=_user_code_environment(),
        )
    except FileNotFoundError:
        _cleanup(src, exe)
        return {"status": "compile_error", "compile_output": "g++ 编译器未安装", "results": []}

    if compile_proc.returncode != 0:
        _cleanup(src, exe)
        return {"status": "compile_error", "compile_output": compile_proc.stderr[:3000], "results": []}

    # 逐条运行测试用例
    results = []
    passed = 0
    for i, tc in enumerate(req.test_cases):
        try:
            run_start = time.perf_counter()
            exec_proc = subprocess.Popen(
                [exe], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                env=_user_code_environment(),
            )
            try:
                outs, errs = exec_proc.communicate(
                    input=tc.stdin, timeout=max(1, req.timeout_ms / 1000)
                )
                runtime_ms = round((time.perf_counter() - run_start) * 1000, 1)
                actual = outs.rstrip()
                expected = tc.expected.rstrip() if tc.expected else ""
                # 宽松比较：忽略末尾空白差异
                is_pass = (actual == expected) if expected else None

                results.append({
                    "index": i + 1,
                    "stdin": tc.stdin[:200],
                    "expected": expected[:500] if expected else "(无期望输出)",
                    "actual": actual[:500],
                    "stderr": errs[:500],
                    "passed": is_pass,
                    "runtime_ms": runtime_ms,
                })
                if is_pass is True:
                    passed += 1
            except subprocess.TimeoutExpired:
                exec_proc.kill()
                exec_proc.wait()
                results.append({
                    "index": i + 1, "stdin": tc.stdin[:200],
                    "expected": tc.expected[:500] if tc.expected else "(无期望输出)",
                    "actual": "(超时)", "stderr": f"超过 {req.timeout_ms}ms 限制",
                    "passed": False, "runtime_ms": req.timeout_ms,
                })
        except Exception as e:
            results.append({
                "index": i + 1, "stdin": tc.stdin[:200],
                "expected": tc.expected[:500] if tc.expected else "",
                "actual": "(执行异常)", "stderr": str(e)[:200],
                "passed": False, "runtime_ms": 0,
            })

    _cleanup(src, exe)
    total = len(req.test_cases)
    return {
        "status": "completed",
        "passed": passed,
        "total": total,
        "all_pass": passed == total,
        "results": results,
    }


@router.post("/ai-summary")
async def ai_summary(req: AISummaryRequest):
    try:
        from llm_service import chat_completion_sync

        prompt = f"""你是一位 C++ 算法教练。请根据学生的代码提交结果，用中文给出简短总结(不超过200字)：

【题目】{req.problem_title or '自定义练习'}
【平台】{req.problem_platform or '自主练习'}
【提交状态】{req.status}
【运行时间】{req.runtime_ms}ms
【内存使用】{req.memory_kb}KB

【学生代码】
```cpp
{req.code[:2000]}
```

{"【编译错误】" + req.compile_output[:500] if req.compile_output else ""}
{"【运行错误】" + req.stderr[:500] if req.stderr else ""}

请从以下三个角度分析：
1. 值得肯定的地方
2. 可以改进的地方
3. 建议练习的方向"""

        result = chat_completion_sync(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5, max_tokens=400,
        )
        return {"summary": result.get("content", "") if isinstance(result, dict) else str(result)}
    except Exception as e:
        return {"summary": f"AI 总结暂不可用: {str(e)[:100]}"}


# ---- helpers ----

def _quick_update(submission_id: int, **kwargs):
    if not submission_id:
        return
    db = get_db_sync()
    try:
        sub = db.query(Submission).filter(Submission.id == submission_id).first()
        if sub:
            for k, v in kwargs.items():
                setattr(sub, k, v)
            db.commit()
    except Exception:
        try: db.rollback()
        except: pass
    finally:
        db.close()


def _cleanup(*paths):
    for p in paths:
        try:
            os.remove(p)
        except Exception:
            pass


def _update_profile_from_submission(submission_id: int):
    """根据提交结果更新学生画像"""
    db = get_db_sync()
    try:
        sub = db.query(Submission).filter(Submission.id == submission_id).first()
        if not sub:
            return

        # 创建 Exercise 记录（用于 Dashboard 统计）
        exercise = Exercise(
            student_id=sub.student_id,
            question_type="code_submission",
            title=sub.problem_title or "代码练习",
            difficulty=sub.problem_difficulty or "基础",
            tags=sub.problem_tags or [],
            student_answer=sub.code[:500],
            is_correct=(sub.status == "accepted"),
            score=100 if sub.status == "accepted" else (
                60 if sub.status == "runtime_error" else 0
            ),
            topic=sub.problem_platform or "",
        )
        db.add(exercise)

        # 更新 profile.error_patterns
        profile = db.query(StudentProfile).filter(
            StudentProfile.student_id == sub.student_id
        ).first()
        if profile:
            ep = profile.error_patterns or {}
            common_errors = list(ep.get("common_errors", []))
            weak_areas = list(ep.get("weak_areas", []))

            if sub.status == "compile_error":
                if "编译错误" not in common_errors:
                    common_errors.append("编译错误")
            elif sub.status == "runtime_error":
                if "运行时错误" not in common_errors:
                    common_errors.append("运行时错误")
            elif sub.status == "time_limit":
                if "超时(TLE)" not in weak_areas:
                    weak_areas.append("超时(TLE)")
            elif sub.status == "memory_limit":
                if "内存超限(MLE)" not in weak_areas:
                    weak_areas.append("内存超限(MLE)")

            ep["common_errors"] = list(set(common_errors))[-10:]
            ep["weak_areas"] = list(set(weak_areas))[-10:]
            profile.error_patterns = ep
            profile.updated_at = datetime.utcnow()

        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
