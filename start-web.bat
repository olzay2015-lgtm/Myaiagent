@echo off
chcp 65001 >nul
title AI Agent Platform
color 0A

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║       🤖 AI Agent Platform - Web Interface                 ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo Запуск сервера...
echo.

cd /d "%~dp0\apps\api"

if not exist "node_modules" (
    echo Установка зависимостей...
    "C:\Program Files\nodejs\npm.cmd" install
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  Сервер запущен!                                           ║
echo ║                                                            ║
echo ║  Откройте в браузере: http://localhost:4000/              ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

start http://localhost:4000/

"C:\Program Files\nodejs\node.exe" src\index.js

pause
