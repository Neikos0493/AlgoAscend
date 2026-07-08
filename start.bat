@echo off
chcp 65001 >nul
title C++算法学习平台 - 多智能体AI辅助系统

echo ============================================
echo   C++算法学习平台 - 多智能体AI辅助系统
echo ============================================
echo.

:: 检查Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到Python，请先安装Python 3.10+
    pause
    exit /b 1
)

:: 检查Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [提示] 未找到Node.js，前端将无法启动
    echo [提示] 请从 https://nodejs.org 下载安装
    echo.
)

echo [1/2] 启动后端服务...
cd /d "%~dp0backend"
start "C++算法学习平台-后端" cmd /k "pip install -r requirements.txt && python main.py"

echo [2/2] 启动前端服务...
cd /d "%~dp0frontend"

if exist "node_modules" (
    start "C++算法学习平台-前端" cmd /k "npx vite --host 0.0.0.0"
) else (
    echo [提示] 首次运行需要安装前端依赖...
    call npm install
    start "C++算法学习平台-前端" cmd /k "npx vite --host 0.0.0.0"
)

echo.
echo ============================================
echo   启动完成!
echo   后端API: http://localhost:8000
echo   前端页面: http://localhost:5173
echo.
echo   请确保已设置环境变量:
echo     set LLM_API_KEY=your-api-key
echo     (默认使用DeepSeek API)
echo ============================================
echo.
pause
