@echo off
chcp 65001 >nul
title AI Agent Platform - Server & Client
color 0A
cls

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║           🤖 AI Agent Platform Launcher                    ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

:: Stop existing processes
echo [1/4] Остановка предыдущих процессов...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

:: Navigate to project
cd /d "C:\Users\olzay\OneDrive\Рабочий стол\AI AGENT\ai-agent-platform\apps\api"

:: Check if Node.js is installed
echo [2/4] Проверка Node.js...
"C:\Program Files\nodejs\node.exe" --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Ошибка: Node.js не найден!
    echo Установите Node.js с https://nodejs.org
    pause
    exit /b 1
)

:: Start server in background
echo [3/4] Запуск сервера на порту 4000...
start "AI Agent Server" /min "C:\Program Files\nodejs\node.exe" server-http.js

:: Wait for server to start
echo [4/4] Ожидание запуска сервера...
timeout /t 3 /nobreak >nul

:: Test if server is running
curl -s http://localhost:4000/health >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Предупреждение: Сервер может быть недоступен
    echo Подождите несколько секунд и обновите страницу
) else (
    echo ✅ Сервер успешно запущен!
)

echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║  ✅ СЕРВЕР ЗАПУЩЕН!                                         ║
echo ║                                                            ║
echo ║  🌐 Web Interface: http://localhost:4000/                  ║
echo ║  📊 Health Check:  http://localhost:4000/health            ║
echo ║                                                            ║
echo ║  ⚠️  НЕ ЗАКРЫВАЙТЕ окно с названием "AI Agent Server"       ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

:: Open browser
echo Открытие браузера...
start http://localhost:4000/

echo.
echo Нажмите любую клавишу для выхода из этого окна...
echo (сервер продолжит работать в фоне)
pause >nul
