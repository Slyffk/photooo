@echo off
chcp 65001 >nul
title Haru Moments - Cloudflare 4G/5G QR Tunnel
color 0A

cd /d "%~dp0\.."
node scripts\cloudTunnel.js

pause
