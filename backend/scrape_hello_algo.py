"""
爬取 Hello 算法 (hello-algo.com) 全部章节，生成知识库 JSON。
只保留 C++ 代码块 + 文字说明，避免多语言冗余。
输出: backend/hello_algo_kb.json
"""
import httpx
import json
import os
import re
import time
from bs4 import BeautifulSoup, NavigableString

BASE = 'https://www.hello-algo.com'

# 所有章节 (分类, 章节名, URL路径) — 排除 参考文献/纸质书
PAGES = [
    # 序
    ("序", "序", "/chapter_hello_algo/"),
    # 第0章 前言
    ("前言", "0.1 关于本书", "/chapter_preface/about_the_book/"),
    ("前言", "0.2 如何使用本书", "/chapter_preface/suggestions/"),
    ("前言", "0.3 小结", "/chapter_preface/summary/"),
    # 第1章 初识算法
    ("初识算法", "1.1 算法无处不在", "/chapter_introduction/algorithms_are_everywhere/"),
    ("初识算法", "1.2 算法是什么", "/chapter_introduction/what_is_dsa/"),
    ("初识算法", "1.3 小结", "/chapter_introduction/summary/"),
    # 第2章 复杂度分析
    ("复杂度分析", "2.1 算法效率评估", "/chapter_computational_complexity/performance_evaluation/"),
    ("复杂度分析", "2.2 迭代与递归", "/chapter_computational_complexity/iteration_and_recursion/"),
    ("复杂度分析", "2.3 时间复杂度", "/chapter_computational_complexity/time_complexity/"),
    ("复杂度分析", "2.4 空间复杂度", "/chapter_computational_complexity/space_complexity/"),
    ("复杂度分析", "2.5 小结", "/chapter_computational_complexity/summary/"),
    # 第3章 数据结构
    ("数据结构", "3.1 数据结构分类", "/chapter_data_structure/classification_of_data_structure/"),
    ("数据结构", "3.2 基本数据类型", "/chapter_data_structure/basic_data_types/"),
    ("数据结构", "3.3 数字编码", "/chapter_data_structure/number_encoding/"),
    ("数据结构", "3.4 字符编码", "/chapter_data_structure/character_encoding/"),
    ("数据结构", "3.5 小结", "/chapter_data_structure/summary/"),
    # 第4章 数组与链表
    ("数组与链表", "4.1 数组", "/chapter_array_and_linkedlist/array/"),
    ("数组与链表", "4.2 链表", "/chapter_array_and_linkedlist/linked_list/"),
    ("数组与链表", "4.3 列表", "/chapter_array_and_linkedlist/list/"),
    ("数组与链表", "4.4 内存与缓存", "/chapter_array_and_linkedlist/ram_and_cache/"),
    ("数组与链表", "4.5 小结", "/chapter_array_and_linkedlist/summary/"),
    # 第5章 栈与队列
    ("栈与队列", "5.1 栈", "/chapter_stack_and_queue/stack/"),
    ("栈与队列", "5.2 队列", "/chapter_stack_and_queue/queue/"),
    ("栈与队列", "5.3 双向队列", "/chapter_stack_and_queue/deque/"),
    ("栈与队列", "5.4 小结", "/chapter_stack_and_queue/summary/"),
    # 第6章 哈希表
    ("哈希表", "6.1 哈希表", "/chapter_hashing/hash_map/"),
    ("哈希表", "6.2 哈希冲突", "/chapter_hashing/hash_collision/"),
    ("哈希表", "6.3 哈希算法", "/chapter_hashing/hash_algorithm/"),
    ("哈希表", "6.4 小结", "/chapter_hashing/summary/"),
    # 第7章 树
    ("树", "7.1 二叉树", "/chapter_tree/binary_tree/"),
    ("树", "7.2 二叉树遍历", "/chapter_tree/binary_tree_traversal/"),
    ("树", "7.3 二叉树数组表示", "/chapter_tree/array_representation_of_tree/"),
    ("树", "7.4 二叉搜索树", "/chapter_tree/binary_search_tree/"),
    ("树", "7.5 AVL树", "/chapter_tree/avl_tree/"),
    ("树", "7.6 小结", "/chapter_tree/summary/"),
    # 第8章 堆
    ("堆", "8.1 堆", "/chapter_heap/heap/"),
    ("堆", "8.2 建堆操作", "/chapter_heap/build_heap/"),
    ("堆", "8.3 Top-K问题", "/chapter_heap/top_k/"),
    ("堆", "8.4 小结", "/chapter_heap/summary/"),
    # 第9章 图
    ("图", "9.1 图", "/chapter_graph/graph/"),
    ("图", "9.2 图基础操作", "/chapter_graph/graph_operations/"),
    ("图", "9.3 图的遍历", "/chapter_graph/graph_traversal/"),
    ("图", "9.4 小结", "/chapter_graph/summary/"),
    # 第10章 搜索
    ("搜索", "10.1 二分查找", "/chapter_searching/binary_search/"),
    ("搜索", "10.2 二分查找插入点", "/chapter_searching/binary_search_insertion/"),
    ("搜索", "10.3 二分查找边界", "/chapter_searching/binary_search_edge/"),
    ("搜索", "10.4 哈希优化策略", "/chapter_searching/replace_linear_by_hashing/"),
    ("搜索", "10.5 重识搜索算法", "/chapter_searching/searching_algorithm_revisited/"),
    ("搜索", "10.6 小结", "/chapter_searching/summary/"),
    # 第11章 排序
    ("排序", "11.1 排序算法", "/chapter_sorting/sorting_algorithm/"),
    ("排序", "11.2 选择排序", "/chapter_sorting/selection_sort/"),
    ("排序", "11.3 冒泡排序", "/chapter_sorting/bubble_sort/"),
    ("排序", "11.4 插入排序", "/chapter_sorting/insertion_sort/"),
    ("排序", "11.5 快速排序", "/chapter_sorting/quick_sort/"),
    ("排序", "11.6 归并排序", "/chapter_sorting/merge_sort/"),
    ("排序", "11.7 堆排序", "/chapter_sorting/heap_sort/"),
    ("排序", "11.8 桶排序", "/chapter_sorting/bucket_sort/"),
    ("排序", "11.9 计数排序", "/chapter_sorting/counting_sort/"),
    ("排序", "11.10 基数排序", "/chapter_sorting/radix_sort/"),
    ("排序", "11.11 小结", "/chapter_sorting/summary/"),
    # 第12章 分治
    ("分治", "12.1 分治算法", "/chapter_divide_and_conquer/divide_and_conquer/"),
    ("分治", "12.2 分治搜索策略", "/chapter_divide_and_conquer/binary_search_recur/"),
    ("分治", "12.3 构建树问题", "/chapter_divide_and_conquer/build_binary_tree_problem/"),
    ("分治", "12.4 汉诺塔问题", "/chapter_divide_and_conquer/hanota_problem/"),
    ("分治", "12.5 小结", "/chapter_divide_and_conquer/summary/"),
    # 第13章 回溯
    ("回溯", "13.1 回溯算法", "/chapter_backtracking/backtracking_algorithm/"),
    ("回溯", "13.2 全排列问题", "/chapter_backtracking/permutations_problem/"),
    ("回溯", "13.3 子集和问题", "/chapter_backtracking/subset_sum_problem/"),
    ("回溯", "13.4 N皇后问题", "/chapter_backtracking/n_queens_problem/"),
    ("回溯", "13.5 小结", "/chapter_backtracking/summary/"),
    # 第14章 动态规划
    ("动态规划", "14.1 初探动态规划", "/chapter_dynamic_programming/intro_to_dynamic_programming/"),
    ("动态规划", "14.2 DP问题特性", "/chapter_dynamic_programming/dp_problem_features/"),
    ("动态规划", "14.3 DP解题思路", "/chapter_dynamic_programming/dp_solution_pipeline/"),
    ("动态规划", "14.4 0-1背包问题", "/chapter_dynamic_programming/knapsack_problem/"),
    ("动态规划", "14.5 完全背包问题", "/chapter_dynamic_programming/unbounded_knapsack_problem/"),
    ("动态规划", "14.6 编辑距离问题", "/chapter_dynamic_programming/edit_distance_problem/"),
    ("动态规划", "14.7 小结", "/chapter_dynamic_programming/summary/"),
    # 第15章 贪心
    ("贪心", "15.1 贪心算法", "/chapter_greedy/greedy_algorithm/"),
    ("贪心", "15.2 分数背包问题", "/chapter_greedy/fractional_knapsack_problem/"),
    ("贪心", "15.3 最大容量问题", "/chapter_greedy/max_capacity_problem/"),
    ("贪心", "15.4 最大切分乘积问题", "/chapter_greedy/max_product_cutting_problem/"),
    ("贪心", "15.5 小结", "/chapter_greedy/summary/"),
    # 第16章 附录
    ("附录", "16.1 编程环境安装", "/chapter_appendix/installation/"),
    ("附录", "16.3 术语表", "/chapter_appendix/terminology/"),
]

# C++ 代码块标识 — 在 hello-algo 中通常以 **C++** 标记
CPP_HEADER_PATTERN = re.compile(r'\*\*C\+\+\*\*', re.IGNORECASE)


def fetch_page(client: httpx.Client, url: str) -> str | None:
    """获取页面 HTML（15秒超时，避免卡死）"""
    try:
        resp = client.get(url, follow_redirects=True, timeout=15.0)
        resp.raise_for_status()
        return resp.text
    except Exception as e:
        print(f"  ❌ 获取失败: {e}")
        return None


# SVG/按钮等噪音文本
_NOISE_TEXTS = {
    'Tags', 'Actions', 'Edit button', 'View button', 'Page content',
    'Previous page', 'Next page', 'Back to top',
    'Last update:', 'Previous', 'Next',
}
_NOISE_PATTERNS = [
    re.compile(r'^Font Awesome Free'),
    re.compile(r'^Copyright \d+ Fonticons'),
    re.compile(r'^! Font Awesome'),
]


def _is_noise(text: str) -> bool:
    """判断文本是否为噪音"""
    t = text.strip()
    if not t:
        return True
    if t in _NOISE_TEXTS:
        return True
    for pat in _NOISE_PATTERNS:
        if pat.search(t):
            return True
    return False


def clean_markdown(html: str) -> str:
    """将 HTML 正文转换为干净 Markdown，只保留 C++ 代码块"""
    soup = BeautifulSoup(html, 'html.parser')

    # 找到正文容器
    content = (soup.select_one('.md-content__inner')
               or soup.select_one('.md-content')
               or soup.select_one('article')
               or soup)

    # 移除噪音元素
    for tag in content.select(
        'nav, footer, .md-sidebar, .md-header, .md-tabs, .md-footer, '
        '.edit-link, .md-source-file, script, style, noscript, '
        'svg, .md-top, .md-consent, .md-dialog, .headerlink, '
        '.md-feedback, .md-search, .md-annotation'
    ):
        tag.decompose()

    lines: list[str] = []

    def process_element(el, depth=0):
        if isinstance(el, NavigableString):
            text = str(el).strip()
            if not _is_noise(text):
                lines.append(text)
            return

        tag = el.name.lower() if el.name else ''

        # 跳过 SVG/按钮
        if tag in ('svg', 'button', 'path', 'circle', 'rect', 'polygon'):
            return

        cls = ' '.join(el.get('class', []))
        if 'tabbed-panel' in cls or 'tabbed-set' in cls:
            _process_tabbed(el)
            return

        # 标题
        if tag in ('h1', 'h2', 'h3', 'h4'):
            level = int(tag[1])
            prefix = '#' * level
            text = el.get_text(strip=True)
            # 移除标题末尾的 ¶ 永久链接符号
            text = re.sub(r'\s*¶$', '', text)
            if text:
                lines.append(f'\n{prefix} {text}\n')

        # 段落
        elif tag == 'p':
            text = el.get_text(strip=True)
            if text:
                lines.append(f'\n{text}\n')

        # 代码块 (非标签页内的)
        elif tag == 'pre':
            # 检查是否在 C++ 上下文
            code_el = el.select_one('code')
            if code_el:
                lang = ''
                code_classes = ' '.join(code_el.get('class', []))
                for cls_part in code_el.get('class', []):
                    if cls_part.startswith('language-'):
                        lang = cls_part[9:]
                    elif cls_part in ('cpp', 'c++', 'c', 'python', 'java', 'go', 'rust', 'js', 'ts', 'swift', 'dart', 'csharp', 'kotlin', 'ruby'):
                        lang = cls_part
                code_text = code_el.get_text()
                if lang in ('cpp', 'c++', 'c'):
                    lines.append(f'\n```cpp\n{code_text}\n```\n')
                elif lang == '':
                    lines.append(f'\n```\n{code_text}\n```\n')

        # 列表
        elif tag in ('ul', 'ol'):
            for li in el.select('li'):
                text = li.get_text(strip=True)
                if text:
                    prefix = '- ' if tag == 'ul' else '1. '
                    lines.append(f'{prefix}{text}')
            lines.append('')

        # 表格
        elif tag == 'table':
            # 表头
            thead = el.select_one('thead')
            tbody = el.select_one('tbody')
            rows = []
            if thead:
                rows.append([th.get_text(strip=True) for th in thead.select('th')])
            if tbody:
                for tr in tbody.select('tr'):
                    rows.append([td.get_text(strip=True) for td in tr.select('td')])
            if not rows:
                for tr in el.select('tr'):
                    cells = tr.select('th, td')
                    if cells:
                        rows.append([c.get_text(strip=True) for c in cells])

            if rows:
                # 计算列数
                col_count = max(len(r) for r in rows)
                # 对齐每列
                padded_rows = [r + [''] * (col_count - len(r)) for r in rows]
                # 表头
                lines.append('| ' + ' | '.join(padded_rows[0]) + ' |')
                lines.append('| ' + ' | '.join(['---'] * col_count) + ' |')
                for row in padded_rows[1:]:
                    lines.append('| ' + ' | '.join(row) + ' |')
                lines.append('')

        # 强调/粗体
        elif tag in ('strong', 'b'):
            text = el.get_text(strip=True)
            if text:
                lines.append(f'**{text}**')

        # 图片标注
        elif tag == 'figcaption':
            text = el.get_text(strip=True)
            if text:
                lines.append(f'> {text}')

        # 提示块 (admonition)
        elif 'admonition' in cls:
            title_el = el.select_one('.admonition-title')
            title = title_el.get_text(strip=True) if title_el else '提示'
            body = ''
            for child in el.children:
                if child.name != 'p' or 'admonition-title' not in ' '.join(child.get('class', [])):
                    if hasattr(child, 'get_text'):
                        body += child.get_text(strip=True) + '\n'
            lines.append(f'\n> **{title}**\n> {body}\n')

        # 普通 div — 递归处理子元素
        else:
            for child in el.children:
                if hasattr(child, 'name') or (isinstance(child, NavigableString) and str(child).strip()):
                    process_element(child, depth + 1)

    def _process_tabbed(el):
        """处理 hello-algo 的多语言标签页，只提取 C++ 内容"""
        labels = el.select('.tabbed-labels label')
        blocks = el.select('.tabbed-content .tabbed-block')

        for i, label in enumerate(labels):
            label_text = label.get_text(strip=True).lower()
            is_cpp = any(x in label_text for x in ['c++', 'cpp', 'c '])
            if is_cpp and i < len(blocks):
                block = blocks[i]
                # 提取 pre > code
                for pre in block.select('pre'):
                    code_el = pre.select_one('code')
                    if code_el:
                        lang = 'cpp'
                        code_text = code_el.get_text()
                        lines.append(f'\n```cpp\n{code_text}\n```\n')

    process_element(content)

    # 合并结果
    text = '\n'.join(lines)

    # 清理多余空行
    text = re.sub(r'\n{3,}', '\n\n', text)

    # LaTeX 转换: \(...\) → $...$, \[...\] → $$...$$
    text = re.sub(r'\\\[', '$$', text)
    text = re.sub(r'\\\]', '$$', text)
    text = re.sub(r'\\\(', '$', text)
    text = re.sub(r'\\\)', '$', text)
    # 处理双重转义的情况 \\( → $ (由 BeautifulSoup 产生的)
    text = re.sub(r'\\\\\(', '$', text)
    text = re.sub(r'\\\\\)', '$', text)
    # 处理数学空格
    text = re.sub(r'\$ +', '$', text)
    text = re.sub(r' +\$', '$', text)

    return text.strip()


def scrape():
    print("=" * 60)
    print("Hello 算法爬虫 — 只提取 C++ 代码")
    print(f"共 {len(PAGES)} 页")
    print("=" * 60)

    client = httpx.Client(
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'zh-CN,zh;q=0.9',
        },
        follow_redirects=True,
        timeout=15.0,
    )

    entries = []
    errors = []
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hello_algo_kb.json")

    for idx, (category, title, path) in enumerate(PAGES):
        url = BASE + path
        print(f"\n[{idx+1}/{len(PAGES)}] {category} / {title}", flush=True)

        html = fetch_page(client, url)
        if not html:
            errors.append(url)
            # 保存当前进度
            _save_progress(out_path, entries, errors)
            continue

        try:
            content = clean_markdown(html)
        except Exception as e:
            print(f"  ❌ 解析异常: {e}")
            errors.append(url)
            _save_progress(out_path, entries, errors)
            continue

        if not content or len(content) < 20:
            print(f"  ⚠️  内容过短 ({len(content)} chars)，跳过")
            errors.append(url)
            _save_progress(out_path, entries, errors)
            continue

        entries.append({
            "title": title,
            "category": category,
            "url": url,
            "source": "hello-algo",
            "content": content,
        })
        print(f"  ✅ {len(content)} 字符")

        time.sleep(0.5)

    client.close()

    # 最终保存
    _save_progress(out_path, entries, errors, final=True)
    print(f"\n{'=' * 60}")
    print(f"完成! {len(entries)}/{len(PAGES)} 页成功")
    if errors:
        print(f"失败 {len(errors)} 页: {errors}")
    print(f"输出: {out_path}")
    print(f"{'=' * 60}")


def _save_progress(out_path: str, entries: list, errors: list, final: bool = False):
    """保存当前进度到 JSON 文件"""
    output = {
        "source": "https://www.hello-algo.com",
        "source_name": "Hello 算法",
        "total": len(entries),
        "errors": errors,
        "entries": entries,
    }
    try:
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        if final:
            print(f"\n✅ 已保存: {out_path}")
    except Exception as e:
        print(f"\n⚠️ 保存失败: {e}")


if __name__ == "__main__":
    scrape()
