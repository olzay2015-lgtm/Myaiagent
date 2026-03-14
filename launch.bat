@echo off
echo ========================================
echo  AI Agent Platform - Server Launcher
echo ========================================
echo.
echo Stopping any existing servers...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul
echo.
echo Starting server...
cd /d "C:\Users\olzay\OneDrive\Рабочий стол\AI AGENT\ai-agent-platform\apps\api"
echo.
"C:\Program Files\nodejs\node.exe" server-http.js
