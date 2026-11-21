@echo off
chcp 65001 >nul
title Haru Photo Booth Kiosk Launcher
color 0b

echo ========================================================================
echo   📸  HARU PHOTO BOOTH - KIOSK SYSTEM LAUNCHER
echo ========================================================================
echo.
echo   [1/3] กำลังเริ่มต้นระบบหลังบ้าน (Backend Server) พร้อมระบบสแกน 4G/5G...
cd /d "%~dp0backend"
start "Haru-Backend-API" /min cmd /c "npx tsx watch src/index.ts"

timeout /t 3 >nul

echo   [2/3] กำลังเริ่มต้นระบบหน้าจอสัมผัส (Frontend UI)...
cd /d "%~dp0frontend"
start "Haru-Frontend-Kiosk" /min cmd /c "npx vite --host 0.0.0.0 --port 5173"

timeout /t 3 >nul

echo   [3/3] กำลังเปิดหน้าต่างตู้ถ่ายรูปในเบราว์เซอร์...
start http://localhost:5173

echo.
echo ========================================================================
echo   🎉 ระบบเปิดพร้อมใช้งานสมบูรณ์ 100%!
echo   👉 หน้าจอ Kiosk กำลังทำงานที่: http://localhost:5173
echo   📱 ระบบสแกนเน็ตมือถือ 4G/5G ทำงานอัตโนมัติในเบื้องหลัง
echo.
echo   📌 คำแนะนำ: สามารถย่อหน้าต่างนี้ลงได้ (ห้ามปิดหน้าต่างจนกว่าจะเลิกใช้งานตู้)
echo ========================================================================
echo.
pause
