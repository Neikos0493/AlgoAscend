"""
牛客网 ACM 技能页爬虫
URL: https://ac.nowcoder.com/acm/skill/acm
1. 爬取主页面获取技能分类列表（tagId/名称/题目数）
2. 通过题库列表页 + tagId 过滤逐页爬取题目
3. 去重后保存为 JSON

表结构:
  <tr data-problemid="PID">
    <td><a>NC_ID</a></td>
    <td colspan=2>
      <a class="title">TITLE</a>
      <a class="tag-label js-tag" data-id="TAG">标签</a>...
    </td>
    <td></td>          # 难度（列表页为空）
    <td>PASS_COUNT</td> # 通过人数
    <td>操作按钮</td>
  </tr>
"""
import httpx
import re
import json
import time
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9",
}

PROBLEM_LIST_URL = "https://ac.nowcoder.com/acm/problem/list"
SKILL_LIST_URL = "https://ac.nowcoder.com/acm/skill/acm"
PAGE_SIZE = 50
MAX_PAGES = 20


def create_client() -> httpx.Client:
    c = httpx.Client(headers=HEADERS, follow_redirects=True, timeout=20)
    c.get("https://ac.nowcoder.com/")
    c.headers["Referer"] = "https://ac.nowcoder.com/"
    return c


def scrape_skills(client: httpx.Client) -> list[dict]:
    """爬取主页面所有技能分类"""
    print("[Step 1] 爬取技能分类列表...")
    r = client.get(SKILL_LIST_URL)
    soup = BeautifulSoup(r.text, "html.parser")

    skills = []
    seen = set()
    links = soup.find_all("a", href=re.compile(r"/acm/skill/detail/acm/\d+"))

    for link in links:
        href = link["href"]
        if href in seen:
            continue
        seen.add(href)

        tag_id = href.rstrip("/").split("/")[-1]
        text = link.get_text(strip=True)

        m = re.match(r"(.+?)(\d+)人练习共(\d+)道题目", text)
        if m:
            name = m.group(1).strip()
            practice_count = int(m.group(2))
            problem_count = int(m.group(3))
        else:
            name = text
            practice_count = 0
            problem_count = 0

        skills.append({
            "tag_id": tag_id,
            "name": name,
            "practice_count": practice_count,
            "problem_count": problem_count,
        })

    skills.sort(key=lambda s: -s["problem_count"])
    print(f"  {len(skills)} 个技能分类, 预估 {sum(s['problem_count'] for s in skills)} 题")
    return skills


def scrape_problems_by_tag(client: httpx.Client, tag_id: str) -> list[dict]:
    """逐页爬取某个 tagId 下的所有题目"""
    problems = []
    seen = set()

    for page in range(1, MAX_PAGES + 1):
        r = client.get(PROBLEM_LIST_URL, params={
            "tagId": tag_id,
            "page": str(page),
            "pageSize": str(PAGE_SIZE),
        })

        if "aliyun_waf" in r.text[:500]:
            break

        soup = BeautifulSoup(r.text, "html.parser")
        table = soup.find("table")
        if not table:
            break

        rows = table.find_all("tr")[1:]
        if not rows:
            break

        new_in_page = 0
        for row in rows:
            pid = row.get("data-problemid", "").strip()
            if not pid or pid in seen:
                continue

            tds = row.find_all("td")
            if len(tds) < 4:
                continue

            # td[0]: NC ID
            nc_id = tds[0].get_text(strip=True)

            # td[1]: 标题 + 标签 (colspan=2)
            title_link = tds[1].find("a", class_="title")
            title = title_link.get_text(strip=True) if title_link else tds[1].get_text(strip=True)[:60]

            # 标签: <a class="tag-label js-tag" data-id="...">
            tag_labels = tds[1].find_all("a", class_="tag-label")
            tags = [a.get_text(strip=True) for a in tag_labels]

            # td[3]: 通过人数 (td[2] 是空难度列)
            pass_count = 0
            try:
                pass_count = int(tds[3].get_text(strip=True) or "0")
            except ValueError:
                pass_count = 0

            seen.add(pid)
            problems.append({
                "id": f"nowcoder-{pid}",
                "pid": pid,
                "nc_id": nc_id,
                "title": title,
                "tags": tags,
                "pass_count": pass_count,
                "url": f"https://ac.nowcoder.com/acm/problem/{pid}",
            })
            new_in_page += 1

        if new_in_page == 0:
            break

        if page % 5 == 0:
            time.sleep(0.3)

    return problems


def main():
    print("=" * 50)
    print("牛客网 ACM 技能页 爬虫")
    print("=" * 50)

    client = create_client()

    # Step 1
    skills = scrape_skills(client)

    # Step 2
    all_problems = []
    print(f"\n[Step 2] 逐技能爬取题目...")

    for i, skill in enumerate(skills):
        tag_id = skill["tag_id"]
        name = skill["name"]
        expected = skill["problem_count"]

        print(f"  [{i+1:>3}/{len(skills)}] {name[:30]:30s} tag={tag_id} expect={expected:>4} ", end="", flush=True)

        try:
            problems = scrape_problems_by_tag(client, tag_id)
            for p in problems:
                p["skill_name"] = name
                p["skill_tag_id"] = tag_id
            all_problems.extend(problems)
            print(f"-> got {len(problems):>4}")
        except Exception as e:
            print(f"-> ERROR: {e}")

        if (i + 1) % 20 == 0:
            time.sleep(1)

    client.close()

    # Step 3: 去重
    seen = set()
    unique = []
    for p in all_problems:
        if p["pid"] not in seen:
            seen.add(p["pid"])
            unique.append(p)

    print(f"\n{'=' * 50}")
    print(f"完成!")
    print(f"  技能: {len(skills)}")
    print(f"  题目(去重前): {len(all_problems)}")
    print(f"  题目(去重后): {len(unique)}")

    # 统计
    skill_counts = {}
    for p in unique:
        sn = p.get("skill_name", "")
        skill_counts[sn] = skill_counts.get(sn, 0) + 1

    print(f"\n  题目最多的 10 个技能:")
    for sn, c in sorted(skill_counts.items(), key=lambda x: -x[1])[:10]:
        print(f"    {sn}: {c}")

    # 保存
    output = {
        "source": "https://ac.nowcoder.com/acm/skill/acm",
        "total_skills": len(skills),
        "total_problems": len(unique),
        "skills": [{k: s[k] for k in ("tag_id", "name", "problem_count", "practice_count")} for s in skills],
        "problems": unique,
    }

    out_path = "nowcoder_skills_result.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\n  已保存: {out_path} ({len(json.dumps(output, ensure_ascii=False)):,} bytes)")

    return unique


if __name__ == "__main__":
    main()
