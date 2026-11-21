@echo off
title Haru PhotoBooth Fullscreen Kiosk Launcher

set KIOSK_URL=http://localhost:5173

:: Try Edge first (preinstalled on all modern Windows 10/11 PCs)
set EDGE_PATH="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not exist %EDGE_PATH% (
    set EDGE_PATH="C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

:: Try Chrome
set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_PATH% (
    set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

if exist %EDGE_PATH% (
    echo Launching Microsoft Edge in Touch Kiosk Mode...
    start "" %EDGE_PATH% --kiosk %KIOSK_URL% --edge-kiosk-type=fullscreen --no-first-run --disable-pinch --overscroll-history-navigation=0 --disable-features=Translate,TouchpadOverscrollHistoryNavigation --check-for-update-interval=604800
    exit /b 0
)

if exist %CHROME_PATH% (
    echo Launching Google Chrome in Touch Kiosk Mode...
    start "" %CHROME_PATH% --kiosk %KIOSK_URL% --no-first-run --disable-pinch --overscroll-history-navigation=0 --disable-translate --disable-features=TouchpadOverscrollHistoryNavigation
    exit /b 0
)

:: Fallback standard browser
echo Opening default web browser...
start %KIOSK_URL%
