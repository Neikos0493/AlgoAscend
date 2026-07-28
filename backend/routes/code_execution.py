"""代码编译与执行路由"""
import subprocess, os, uuid, time, json
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_db_sync
from models import Submission, Exercise, StudentProfile

router = APIRouter(prefix="/api/code", tags=["code"])
WORK_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "generated")

# 题目详情缓存（进程内）
_problem_cache: dict = {}


@router.get("/problem-detail")
async def get_problem_detail(platform: str = "", pid: str = "", url: str = ""):
    """爬取单个题目的完整描述（带缓存）"""
    cache_key = f"{platform}:{pid}"
    if cache_key in _problem_cache:
        return _problem_cache[cache_key]

    try:
        if platform == "luogu":
            return await _fetch_luogu_detail(pid)
        elif platform == "leetcode":
            return await _fetch_leetcode_detail(url or pid)
        elif platform == "nowcoder":
            return await _fetch_nowcoder_detail(url or pid)
        else:
            return {"description": "", "error": "不支持的平台"}
    except Exception as e:
        return {"description": "", "error": f"获取失败: {str(e)[:200]}"}


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
                return {"description": f"洛谷 API 返回 {resp.status_code}", "samples": []}
            data = resp.json()
            problem = data.get("currentData", {}).get("problem", {})
            if not problem:
                return {"description": "题目数据为空，请确认题目ID正确", "samples": []}
            desc = problem.get("description", "") or problem.get("background", "")
            samples = problem.get("samples", [])
            hints = problem.get("hints", [])
            detail = {
                "title": problem.get("title", ""),
                "description": _strip_html(desc)[:3000] or "（洛谷暂未提供文字描述，请查看原题链接）",
                "difficulty": _luogu_diff(problem.get("difficulty", 0)),
                "samples": [{"input": str(s[0]), "output": str(s[1])} for s in samples[:3]],
                "hints": [_strip_html(h) for h in hints[:3]],
                "url": f"https://www.luogu.com.cn/problem/{pid}",
            }
            _problem_cache[f"luogu:{pid}"] = detail
            return detail
    except Exception as e:
        return {"description": f"网络错误，无法连接洛谷。请确保网络正常。可直接点击原题链接查看。", "samples": [], "error": str(e)[:100]}


async def _fetch_leetcode_detail(url_or_slug: str):
    detail = {
        "title": "",
        "description": "请前往 LeetCode 查看完整题目描述（LeetCode GraphQL API 需登录）",
        "samples": [],
        "url": url_or_slug if url_or_slug.startswith("http") else f"https://leetcode.cn/problems/{url_or_slug}/",
    }
    _problem_cache[f"leetcode:{url_or_slug}"] = detail
    return detail


async def _fetch_nowcoder_detail(url: str):
    import httpx, re
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(15.0), follow_redirects=True) as client:
            resp = await client.get(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Cookie": os.getenv("NOWCODER_COOKIE", ""),
            })
            text = resp.text
            m = re.search(r'<div[^>]*class="[^"]*subject[^"]*"[^>]*>(.*?)</div>', text, re.DOTALL)
            desc = _strip_html(m.group(1)) if m else ""
            detail = {
                "title": "",
                "description": desc[:3000] or "题目描述获取失败，请前往牛客查看",
                "samples": [],
                "url": url,
            }
    except Exception:
        detail = {"title": "", "description": "获取失败，网络不可达", "samples": [], "url": url}
    _problem_cache[f"nowcoder:{url}"] = detail
    return detail


def _strip_html(html: str) -> str:
    import re
    text = re.sub(r'<[^>]+>', '', html)
    text = text.replace("\\n", "\n").replace("\\t", " ")
    return text.strip()


def _luogu_diff(d: int) -> str:
    diffs = {0: "暂未评定", 1: "入门", 2: "普及-", 3: "普及/提高-", 4: "普及+/提高", 5: "提高+/省选-", 6: "省选/NOI-", 7: "NOI/NOI+"}
    return diffs.get(d, f"难度{d}")


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
            ["g++", "--version"], capture_output=True, text=True, timeout=5
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
