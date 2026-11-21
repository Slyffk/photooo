@echo off
chcp 65001 >nul
title Haru Moments - Cloudflare 4G/5G QR Tunnel
color 0A

echo ========================================================================
echo   HARU MOMENTS PHOTO BOOTH - 4G/5G QR CODE TUNNEL
echo ========================================================================
echo.
echo กำลังเริ่มต้นระบบ Cloudflare Tunnel...
echo.

cd /d "%~dp0"
node scripts\cloudTunnel.js

pause
