"""测试牛客题面解析功能"""
import sys
sys.path.insert(0, '.')

from routes.scrape import _parse_nowcoder_detail

# 模拟一个简单的牛客题面 HTML
test_html = """
<div class="terminal-topic">
    <h1 class="subject-title">A+B Problem</h1>
    <div class="subject-des">
        <p>计算两个整数的和。</p>
        <pre>这是一段代码示例
int a, b;
cin >> a >> b;</pre>
    </div>
    <h2>输入描述</h2>
    <p>一行包含两个整数 a 和 b，用空格分隔。</p>
    <h2>输出描述</h2>
    <p>输出一个整数，表示 a + b 的结果。</p>
    <h2>样例输入</h2>
    <pre>1 2</pre>
    <h2>样例输出</h2>
    <pre>3</pre>
    <h2>数据范围</h2>
    <p>-1000 ≤ a, b ≤ 1000</p>
</div>
"""

result = _parse_nowcoder_detail(test_html)
print("解析结果:")
print(f"标题: {result.get('title', 'N/A')}")
print(f"描述: {result.get('description', 'N/A')[:100]}...")
print(f"输入描述: {result.get('input_description', 'N/A')}")
print(f"输出描述: {result.get('output_description', 'N/A')}")
print(f"样例数量: {len(result.get('samples', []))}")
if result.get('samples'):
    print(f"第一个样例输入: {result['samples'][0].get('input', 'N/A')}")
    print(f"第一个样例输出: {result['samples'][0].get('output', 'N/A')}")
print(f"数据范围: {result.get('constraints', 'N/A')}")
print("\n✅ 解析测试完成")
