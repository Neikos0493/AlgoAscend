"""
知识库搜索 API + 牛客题库搜索 API
TF-IDF 中文分词搜索，每次加载知识库时重建索引
支持双知识库：基础语法（runoob）+ 算法教程（hello-algo）
"""
import os
import json
import re
import math
from fastapi import APIRouter, Query
from typing import List, Optional

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])

# ============================================================
# 知识库加载与索引
# ============================================================

BACKEND_DIR = os.path.dirname(os.path.dirname(__file__))
RUNOOB_PATH = os.path.join(BACKEND_DIR, "runoob_kb.json")
HELLO_ALGO_PATH = os.path.join(BACKEND_DIR, "hello_algo_kb.json")
PROBLEM_BANK_PATH = os.path.join(os.path.dirname(__file__), "problem_bank.py")

_kb_entries: list[dict] = []
_kb_sources: list[dict] = []         # [{id, name, icon, count}]
_df: dict[str, int] = {}
_idf: dict[str, float] = {}
_tfidf_matrix: list[dict[str, float]] = []
_nc_problems: list[dict] = []


def _tokenize(text: str) -> list[str]:
    """简单中文分词"""
    text = re.sub(r'[^\w\u4e00-\u9fff]', ' ', text)
    raw = text.lower().split()
    tokens = []
    for w in raw:
        w = w.strip()
        if len(w) >= 2:
            tokens.append(w)
        if re.search(r'[\u4e00-\u9fff]', w) and len(w) >= 4:
            for i in range(len(w) - 1):
                if re.search(r'[\u4e00-\u9fff]', w[i:i+2]):
                    tokens.append(w[i:i+2])
    return tokens


def _build_index():
    global _df, _idf, _tfidf_matrix
    if not _kb_entries:
        return
    _df = {}
    for entry in _kb_entries:
        text = entry.get('title', '') + ' ' + entry.get('category', '') + ' ' + entry.get('content', '')
        tokens = set(_tokenize(text))
        for t in tokens:
            _df[t] = _df.get(t, 0) + 1
    N = len(_kb_entries)
    _idf = {}
    for term, count in _df.items():
        _idf[term] = math.log((N - count + 0.5) / (count + 0.5) + 1.0)
    _tfidf_matrix = []
    for entry in _kb_entries:
        text = entry.get('title', '') + ' ' + entry.get('category', '') + ' ' + entry.get('content', '')
        tokens = _tokenize(text)
        tf = {}
        for t in tokens:
            tf[t] = tf.get(t, 0) + 1
        vec = {}
        for t, count in tf.items():
            vec[t] = (1 + math.log(count)) * _idf.get(t, 0)
        _tfidf_matrix.append(vec)


def _load_json(path: str, source_id: str, source_name: str) -> list[dict]:
    """加载单个知识库 JSON，统一添加 source 字段"""
    entries = []
    try:
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            raw_entries = data.get('entries', [])
            for e in raw_entries:
                e['source'] = source_id
                e['source_name'] = source_name
            entries = raw_entries
            print(f"[知识库] 加载 {source_name}: {len(entries)} 条")
    except Exception as e:
        print(f"[知识库] 加载 {source_name} 失败: {e}")
    return entries


def load_kb():
    global _kb_entries, _kb_sources
    entries = []

    # 加载基础语法
    entries += _load_json(RUNOOB_PATH, 'runoob', 'C++ 基础语法')
    # 加载算法教程
    entries += _load_json(HELLO_ALGO_PATH, 'hello-algo', 'Hello 算法')

    _kb_entries = entries

    # 构建来源统计
    source_counts: dict[str, dict] = {}
    for e in entries:
        sid = e.get('source', 'unknown')
        if sid not in source_counts:
            source_counts[sid] = {
                'id': sid,
                'name': e.get('source_name', sid),
                'count': 0,
            }
        source_counts[sid]['count'] += 1
    _kb_sources = list(source_counts.values())

    _build_index()
    return len(entries) > 0


def load_nc_problems():
    global _nc_problems
    try:
        import importlib.util, sys
        spec = importlib.util.spec_from_file_location("problem_bank", PROBLEM_BANK_PATH)
        if spec and spec.loader:
            pb = importlib.util.module_from_spec(spec)
            sys.modules['problem_bank'] = pb
            spec.loader.exec_module(pb)
            _nc_problems = list(pb.NOWCODER_PROBLEMS)
            return True
    except Exception as e:
        print(f"[题库] 加载牛客题库失败: {e}")
    _nc_problems = []
    return False


def search_kb(query: str, top_k: int = 3, source: str = '') -> list[dict]:
    """搜索知识库"""
    if not _kb_entries or not _tfidf_matrix:
        return []

    query_tokens = _tokenize(query)
    query_tf = {}
    for t in query_tokens:
        query_tf[t] = query_tf.get(t, 0) + 1
    query_vec = {}
    for t, count in query_tf.items():
        query_vec[t] = (1 + math.log(count)) * _idf.get(t, 0)

    scores = []
    query_norm = math.sqrt(sum(v * v for v in query_vec.values()))
    if query_norm == 0:
        return []

    for idx, doc_vec in enumerate(_tfidf_matrix):
        # 来源过滤
        if source and _kb_entries[idx].get('source', '') != source:
            continue
        dot = sum(query_vec.get(t, 0) * doc_vec.get(t, 0) for t in query_vec)
        doc_norm = math.sqrt(sum(v * v for v in doc_vec.values()))
        if doc_norm == 0:
            continue
        sim = dot / (query_norm * doc_norm)
        if sim > 0.01:
            scores.append((sim, idx))

    scores.sort(key=lambda x: -x[0])
    results = []
    for sim, idx in scores[:top_k]:
        e = _kb_entries[idx]
        results.append({
            "title": e['title'],
            "category": e.get('category', ''),
            "source": e.get('source', ''),
            "source_name": e.get('source_name', ''),
            "url": e['url'],
            "content": e.get('content', '')[:2000],
            "relevance": round(sim, 3),
        })
    return results


def search_problems(query: str, top_k: int = 3) -> list[dict]:
    if not _nc_problems:
        return []
    keywords = _tokenize(query)
    scored = []
    for p in _nc_problems:
        score = 0
        title_lower = p['title'].lower()
        for kw in keywords:
            if kw in title_lower:
                score += 3
        for kw in keywords:
            for tag in p.get('tags', []):
                if kw in tag.lower():
                    score += 2
        for kw in keywords:
            if kw in p.get('difficulty', '').lower():
                score += 1
        if score > 0:
            scored.append((score, p))
    scored.sort(key=lambda x: -x[0])
    return [
        {
            "id": p['id'],
            "title": p['title'],
            "difficulty": p['difficulty'],
            "tags": p.get('tags', [])[:5],
            "url": p['url'],
            "relevance": score,
        }
        for score, p in scored[:top_k]
    ]


# ============================================================
# API 端点
# ============================================================

@router.on_event("startup")
def on_startup():
    load_kb()
    load_nc_problems()
    srcs = ', '.join(f"{s['name']}({s['count']})" for s in _kb_sources)
    print(f"[知识库] 已加载 {len(_kb_entries)} 条: {srcs} | 题库 {len(_nc_problems)} 题")


@router.get("/sources")
async def list_sources():
    """列出所有知识库来源"""
    return {"sources": _kb_sources, "total_entries": len(_kb_entries)}


@router.get("/search")
async def search(
    q: str = Query(..., description="搜索关键词"),
    top_k: int = Query(3, ge=1, le=10),
    source: str = Query('', description="按来源筛选: runoob / hello-algo"),
):
    if not _kb_entries:
        return {"results": [], "total": 0, "message": "知识库为空"}
    results = search_kb(q, top_k, source)
    return {"results": results, "total": len(results)}


@router.get("/sections")
async def list_sections(
    source: str = Query('', description="按来源筛选"),
):
    """列出知识库分类（可指定来源）"""
    cats: dict[str, dict] = {}
    for e in _kb_entries:
        if source and e.get('source', '') != source:
            continue
        c = e.get('category', '其他')
        s = e.get('source', '')
        if c not in cats:
            cats[c] = {'name': c, 'count': 0, 'source': s}
        cats[c]['count'] += 1
    return {
        "total": sum(c['count'] for c in cats.values()),
        "sections": sorted(cats.values(), key=lambda x: x['name']),
        "sources": _kb_sources,
    }


@router.get("/entries")
async def list_entries(
    section: Optional[str] = Query(None, description="按分类筛选"),
    source: str = Query('', description="按来源筛选"),
):
    """列出知识库全部条目"""
    entries = _kb_entries
    if section:
        entries = [e for e in entries if e.get('category') == section]
    if source:
        entries = [e for e in entries if e.get('source', '') == source]
    sections = sorted({e.get("category", "") for e in _kb_entries})
    return {
        "total": len(entries),
        "entries": [
            {
                "title": e["title"],
                "category": e.get("category", ""),
                "source": e.get("source", ""),
                "source_name": e.get("source_name", ""),
                "url": e["url"],
                "summary": e.get("content", "")[:200],
            }
            for e in entries
        ],
        "sections": sections,
    }


@router.get("/entry")
async def get_entry(url: str = Query(..., description="知识库条目 URL")):
    """获取单条知识库条目的完整内容"""
    for e in _kb_entries:
        if e.get("url") == url:
            return {
                "found": True,
                "title": e["title"],
                "category": e.get("category", ""),
                "source": e.get("source", ""),
                "source_name": e.get("source_name", ""),
                "url": e["url"],
                "content": e.get("content", ""),
            }
    return {"found": False, "message": "条目不存在"}


@router.get("/problems/search")
async def search_nc_problems(
    q: str = Query(..., description="搜索关键词"),
    top_k: int = Query(3, ge=1, le=10),
):
    if not _nc_problems:
        return {"results": [], "total": 0, "message": "题库未加载"}
    results = search_problems(q, top_k)
    return {"results": results, "total": len(results)}


@router.post("/rebuild")
async def rebuild_kb():
    loaded = load_kb()
    load_nc_problems()
    return {"success": loaded, "total": len(_kb_entries), "sources": _kb_sources}
