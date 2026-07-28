"""
爬取菜鸟教程 C++ 全部页面，生成知识库 JSON。
输出: backend/runoob_kb.json
"""
import httpx
import json
import re
import time
from bs4 import BeautifulSoup

BASE = 'https://www.runoob.com'

# 99 个 C++ 教程页面
PAGES = [
    ("c++基础", "C++ 教程", "/cplusplus/cpp-tutorial.html"),
    ("c++基础", "C++ 简介", "/cplusplus/cpp-intro.html"),
    ("c++基础", "C++ 环境设置", "/cplusplus/cpp-environment-setup.html"),
    ("c++基础", "C++ 基本语法", "/cplusplus/cpp-basic-syntax.html"),
    ("c++基础", "C++ 注释", "/cplusplus/cpp-comments.html"),
    ("c++基础", "C++ 数据类型", "/cplusplus/cpp-data-types.html"),
    ("c++基础", "C++ 变量类型", "/cplusplus/cpp-variable-types.html"),
    ("c++基础", "C++ 变量作用域", "/cplusplus/cpp-variable-scope.html"),
    ("c++基础", "C++ 常量", "/cplusplus/cpp-constants-literals.html"),
    ("c++基础", "C++ 修饰符类型", "/cplusplus/cpp-modifier-types.html"),
    ("c++基础", "C++ 存储类", "/cplusplus/cpp-storage-classes.html"),
    ("c++基础", "C++ 运算符", "/cplusplus/cpp-operators.html"),
    ("c++基础", "C++ 循环", "/cplusplus/cpp-loops.html"),
    ("c++基础", "C++ 判断", "/cplusplus/cpp-decision.html"),
    ("c++基础", "C++ 函数", "/cplusplus/cpp-functions.html"),
    ("c++基础", "C++ 数字", "/cplusplus/cpp-numbers.html"),
    ("c++基础", "C++ 数组", "/cplusplus/cpp-arrays.html"),
    ("c++基础", "C++ 字符串", "/cplusplus/cpp-strings.html"),
    ("c++基础", "C++ 指针", "/cplusplus/cpp-pointers.html"),
    ("c++基础", "C++ 引用", "/cplusplus/cpp-references.html"),
    ("c++基础", "C++ 日期 & 时间", "/cplusplus/cpp-date-time.html"),
    ("c++基础", "C++ 基本的输入输出", "/cplusplus/cpp-basic-input-output.html"),
    ("c++基础", "C++ 结构体(struct)", "/cplusplus/cpp-struct.html"),
    ("c++基础", "C++ vector 容器", "/cplusplus/cpp-vector.html"),
    ("c++面向对象", "C++ 数据结构", "/cplusplus/cpp-data-structures.html"),
    ("c++面向对象", "C++ 类 & 对象", "/cplusplus/cpp-classes-objects.html"),
    ("c++面向对象", "C++ 继承", "/cplusplus/cpp-inheritance.html"),
    ("c++面向对象", "C++ 重载运算符和重载函数", "/cplusplus/cpp-overloading.html"),
    ("c++面向对象", "C++ 多态", "/cplusplus/cpp-polymorphism.html"),
    ("c++面向对象", "C++ 数据抽象", "/cplusplus/cpp-data-abstraction.html"),
    ("c++面向对象", "C++ 数据封装", "/cplusplus/cpp-data-encapsulation.html"),
    ("c++面向对象", "C++ 接口（抽象类）", "/cplusplus/cpp-interfaces.html"),
    ("c++高级", "C++ 文件和流", "/cplusplus/cpp-files-streams.html"),
    ("c++高级", "C++ 异常处理", "/cplusplus/cpp-exceptions-handling.html"),
    ("c++高级", "C++ 动态内存", "/cplusplus/cpp-dynamic-memory.html"),
    ("c++高级", "C++ 命名空间", "/cplusplus/cpp-namespaces.html"),
    ("c++高级", "C++ 模板", "/cplusplus/cpp-templates.html"),
    ("c++高级", "C++ 预处理器", "/cplusplus/cpp-preprocessor.html"),
    ("c++高级", "C++ 信号处理", "/cplusplus/cpp-signal-handling.html"),
    ("c++高级", "C++ 多线程", "/cplusplus/cpp-multithreading.html"),
    ("c++高级", "C++ Web 编程", "/cplusplus/cpp-web-programming.html"),
    ("c++参考", "C++ STL 教程", "/cplusplus/cpp-stl-tutorial.html"),
    ("c++参考", "C++ 导入标准库", "/cplusplus/cppo-import-header-file.html"),
    ("c++参考", "C++ 标准库", "/cplusplus/cpp-standard-library.html"),
    ("c++参考", "C++ 有用的资源", "/cplusplus/cpp-useful-resources.html"),
    ("c++参考", "C++ 实例", "/cplusplus/cpp-examples.html"),
    ("c++参考", "C++ 测验", "/cplusplus/cpp-quiz.html"),
    ("STL库", "C++ <iostream>", "/cplusplus/cpp-libs-iostream.html"),
    ("STL库", "C++ <fstream>", "/cplusplus/cpp-libs-fstream.html"),
    ("STL库", "C++ <sstream>", "/cplusplus/cpp-libs-sstream.html"),
    ("STL库", "C++ <iomanip>", "/cplusplus/cpp-libs-iomanip.html"),
    ("STL库", "C++ <array>", "/cplusplus/cpp-libs-array.html"),
    ("STL库", "C++ <vector>", "/cplusplus/cpp-libs-vector.html"),
    ("STL库", "C++ <list>", "/cplusplus/cpp-libs-list.html"),
    ("STL库", "C++ <forward_list>", "/cplusplus/cpp-libs-forward_list.html"),
    ("STL库", "C++ <deque>", "/cplusplus/cpp-libs-deque.html"),
    ("STL库", "C++ <stack>", "/cplusplus/cpp-libs-stack.html"),
    ("STL库", "C++ <queue>", "/cplusplus/cpp-libs-queue.html"),
    ("STL库", "C++ <priority_queue>", "/cplusplus/cpp-libs-priority_queue.html"),
    ("STL库", "C++ <set>", "/cplusplus/cpp-libs-set.html"),
    ("STL库", "C++ <unordered_set>", "/cplusplus/cpp-libs-unordered_set.html"),
    ("STL库", "C++ <map>", "/cplusplus/cpp-libs-map.html"),
    ("STL库", "C++ <unordered_map>", "/cplusplus/cpp-libs-unordered_map.html"),
    ("STL库", "C++ <bitset>", "/cplusplus/cpp-libs-bitset.html"),
    ("STL库", "C++ <algorithm>", "/cplusplus/cpp-libs-algorithm.html"),
    ("STL库", "C++ <iterator>", "/cplusplus/cpp-libs-iterator.html"),
    ("STL库", "C++ <functional>", "/cplusplus/cpp-libs-functional.html"),
    ("STL库", "C++ <numeric>", "/cplusplus/cpp-libs-numeric.html"),
    ("STL库", "C++ <complex>", "/cplusplus/cpp-libs-complex.html"),
    ("STL库", "C++ <valarray>", "/cplusplus/cpp-libs-valarray.html"),
    ("STL库", "C++ <cmath>", "/cplusplus/cpp-libs-cmath.html"),
    ("STL库", "C++ <string>", "/cplusplus/cpp-libs-string.html"),
    ("STL库", "C++ <regex>", "/cplusplus/cpp-libs-regex.html"),
    ("STL库", "C++ <ctime>", "/cplusplus/cpp-libs-ctime.html"),
    ("STL库", "C++ <chrono>", "/cplusplus/cpp-libs-chrono.html"),
    ("STL库", "C++ <thread>", "/cplusplus/cpp-libs-thread.html"),
    ("STL库", "C++ <mutex>", "/cplusplus/cpp-libs-mutex.html"),
    ("STL库", "C++ <condition_variable>", "/cplusplus/cpp-libs-condition_variable.html"),
    ("STL库", "C++ <future>", "/cplusplus/cpp-libs-future.html"),
    ("STL库", "C++ <atomic>", "/cplusplus/cpp-libs-atomic.html"),
    ("STL库", "C++ <type_traits>", "/cplusplus/cpp-libs-type_traits.html"),
    ("STL库", "C++ <typeinfo>", "/cplusplus/cpp-libs-typeinfo.html"),
    ("STL库", "C++ <exception>", "/cplusplus/cpp-libs-exception.html"),
    ("STL库", "C++ <stdexcept>", "/cplusplus/cpp-libs-stdexcept.html"),
    ("STL库", "C++ <cstdio>", "/cplusplus/cpp-libs-cstdio.html"),
    ("STL库", "C++ <cstdint>", "/cplusplus/cpp-libs-cstdint.html"),
    ("STL库", "C++ <memory>", "/cplusplus/cpp-libs-memory.html"),
    ("STL库", "C++ <new>", "/cplusplus/cpp-libs-new.html"),
    ("STL库", "C++ <utility>", "/cplusplus/cpp-libs-utility.html"),
    ("STL库", "C++ <random>", "/cplusplus/cpp-libs-random.html"),
    ("STL库", "C++ <locale>", "/cplusplus/cpp-libs-locale.html"),
    ("STL库", "C++ <codecvt>", "/cplusplus/cpp-libs-codecvt.html"),
    ("STL库", "C++ <cassert>", "/cplusplus/cpp-libs-cassert.html"),
    ("STL库", "C++ <cwchar>", "/cplusplus/cpp-libs-cwchar.html"),
    ("STL库", "C++ <climits>", "/cplusplus/cpp-libs-climits.html"),
    ("STL库", "C++ <cfloat>", "/cplusplus/cpp-libs-cfloat.html"),
    ("STL库", "C++ <cstdlib>", "/cplusplus/cpp-libs-cstdlib.html"),
    ("STL库", "C++ <numbers>", "/cplusplus/cpp-libs-numbers.html"),
    ("c++参考", "C++ OpenCV", "/cplusplus/cpp-opencv.html"),
]


def clean_html(html: str) -> str:
    """提取页面正文，保留结构，输出 Markdown 格式。代码块完整保留不拆行。"""
    soup = BeautifulSoup(html, 'html.parser')

    # 移除不需要的元素
    for sel in ['script', 'style', 'nav', 'footer', '.sidebar', '.left-column',
                '.ad', '.ads', 'iframe', '.run-btn', '.try-btn', '.note.mark',
                '.next-link', '.previous-link', '.article-nav']:
        for el in soup.select(sel):
            el.decompose()

    # 移除"广告"相关文字块
    for el in soup.find_all(string=re.compile(r'(广告|字节方舟|讯飞星辰|Coding Plan)', re.IGNORECASE)):
        parent = el.parent
        if parent and len(el.strip()) < 200:
            parent.decompose()

    # 提取正文
    content = soup.select_one('#content') or soup.select_one('article') or soup.select_one('.article') or soup.select_one('.col-middle')
    if not content:
        body = soup.find('body')
        if body:
            for el in body.select('header, .header, .topnav'):
                el.decompose()
            content = body
        else:
            return ''

    # === 结构感知遍历 → Markdown ===
    md_lines: list[str] = []
    skip_tags = {'script', 'style', 'nav', 'footer', 'iframe'}

    def process_element(el, depth=0):
        """递归处理 DOM 元素，输出 Markdown"""
        if not hasattr(el, 'name') or el.name is None:
            # 文本节点
            text = str(el).strip()
            if text:
                md_lines.append(text)
            return

        tag = el.name.lower()
        if tag in skip_tags:
            return

        classes = el.get('class', []) or []
        cls_str = ' '.join(classes)

        # 跳过版权/导航行
        if tag == 'br':
            return

        # 代码块：div.example — 保持代码完整不拆行
        if tag == 'div' and 'example' in cls_str:
            # 提取纯文本（不要 separator，避免多余换行）
            code_text = el.get_text().strip()
            # 去掉开头的"实例"标记
            code_text = re.sub(r'^实例\s*\n*', '', code_text)
            if code_text:
                md_lines.append('\n```cpp')
                for line in code_text.split('\n'):
                    stripped = line.rstrip()
                    md_lines.append(stripped)
                md_lines.append('```\n')
            return

        # 终端命令块：<pre>
        if tag == 'pre':
            code_text = el.get_text()
            if code_text.strip():
                md_lines.append('\n```bash')
                for line in code_text.split('\n'):
                    stripped = line.rstrip()
                    if stripped:
                        md_lines.append(stripped)
                md_lines.append('```\n')
            return

        # 内联代码：<code>
        if tag == 'code' and not el.find_parent('pre'):
            md_lines.append(f'`{el.get_text().strip()}`')
            return

        # 标题：h1/h2/h3
        if tag in ('h1', 'h2', 'h3'):
            level = int(tag[1])
            prefix = '#' * level
            text = el.get_text(strip=True)
            if text and not re.match(r'^(上一篇|下一篇|回到顶部|C\+\+ 教程)$', text):
                md_lines.append(f'\n{prefix} {text}\n')
            return

        # 段落
        if tag == 'p':
            text = el.get_text(strip=True)
            if text and len(text) > 2:
                md_lines.append(f'\n{text}\n')
            return

        # 列表
        if tag in ('ul', 'ol'):
            for li in el.find_all('li', recursive=False):
                text = li.get_text(strip=True)
                if text and not re.match(r'^(关注我们|反馈|建议)$', text):
                    md_lines.append(f'- {text}')
            return

        # 表格
        if tag == 'table':
            rows = el.find_all('tr')
            if rows:
                for row in rows:
                    cells = [td.get_text(strip=True) for td in row.find_all(['td', 'th'])]
                    if cells:
                        md_lines.append('| ' + ' | '.join(cells) + ' |')
                # 表头分隔线
                if len(rows) > 0:
                    first_cells = len(rows[0].find_all(['td', 'th']))
                    md_lines.append('|' + '|'.join(['---'] * first_cells) + '|')
            return

        # 其他块级元素：递归子元素
        if tag in ('div', 'section', 'article', 'span', 'strong', 'em', 'b', 'i', 'a'):
            for child in el.children:
                process_element(child, depth + 1)
        else:
            # 未知标签：直接取文本
            text = el.get_text(strip=True)
            if text and len(text) > 3:
                md_lines.append(text)

    # 遍历主内容
    for child in content.children:
        process_element(child)

    # 清洗
    result = '\n'.join(md_lines)
    # 压缩连续空行
    result = re.sub(r'\n{3,}', '\n\n', result)
    # 去掉单行的"实例"标记
    result = re.sub(r'\n^实例$\n', '\n', result, flags=re.MULTILINE)
    # 去除无关行
    lines = [l.rstrip() for l in result.split('\n')]
    lines = [l for l in lines
             if not re.match(r'^\d+\s*篇笔记|写笔记|关注我们|反馈|建议|^C\+\+ 教程$|^回到顶部$', l)]

    result = '\n'.join(lines).strip()
    # 限制长度
    if len(result) > 12000:
        result = result[:12000] + '\n\n*（内容过长，已截断）*'
    return result


def scrape_all():
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'Accept-Language': 'zh-CN,zh;q=0.9',
    }

    kb = []
    errors = []

    with httpx.Client(headers=headers, follow_redirects=True, timeout=20) as client:
        for i, (category, title, path) in enumerate(PAGES):
            url = BASE + path
            try:
                r = client.get(url)
                if r.status_code != 200:
                    errors.append(f"{title}: HTTP {r.status_code}")
                    print(f"[{i+1:3d}/{len(PAGES)}] SKIP {title} — HTTP {r.status_code}")
                    continue

                content = clean_html(r.text)
                if len(content) < 50:
                    errors.append(f"{title}: 内容过短({len(content)}字符)")
                    print(f"[{i+1:3d}/{len(PAGES)}] WARN {title} — 内容过短({len(content)}字符)")
                    continue

                kb.append({
                    "id": path.replace('/cplusplus/', '').replace('.html', ''),
                    "title": title,
                    "category": category,
                    "url": url,
                    "content": content,
                })
                print(f"[{i+1:3d}/{len(PAGES)}] OK   {title:30s} {len(content):>5}字")

            except Exception as e:
                errors.append(f"{title}: {e}")
                print(f"[{i+1:3d}/{len(PAGES)}] ERR  {title} — {e}")

            # 礼貌延迟
            time.sleep(0.3)

    # 保存
    output_path = __file__.replace('scrape_runoob.py', 'runoob_kb.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump({
            "source": "https://www.runoob.com/cplusplus/cpp-tutorial.html",
            "total": len(kb),
            "errors": errors,
            "entries": kb,
        }, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 完成! {len(kb)}/{len(PAGES)} 页成功，{len(errors)} 页失败")
    print(f"输出: {output_path}")

    # 统计
    cats = {}
    for e in kb:
        cats[e['category']] = cats.get(e['category'], 0) + 1
    print("分类统计:")
    for c, n in sorted(cats.items()):
        print(f"  {c}: {n} 页")
    total_chars = sum(len(e['content']) for e in kb)
    print(f"总字数: {total_chars:,}")


if __name__ == '__main__':
    scrape_all()
