@echo off
cd /d "%~dp0"
start "AI Agent Server" cmd /c "node server.js"
timeout /t 3 /nobreak >nul
start http://localhost:4000/