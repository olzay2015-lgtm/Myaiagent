@echo off
echo Starting AI Agent Platform API Server...
cd /d "%~dp0"
"C:\Program Files\nodejs\node.exe" apps\api\src\index.js
pause
