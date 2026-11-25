@echo off
chcp 65001 >nul
title อัปโหลดขึ้น GitHub - Haru Photo Booth
color 0b

echo ========================================================================
echo   🚀 กำลังอัปโหลดโค้ดโปรเจกต์ขึ้น GitHub
echo   👉 ปลายทาง: https://github.com/Slyffk/photooo
echo ========================================================================
echo.

cd /d "%~dp0"

echo กำลังเชื่อมต่อและ Push ไปยังสาขา main...
echo (หากมีหน้าต่าง GitHub เด้งขึ้นมา ให้กด 'Sign in with your browser' เพื่อยืนยันตัวตน)
echo.

git push -u origin main

echo.
if %errorlevel% neq 0 (
  echo ========================================================================
  echo ❌ การอัปโหลดไม่สำเร็จ อาจเกิดจาก:
  echo   1. ยังไม่ได้กดสร้าง Repository ชื่อ 'photooo' บน GitHub
  echo      (สร้างได้ที่: https://github.com/new ตั้งชื่อว่า photooo)
  echo   2. ยังไม่ได้ล็อกอินบัญชี GitHub ใน Git Credential Manager
  echo ========================================================================
) else (
  echo ========================================================================
  echo 🎉 อัปโหลดโปรเจกต์ขึ้น GitHub เรียบร้อยสมบูรณ์ 100%!
  echo 👉 เข้าดูโค้ดได้ที่: https://github.com/Slyffk/photooo
  echo ========================================================================
)

echo.
pause
