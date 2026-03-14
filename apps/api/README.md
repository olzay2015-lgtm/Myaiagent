# API Server

Node.js/Express API server for the AI Agent Platform.

## Getting Started

```bash
npm install
npm run dev
```

The server will start on port 4000 (or PORT env variable).

## Structure

- `src/modules/` - Domain modules (auth, agents, skills, tools, chat)
- `src/services/` - Business logic services
- `src/providers/` - External integrations (OpenRouter, Telegram, etc.)
- `src/infrastructure/` - Database, Redis, queue setup
- `src/shared/` - Utilities and middleware

## API Endpoints

- `GET /health` - Health check
- Additional routes will be added in respective modules
