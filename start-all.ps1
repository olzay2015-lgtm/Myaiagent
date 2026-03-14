# AI Agent Platform - Quick Start Script
# Запускает сервер и открывает браузер

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           🤖 AI Agent Platform Launcher                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Configuration
$PORT = 4000
$PROJECT_PATH = "C:\Users\olzay\OneDrive\Рабочий стол\AI AGENT\ai-agent-platform\apps\api"
$NODE_PATH = "C:\Program Files\nodejs\node.exe"

# Step 1: Kill existing processes
Write-Host "[1/4] Остановка предыдущих процессов..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Step 2: Check Node.js
Write-Host "[2/4] Проверка Node.js..." -ForegroundColor Yellow
if (-not (Test-Path $NODE_PATH)) {
    Write-Host "❌ Ошибка: Node.js не найден!" -ForegroundColor Red
    Write-Host "Установите Node.js с https://nodejs.org"
    Read-Host "Нажмите Enter для выхода"
    exit 1
}

# Step 3: Start server
Write-Host "[3/4] Запуск сервера на порту $PORT..." -ForegroundColor Yellow
$serverJob = Start-Job -ScriptBlock {
    param($path, $node)
    Set-Location $path
    & $node "server-http.js"
} -ArgumentList $PROJECT_PATH, $NODE_PATH

# Step 4: Wait and verify
Write-Host "[4/4] Ожидание запуска сервера..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

try {
    $response = Invoke-RestMethod -Uri "http://localhost:$PORT/health" -TimeoutSec 5
    Write-Host "✅ Сервер успешно запущен!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Предупреждение: Сервер может быть недоступен" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ СЕРВЕР ЗАПУЩЕН!                                         ║" -ForegroundColor Green
Write-Host "║                                                            ║" -ForegroundColor Green
Write-Host "║  🌐 Web Interface: http://localhost:$PORT/                  ║" -ForegroundColor Green
Write-Host "║  📊 Health Check:  http://localhost:$PORT/health            ║" -ForegroundColor Green
Write-Host "║                                                            ║" -ForegroundColor Green
Write-Host "║  ⚠️  Сервер работает в фоновом режиме                      ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

# Open browser
Write-Host "Открытие браузера..." -ForegroundColor Cyan
Start-Process "http://localhost:$PORT/"

Write-Host ""
Write-Host "Для остановки сервера выполните: Get-Job | Stop-Job" -ForegroundColor Yellow
Write-Host ""
Read-Host "Нажмите Enter для выхода (сервер продолжит работать)"

# Keep script running to maintain job
while ($true) {
    Start-Sleep -Seconds 1
}
