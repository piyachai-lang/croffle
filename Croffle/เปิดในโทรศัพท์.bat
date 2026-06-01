@echo off
chcp 65001 >nul
title 🥐 CROFFLE — เปิดในโทรศัพท์
color 0E

echo.
echo  =============================================
echo   🥐  CROFFLE Dashboard — เปิดในโทรศัพท์
echo  =============================================
echo.
echo  กำลังหา IP Address ของเครื่อง...
echo.

:: หา IP ของเครื่อง
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
echo  📱 วิธีเปิดในโทรศัพท์:
echo.
echo  1. ต่อ WiFi โทรศัพท์ให้เป็นเครือข่ายเดียวกับคอมนี้
echo  2. เปิด Browser ในโทรศัพท์ (Chrome / Safari)
echo  3. พิมพ์ที่ช่อง URL:
echo.
echo      http://%IP%:8080/Croffle_Dashboard.html
echo.
echo  ─────────────────────────────────────────────
echo.
echo  ⚠️  อย่าปิดหน้าต่างนี้ระหว่างใช้งาน
echo  ⚠️  กด Ctrl+C เพื่อหยุด Server
echo.

:: เริ่ม Python HTTP Server ใน folder นี้
cd /d "%~dp0"
python -m http.server 8080

pause
