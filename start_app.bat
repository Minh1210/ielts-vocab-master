@echo off
title IELTS Vocab Master - Luyen Tu IELTS
cd /d "%~dp0"
echo ========================================================
echo   DANG KHOI DONG IELTS VOCAB MASTER (LUYEN TU)...
echo ========================================================
echo.
python app.py
if %ERRORLEVEL% NEQ 0 (
    echo Khong tim thay Python hoac loi server. Dang mo truc tiep file index.html...
    start index.html
)
pause
