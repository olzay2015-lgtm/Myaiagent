# 🚀 AI Agent Platform - Команды запуска

## ⚡ Быстрый старт

### Windows (рекомендуется)

```batch
# Вариант 1: BAT файл (двойной клик)
start-all.bat

# Вариант 2: PowerShell
.\start-all.ps1

# Вариант 3: Command Prompt
cd ai-agent-platform\apps\api
"C:\Program Files\nodejs\node.exe" server-http.js
```

### Linux / Mac

```bash
# Сделать файл исполняемым и запустить
chmod +x start-all.sh
./start-all.sh

# Или просто
bash start-all.sh
```

## 📋 Доступные команды

### 🪟 Windows Commands

| Команда | Описание |
|---------|----------|
| `start-all.bat` | Автоматический запуск сервера и браузера |
| `start-all.ps1` | PowerShell версия с цветным выводом |
| `launch.bat` | Только запуск сервера |

### 🐧 Linux/Mac Commands

| Команда | Описание |
|---------|----------|
| `./start-all.sh` | Запуск сервера и браузера |
| `bash start-all.sh` | Альтернативный запуск |

### 🖥️ Ручной запуск

```bash
# Перейти в директорию API
cd ai-agent-platform/apps/api

# Запустить сервер
node server-http.js

# Или если Node.js не в PATH:
"C:\Program Files\nodejs\node.exe" server-http.js
```

## 🌐 После запуска

Откройте в браузере:
- **Web Interface:** http://localhost:4000/
- **Health Check:** http://localhost:4000/health
- **API Docs:** http://localhost:4000/agents

## 🛠️ Требования

- ✅ Node.js установлен
- ✅ Порт 4000 свободен
- ✅ Доступ к localhost

## 📝 Примеры использования

### Пример 1: Запуск через BAT (Windows)
```batch
# Открыть папку ai-agent-platform
# Двойной клик на start-all.bat
# Ждать открытия браузера
```

### Пример 2: PowerShell (Windows)
```powershell
# Открыть PowerShell
Set-Location C:\Users\olzay\OneDrive\Рабочий стол\AI AGENT\ai-agent-platform
.\start-all.ps1
```

### Пример 3: Terminal (Linux/Mac)
```bash
cd ~/ai-agent-platform
chmod +x start-all.sh
./start-all.sh
```

## 🔍 Проверка работы

После запуска проверьте:

```bash
# Windows Command Prompt
curl http://localhost:4000/health

# PowerShell
Invoke-RestMethod -Uri http://localhost:4000/health

# Linux/Mac
curl http://localhost:4000/health
```

Ожидаемый ответ:
```json
{"status":"ok","timestamp":"2026-02-21T..."}
```

## 🛑 Остановка сервера

### Windows
```batch
taskkill /f /im node.exe
```

### Linux/Mac
```bash
pkill -f "node.*server-http.js"
```

## 🐛 Устранение неполадок

### Проблема: "Порт 4000 занят"
**Решение:**
```batch
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :4000
kill -9 <PID>
```

### Проблема: "Node.js не найден"
**Решение:**
1. Установите Node.js: https://nodejs.org
2. Перезапустите терминал
3. Проверьте: `node --version`

### Проблема: "Сервер не отвечает"
**Решение:**
1. Проверьте что порт свободен
2. Проверьте брандмауэр
3. Попробуйте другой порт (измените в server-http.js)

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи сервера
2. Убедитесь что Node.js установлен
3. Проверьте что порт 4000 свободен

---

**Готово к использованию!** 🎉
