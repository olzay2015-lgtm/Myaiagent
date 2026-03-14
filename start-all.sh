#!/bin/bash

# AI Agent Platform - Start Script for Linux/Mac
# Запускает сервер и открывает браузер

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           🤖 AI Agent Platform Launcher                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

PORT=4000
PROJECT_PATH="$(pwd)/apps/api"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Step 1: Kill existing processes
echo -e "${YELLOW}[1/4] Остановка предыдущих процессов...${NC}"
pkill -f "node.*server-http.js" 2>/dev/null
sleep 2

# Step 2: Check Node.js
echo -e "${YELLOW}[2/4] Проверка Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Ошибка: Node.js не найден!${NC}"
    echo "Установите Node.js с https://nodejs.org"
    exit 1
fi

# Step 3: Start server
echo -e "${YELLOW}[3/4] Запуск сервера на порту $PORT...${NC}"
cd "$PROJECT_PATH" || exit 1
node server-http.js &
SERVER_PID=$!

# Step 4: Wait and verify
echo -e "${YELLOW}[4/4] Ожидание запуска сервера...${NC}"
sleep 3

if curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Сервер успешно запущен!${NC}"
else
    echo -e "${YELLOW}⚠️  Предупреждение: Сервер может быть недоступен${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ СЕРВЕР ЗАПУЩЕН!                                         ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║  🌐 Web Interface: http://localhost:$PORT/                  ║${NC}"
echo -e "${GREEN}║  📊 Health Check:  http://localhost:$PORT/health            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Open browser
echo -e "${CYAN}Открытие браузера...${NC}"
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:$PORT/"
elif command -v open &> /dev/null; then
    open "http://localhost:$PORT/"
else
    echo "Откройте http://localhost:$PORT/ вручную"
fi

echo ""
echo "Для остановки сервера выполните: kill $SERVER_PID"
echo ""
read -p "Нажмите Enter для выхода (сервер продолжит работать)"
