import { Router } from 'express';
import { Request, Response } from 'express';
import { telegramService } from '../../providers/telegram/telegram.service';
import { prisma } from '@ai-agent-platform/database';

const router = Router();

/**
 * Telegram webhook endpoint
 * Receives updates from Telegram when messages are sent to the bot
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // Verify webhook secret if configured
    const secret = req.headers['x-telegram-bot-api-secret-token'];
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    
    if (expectedSecret && secret !== expectedSecret) {
      console.warn('[Telegram Webhook] Invalid secret token');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const update = req.body;

    console.log('[Telegram Webhook] Received update:', {
      update_id: update.update_id,
      message_id: update.message?.message_id,
      from: update.message?.from?.id,
    });

    // Process the update through the telegram service
    await telegramService.handleWebhookUpdate(update);

    // Always respond with 200 OK to Telegram
    // Otherwise, Telegram will retry sending the same update
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook] Error:', error);
    // Still return 200 to prevent Telegram from retrying
    res.status(200).json({ ok: true });
  }
});

/**
 * Get webhook info
 */
router.get('/webhook-info', async (req: Request, res: Response) => {
  try {
    const botInfo = await telegramService.getBotInfo();
    
    res.json({
      success: true,
      data: {
        botInfo,
        webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
        isConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
      },
    });
  } catch (error) {
    console.error('[Telegram Webhook] Get info error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get webhook info' },
    });
  }
});

/**
 * Setup webhook manually (for testing)
 */
router.post('/setup-webhook', async (req: Request, res: Response) => {
  try {
    await telegramService.initialize();
    
    res.json({
      success: true,
      data: { message: 'Webhook setup complete' },
    });
  } catch (error: any) {
    console.error('[Telegram Webhook] Setup error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SETUP_ERROR', message: error.message },
    });
  }
});

/**
 * Send test message (for testing)
 */
router.post('/send-test', async (req: Request, res: Response) => {
  try {
    const { chatId, text } = req.body;

    if (!chatId || !text) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'chatId and text are required' },
      });
    }

    await telegramService.sendReply({
      chatId,
      text,
      parseMode: 'Markdown',
    });

    res.json({
      success: true,
      data: { sent: true },
    });
  } catch (error: any) {
    console.error('[Telegram Webhook] Send test error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SEND_ERROR', message: error.message },
    });
  }
});

export { router as telegramWebhookRoutes };
