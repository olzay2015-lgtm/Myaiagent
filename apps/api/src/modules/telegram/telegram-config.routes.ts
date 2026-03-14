import { Router } from 'express';
import { TelegramConfigController } from './telegram-config.controller';

const router = Router();
const controller = new TelegramConfigController();

// GET /api/telegram/config - Get current user's Telegram configurations
router.get('/config', controller.listConfigs.bind(controller));

// GET /api/telegram/config/:agentId - Get Telegram config for specific agent
router.get('/config/:agentId', controller.getConfig.bind(controller));

// POST /api/telegram/config/:agentId - Create/update Telegram config
router.post('/config/:agentId', controller.createOrUpdateConfig.bind(controller));

// DELETE /api/telegram/config/:agentId - Remove Telegram config
router.delete('/config/:agentId', controller.deleteConfig.bind(controller));

// POST /api/telegram/config/:agentId/test - Test Telegram connection
router.post('/config/:agentId/test', controller.testConnection.bind(controller));

// POST /api/telegram/config/:agentId/toggle - Enable/disable Telegram
router.post('/config/:agentId/toggle', controller.toggleConfig.bind(controller));

// POST /api/telegram/link - Link Telegram user to platform account
router.post('/link', controller.linkTelegramUser.bind(controller));

// GET /api/telegram/stats - Get Telegram usage statistics
router.get('/stats', controller.getStats.bind(controller));

export { router as telegramConfigRoutes };
