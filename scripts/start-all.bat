@echo off
title Smart Photo Booth Kiosk Launcher
color 0A

echo =======================================================
echo     HARU MOMENTS - SMART PHOTO BOOTH KIOSK
echo =======================================================
echo.

set SCRIPT_DIR=%~dp0
set ROOT_DIR=%SCRIPT_DIR%..
cd /d "%ROOT_DIR%"

echo [1/3] Initializing Database & System Settings...
cd /d "%ROOT_DIR%\backend"
call npm.cmd run seed
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Database seeding failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Starting Backend Server (Port 5000)...
start "Haru PhotoBooth Backend" /min cmd /c "cd /d "%ROOT_DIR%\backend" && npm.cmd run dev"

timeout /t 3 /nobreak >nul

echo.
echo [3/3] Starting Touchscreen Frontend (Port 5173)...
start "Haru PhotoBooth Frontend" /min cmd /c "cd /d "%ROOT_DIR%\frontend" && npm.cmd run dev"

timeout /t 3 /nobreak >nul

echo.
echo =======================================================
echo     PHOTO BOOTH SYSTEM ONLINE!
echo =======================================================
echo Kiosk UI:       http://localhost:5173
echo Admin Portal:   http://localhost:5173 (Click Shield Icon top-right)
echo Backend API:    http://localhost:5000/api
echo.
echo Launching Kiosk Mode...
call "%SCRIPT_DIR%start-kiosk.bat"
