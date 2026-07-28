@echo off
chcp 65001 >nul
title AlgoAscend - C++ Algo Learning Platform
cd /d "%~dp0"

echo ============================================
echo   AlgoAscend - C++ Algo Learning Platform
echo ============================================
echo.

:: Aggressive port cleanup — kill ALL Python processes to free 8000/8001
echo [1/3] Stopping old server...
taskkill /F /IM python.exe >nul 2>nul
taskkill /F /IM python3.exe >nul 2>nul
:: Also try PID-level kill for stubborn processes
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" 2^>nul') do (
    echo   Killing PID %%a on port 8000...
    taskkill /F /PID %%a >nul 2>nul
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8001" 2^>nul') do (
    echo   Killing PID %%a on port 8001...
    taskkill /F /PID %%a >nul 2>nul
)
timeout /t 2 /nobreak >nul

:: Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Install Python 3.10+ first.
    pause
    exit /b 1
)

:: Check frontend build / auto-build if missing
if not exist "frontend\dist\index.html" (
    echo [*] Building frontend...
    cd /d "%~dp0frontend"
    call npm run build
    if %errorlevel% neq 0 (
        echo [ERROR] Frontend build failed.
        pause
        exit /b 1
    )
    cd /d "%~dp0"
    echo [*] Build complete.
)

:: Determine Python (prefer venv, fallback to system)
set "PYTHON_EXEC=C:\Users\Tab_E\.workbuddy\binaries\python\envs\default\Scripts\python.exe"
if not exist "%PYTHON_EXEC%" (
    set "PYTHON_EXEC=python"
    echo [*] Using system Python
) else (
    echo [*] Using venv Python
)

:: Start FastAPI on port 8000
echo [2/3] Starting server on port 8000...
start "AlgoAscend-Backend" cmd /c "cd /d %~dp0backend && set PORT=8000 && %PYTHON_EXEC% main.py"

:: Wait for backend
echo [3/3] Waiting for server...
timeout /t 4 /nobreak >nul

:: Open browser
start http://localhost:8000

echo.
echo ============================================
echo   Server ready! http://localhost:8000
echo.
echo   TIP: If old UI appears, press Ctrl+F5
echo        to force refresh browser cache.
echo ============================================
echo.
pause
