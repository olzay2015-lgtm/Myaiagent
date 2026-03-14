# AI Agent Platform

Платформа для создания и управления AI агентами с интеграцией Telegram.

## Возможности

- **Множественные агенты** - Создавайте и управляйте несколькими AI агентами
- **Система навыков** - Модульные навыки для разного поведения агентов
- **Система инструментов** - Расширяемые инструменты для возможностей агентов
- **Веб-интерфейс** - Чат с агентами через браузер
- **Telegram бот** - Общение с агентами через Telegram
- **Планировщик задач** - Автоматические напоминания в указанное время

## Быстрый старт

### Запуск сервера

```cmd
cd ai-agent-platform\apps\api
node server-http.js
```

Сервер запустится на http://localhost:4001/

### Открытие веб-интерфейса

Перейдите в браузере на: **http://localhost:4001/**

### Подключение Telegram

1. Найдите бота **@Myaiagenteo_bot** в Telegram
2. Напишите ему /start
3. Начните общение с агентом

## Структура проекта

```
ai-agent-platform/
├── apps/
│   ├── api/                    # Node.js API сервер
│   │   ├── server-http.js      # Основной файл сервера
│   │   ├── public/
│   │   │   └── index.html      # Веб-интерфейс
│   │   ├── .env                # Конфигурация
│   │   └── src/                # Исходный код
│   ├── web/                    # Next.js фронтенд
│   └── websocket/              # WebSocket сервер
├── packages/
│   ├── database/               # Схема Prisma
│   ├── shared/                 # Общие типы
│   ├── skills-registry/        # Реестр навыков
│   └── tools-registry/        # Реестр инструментов
├── docker-compose.yml
└── package.json
```

## API Endpoints

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/health` | Проверка сервера |
| GET | `/agents` | Список агентов |
| POST | `/chat/:agentId` | Отправить сообщение |
| GET | `/schedule` | Список задач |
| POST | `/schedule` | Создать задачу |
| DELETE | `/schedule/:id` | Удалить задачу |
| GET | `/telegram/info` | Информация о боте |

## Конфигурация

Создайте файл `.env` в папке `apps/api/`:

```
TELEGRAM_BOT_TOKEN=8566357827:AAFPtP1EldQ6b1D8YIYKiZSIbJ7j-dxBJ8I
```

## Документация

Подробная документация: [README-LAUNCH.md](README-LAUNCH.md)

## Лицензия

MIT
