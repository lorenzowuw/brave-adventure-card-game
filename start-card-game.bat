@echo off
chcp 65001 > nul
title Card Game Launcher
cd /d "%~dp0"

echo ========================================
echo   Card Game Launcher
echo ========================================
echo.
echo [*] Starting dev server...
start "Card Game Dev Server" cmd /k "npm run dev -- --host 127.0.0.1"

echo [*] Opening browser...
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:5173/"

echo.
echo Game URL: http://127.0.0.1:5173/
echo You can close this window.
pause
