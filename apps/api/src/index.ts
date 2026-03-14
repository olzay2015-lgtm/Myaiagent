import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { skillsRoutes } from './modules/skills/skills.routes';
import { agentsRoutes } from './modules/agents/agents.routes';
import { toolsRoutes } from './modules/tools/tools.routes';
import { chatRoutes } from './modules/chat/chat.routes';
import { telegramWebhookRoutes } from './modules/telegram/telegram-webhook.routes';
import { telegramConfigRoutes } from './modules/telegram/telegram-config.routes';
import { initializeTools } from '@ai-agent-platform/tools-registry';
import { telegramService } from './providers/telegram/telegram.service';

dotenv.config();

// Initialize builtin tools
initializeTools();

// Initialize Telegram bot
if (process.env.TELEGRAM_BOT_TOKEN) {
  telegramService.initialize().catch(err => {
    console.error('Failed to initialize Telegram service:', err);
  });
}

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/skills', skillsRoutes);
app.use('/agents', agentsRoutes);
app.use('/tools', toolsRoutes);
app.use('/chat', chatRoutes);
app.use('/telegram/webhook', telegramWebhookRoutes);
app.use('/telegram', telegramConfigRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});
