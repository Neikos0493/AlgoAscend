"""Playwright 浏览器自动化辅助模块 - 用于绕过 WAF 获取题面"""
from __future__ import annotations

import re
import logging
from typing import Optional
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# 线程池（用于运行同步 Playwright）
_executor = ThreadPoolExecutor(max_workers=1)


def _extract_pre_text(pre_element) -> str:
    """从 pre 元素中提取文本，只保留 katex-html 显示层"""
    from bs4 import Tag
    
    def _get_display_text(element):
        """递归提取显示文本，跳过隐藏元素"""
        if isinstance(element, str):
            return element
        
        if not isinstance(element, Tag):
            return ''
        
        classes = element.get('class', [])
        
        # 跳过 katex-mathml（隐藏的数学公式源码）
        if 'katex-mathml' in classes:
            return ''
        
        # 跳过 annotation 标签（LaTeX 源码）
        if element.name == 'annotation':
            return ''
        
        # 跳过 math 标签但保留其内容
        if element.name == 'math':
            return ''
        
        # 递归处理子元素
        text_parts = []
        for child in element.children:
            text_parts.append(_get_display_text(child))
        
        return ''.join(text_parts)
    
    parts = []
    for child in pre_element.children:
        if isinstance(child, str):
            parts.append(child.strip())
        elif isinstance(child, Tag):
            if child.name == 'br':
                parts.append('\n')
            else:
                text = _get_display_text(child).strip()
                if text:
                    parts.append(text)
    
    result = ' '.join(parts)
    # 清理 LaTeX 残留
    result = re.sub(r'\\[a-zA-Z]+', '', result)
    result = re.sub(r'\s+', ' ', result).strip()
    
    return result


def parse_nowcoder_html(html: str) -> dict:
    """从 HTML 中解析牛客题目内容"""
    soup = BeautifulSoup(html, 'html.parser')
    result = {}
    
    # 主容器
    container = soup.select_one('.subject-describe')
    if not container:
        return result
    
    # 题目描述
    question = container.select_one('.subject-question')
    if question:
        result['description'] = question.get_text(' ', strip=True)
    
    # 遍历 h2 标签提取各部分
    for h2 in container.find_all('h2'):
        title = h2.get_text(strip=True)
        pre = h2.find_next_sibling('pre')
        
        if '输入描述' in title and pre:
            result['input_description'] = _extract_pre_text(pre)
        elif '输出描述' in title and pre:
            result['output_description'] = _extract_pre_text(pre)
        elif '数据范围' in title and pre:
            result['constraints'] = _extract_pre_text(pre)
        elif '提示' in title and pre:
            result['hints'] = _extract_pre_text(pre)
    
    # 提取样例
    samples = []
    for oi in container.select('.question-oi'):
        sample = {}
        # 只取显示层文本
        text = oi.get_text(' ', strip=True)
        
        # 解析输入和输出
        if '输入' in text and '输出' in text:
            parts = text.split('输出')
            if len(parts) >= 2:
                input_part = parts[0].split('输入')[-1].replace('复制', '').strip()
                output_part = parts[1].replace('复制', '').strip()
                
                sample['input'] = input_part
                sample['output'] = output_part
        
        if sample.get('input') or sample.get('output'):
            samples.append(sample)
    
    if samples:
        result['samples'] = samples
    
    return result
    
    # 提取样例
    samples = []
    full_text = soup.get_text('\n', strip=True)
    lines = full_text.split('\n')
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if ('示例' in line or '样例' in line) and any(c.isdigit() for c in line):
            sample = {'input': '', 'output': ''}
            
            j = i + 1
            in_input = False
            in_output = False
            
            while j < len(lines):
                curr = lines[j].strip()
                
                if '输入' in curr and 'Input' not in curr:
                    in_input = True
                    in_output = False
                    j += 1
                    continue
                elif '输出' in curr and 'Output' not in curr:
                    in_input = False
                    in_output = True
                    j += 1
                    continue
                elif '复制' in curr or '查看语言环境' in curr:
                    j += 1
                    continue
                
                if ('示例' in curr or '样例' in curr) and any(c.isdigit() for c in curr) and j > i + 2:
                    break
                
                if any(keyword in curr for keyword in ['自测运行', '保存并提交', '返回全部题目', '只看题目内容']):
                    break
                
                if in_input and curr:
                    sample['input'] += curr + '\n'
                elif in_output and curr:
                    sample['output'] += curr + '\n'
                
                j += 1
            
            sample['input'] = sample['input'].strip()
            sample['output'] = sample['output'].strip()
            
            if sample['input'] or sample['output']:
                samples.append(sample)
        i += 1
    
    if samples:
        result['samples'] = samples
    
    return result


def _fetch_sync(pid: str) -> Optional[dict]:
    """同步版 Playwright（在线程中运行）"""
    from playwright.sync_api import sync_playwright
    
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={"width": 1920, "height": 1080},
                locale="zh-CN",
            )
            
            page = context.new_page()
            url = f"https://ac.nowcoder.com/acm/problem/{pid}"
            logger.info(f"Playwright 访问: {url}")
            page.goto(url, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(2000)
            
            title = page.title()
            if '没有权限' in title or '404' in title:
                logger.warning(f"题目 {pid} 没有权限")
                context.close()
                browser.close()
                return None
            
            html = page.content()
            context.close()
            browser.close()
            
            detail = parse_nowcoder_html(html)
            if not detail.get('description'):
                logger.warning(f"题目 {pid} 解析失败")
                return None
            
            logger.info(f"成功获取题目 {pid}")
            return detail
    except Exception as e:
        logger.error(f"Playwright 失败: {e}")
        return None


async def fetch_nowcoder_with_playwright(pid: str) -> Optional[dict]:
    """在线程池中运行同步 Playwright"""
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _fetch_sync, pid)
