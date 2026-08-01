"""批量爬取牛客题目完整题面，更新本地题库"""
import asyncio
import json
import logging
import time
from pathlib import Path
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

CATALOG_PATH = Path(__file__).with_name("nowcoder_skills_result.json")
OUTPUT_PATH = Path(__file__).with_name("nowcoder_skills_result.json")  # 直接覆盖原文件


def parse_problem_html(html: str) -> dict:
    """从 HTML 中解析题目内容"""
    soup = BeautifulSoup(html, 'html.parser')
    result = {}
    
    # 题目描述
    desc = soup.select_one('.subject-describe, .subject-question')
    if desc:
        result['description'] = desc.get_text('\n', strip=True)
    
    # 查找所有 subject-item
    items = soup.select('.subject-item-wrap')
    for item in items:
        title_elem = item.select_one('.subject-item-title')
        if not title_elem:
            continue
        title = title_elem.get_text(strip=True)
        
        # 根据标题提取对应内容
        content = item.get_text('\n', strip=True)
        # 去掉标题部分
        content = content.replace(title, '', 1).strip()
        
        if '输入描述' in title or '输入格式' in title:
            result['input_description'] = content
        elif '输出描述' in title or '输出格式' in title:
            result['output_description'] = content
        elif '数据范围' in title or '约束' in title:
            result['constraints'] = content
        elif '提示' in title or 'Hint' in title:
            result['hints'] = content
    
    # 提取样例
    samples = []
    # 查找示例输入输出
    sample_blocks = soup.select('.subject-sample, .sample-block, [class*="sample"]')
    if not sample_blocks:
        # 尝试从文本中提取
        text = soup.get_text('\n', strip=True)
        lines = text.split('\n')
        current_sample = {}
        for i, line in enumerate(lines):
            if '示例' in line or '样例' in line or 'Example' in line:
                if '输入' in line or 'Input' in line:
                    # 下一行是输入
                    if i + 1 < len(lines):
                        current_sample['input'] = lines[i + 1]
                elif '输出' in line or 'Output' in line:
                    # 下一行是输出
                    if i + 1 < len(lines):
                        current_sample['output'] = lines[i + 1]
                        if current_sample.get('input'):
                            samples.append(current_sample)
                            current_sample = {}
    
    if samples:
        result['samples'] = samples
    
    return result


async def scrape_problem(page, pid: str) -> dict:
    """爬取单个题目"""
    url = f"https://ac.nowcoder.com/acm/problem/{pid}"
    try:
        await page.goto(url, wait_until='networkidle', timeout=30000)
        await page.wait_for_timeout(2000)
        
        html = await page.content()
        
        # 检查是否有权限
        title = await page.title()
        if '没有权限' in title or '404' in title:
            return None
        
        # 解析题目
        detail = parse_problem_html(html)
        if detail.get('description'):
            return detail
        
    except Exception as e:
        logger.error(f"爬取题目 {pid} 失败: {e}")
    
    return None


async def main():
    """主函数"""
    # 加载题库
    with open(CATALOG_PATH, 'r', encoding='utf-8') as f:
        catalog = json.load(f)
    
    problems = catalog['problems']
    logger.info(f"题库共有 {len(problems)} 道题目")
    
    # 统计需要爬取的题目（没有完整题面的）
    need_scrape = []
    for i, p in enumerate(problems):
        pid = p.get('id', '')
        if '-' in pid:
            num_id = pid.split('-')[-1]
            if not p.get('description'):
                need_scrape.append((i, num_id))
    
    logger.info(f"需要爬取 {len(need_scrape)} 道题目的完整题面")
    
    # 启动浏览器
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1920, 'height': 1080},
            locale='zh-CN',
        )
        page = await context.new_page()
        
        # 爬取题目
        success_count = 0
        fail_count = 0
        
        for i, (idx, num_id) in enumerate(need_scrape[:50]):  # 先测试50个
            logger.info(f"[{i+1}/{min(50, len(need_scrape))}] 爬取题目 {num_id}...")
            
            detail = await scrape_problem(page, num_id)
            if detail:
                # 更新题库
                problems[idx].update(detail)
                success_count += 1
                logger.info(f"  ✅ 成功: {detail.get('description', '')[:50]}...")
            else:
                fail_count += 1
                logger.info(f"  ❌ 失败")
            
            # 避免请求过快
            await asyncio.sleep(1)
        
        await context.close()
        await browser.close()
    
    # 保存更新后的题库
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
    
    logger.info(f"\n完成！成功: {success_count}, 失败: {fail_count}")
    logger.info(f"题库已更新到: {OUTPUT_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
