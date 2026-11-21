@echo off
title Install Windows Boot Autostart for Kiosk
color 0B

echo ========================================================
echo   INSTALL AUTOSTART ON WINDOWS BOOT FOR PHOTO BOOTH
echo ========================================================
echo.

set SCRIPT_DIR=%~dp0
set TARGET_BAT=%SCRIPT_DIR%start-all.bat
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_FOLDER%\HaruPhotoBoothKiosk.lnk

echo Creating startup shortcut in:
echo %STARTUP_FOLDER%
echo.

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET_BAT%'; $s.WorkingDirectory = '%SCRIPT_DIR%..'; $s.Description = 'Haru Moments Photo Booth Kiosk Startup'; $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo [SUCCESS] Autostart shortcut installed successfully!
    echo When this Windows PC boots, the Photo Booth will launch automatically.
) else (
    echo [ERROR] Failed to create shortcut.
)

echo.
pause
