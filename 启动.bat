@echo off
title AlgoAscend - C++ Algo Learning Platform
cd /d "%~dp0"

echo ============================================
echo   AlgoAscend - C++ Algo Learning Platform
echo ============================================
echo.

:: Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Install Python 3.10+ first.
    pause
    exit /b 1
)

:: Check frontend build
if not exist "frontend\dist\index.html" (
    echo [ERROR] Missing frontend\dist\
    echo        Run: cd frontend ^&^& npm run build
    pause
    exit /b 1
)

:: Start FastAPI
echo Starting server...
start "AlgoAscend" cmd /c "cd /d "%~dp0backend" && python main.py"

:: Wait for backend
echo Waiting for server...
timeout /t 3 /nobreak >nul

:: Open browser
start http://localhost:8000

echo.
echo ============================================
echo   Server ready!
echo   http://localhost:8000
echo ============================================
echo.
pause
