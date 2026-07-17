@echo off
chcp 65001 >nul
title AlgoAscend - C++算法学习平台
cd /d "%~dp0"

echo ============================================
echo   AlgoAscend C++算法学习平台
echo ============================================
echo.

:: 检查 Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 Python，请先安装 Python 3.10+
    pause
    exit /b 1
)

:: 检查前端构建产物
if not exist "frontend\dist\index.html" (
    echo [错误] 未找到前端构建产物 frontend\dist\
    echo       请先运行: cd frontend ^&^& npm run build
    pause
    exit /b 1
)

:: 启动 FastAPI（同时提供 API + 前端静态文件）
echo 启动服务...
start "AlgoAscend" cmd /c "cd /d "%~dp0backend" && python main.py"

:: 等后端就绪
echo 等待服务就绪...
timeout /t 3 /nobreak >nul

:: 打开浏览器
start http://localhost:8000

echo.
echo ============================================
echo   ✅ 启动完成！
echo.
echo   🌐 访问地址: http://localhost:8000
echo      （FastAPI 同时提供前端页面和后端API）
echo.
echo   关闭窗口即可停止服务
echo ============================================
echo.
pause
