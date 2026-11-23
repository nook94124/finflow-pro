@echo off
chcp 65001 >nul
echo ==========================================
echo กำลังเริ่มต้นระบบ THE FLOW SYSTEM...
echo ==========================================
echo.
echo กำลังติดตั้งระบบที่จำเป็น (อาจใช้เวลา 1-3 นาทีในครั้งแรก)...
call npm install
echo.
echo กำลังเปิดหน้า Dashboard...
start http://localhost:3000
call npm run dev
pause
