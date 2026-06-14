@echo off
chcp 65001 >nul
title 🥐 CROFFLE DEV — ทดสอบในโทรศัพท์
color 0E

echo.
echo  =============================================
echo   🥐  CROFFLE DEV — ทดสอบในโทรศัพท์
echo  =============================================
echo.
echo  กำลังหา IP Address ของเครื่อง...
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
    goto :found
)
:found
set IP=%IP: =%

echo  ✅ IP Address ของเครื่องนี้: %IP%
echo.
echo  ─────────────────────────────────────────────
echo.
echo  📱 วิธีเปิดในโทรศัพท์ (iPhone):
echo.
echo  1. ต่อ WiFi โทรศัพท์ให้เป็นเครือข่ายเดียวกับคอมนี้
echo  2. เปิด Safari ในโทรศัพท์
echo  3. พิมพ์ที่ช่อง URL:
echo.
echo      http://%IP%:8181/dev/Croffle.html
echo.
echo  ─────────────────────────────────────────────
echo.
echo  ⚠️  อย่าปิดหน้าต่างนี้ระหว่างใช้งาน
echo  ⚠️  กด Ctrl+C เพื่อหยุด Server
echo.

:: รัน server จาก root ของ Croffle folder
cd /d "%~dp0.."
npx serve -l 8181 .

pause
