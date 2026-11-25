@echo off
chcp 65001 >nul
title Haru Photo Booth Kiosk Launcher
color 0b
cd /d "%~dp0"
node run.js
pause
