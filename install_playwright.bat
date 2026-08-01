@echo off
echo ========================================
echo 安装 Playwright 浏览器自动化工具
echo ========================================
echo.

echo [1/3] 安装 Playwright Python 包...
pip install playwright

echo.
echo [2/3] 安装 Chromium 浏览器...
playwright install chromium

echo.
echo [3/3] 验证安装...
python -c "from playwright.async_api import async_playwright; print('✓ Playwright 安装成功')"

echo.
echo ========================================
echo 安装完成！请重启后端服务。
echo ========================================
pause
