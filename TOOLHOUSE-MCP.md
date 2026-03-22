# Toolhouse MCP Configuration

## Требования

- Python 3.10+
- UV (менеджер пакетов)

## Установка

```bash
# Установите uv если нет
pip install uv

# Клонируйте репозиторий
git clone https://github.com/toolhouseai/toolhouse-mcp

cd toolhouse-mcp
```

## Переменные окружения

Создайте файл `.env` в папке проекта:

```env
TOOLHOUSE_API_KEY=ваш_api_key
TOOLHOUSE_BUNDLE=название_бандла
```

## Запуск MCP сервера

```bash
uv run mcp_server_toolhouse
```

## Подключение к Claude Desktop

Добавьте в `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "toolhouse-mcp": {
      "command": "uvx",
      "args": ["mcp_server_toolhouse"],
      "env": {
        "TOOLHOUSE_API_KEY": "your_api_key",
        "TOOLHOUSE_BUNDLE": "your_bundle_name"
      }
    }
  }
}
```

## Доступные инструменты

- Web Scraping
- Memory (память)
- Send Email (отправка email)
- И другие на платформе Toolhouse

## Ссылки

- [Toolhouse](https://toolhouse.ai/)
- [MCP Documentation](https://modelcontextprotocol.io/introduction)