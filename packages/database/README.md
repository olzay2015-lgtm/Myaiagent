# Database Package

Prisma ORM configuration and database client.

## Setup

```bash
npm install
npx prisma generate
```

## Commands

- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run migrations in development
- `npm run db:migrate:prod` - Run migrations in production
- `npm run db:seed` - Seed the database
- `npm run db:studio` - Open Prisma Studio

## Usage

```typescript
import { prisma } from '@ai-agent-platform/database';

const users = await prisma.user.findMany();
```
