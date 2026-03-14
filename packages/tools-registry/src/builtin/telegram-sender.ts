import { createTool } from '../registry';
import { ToolResult, ToolContext, ToolInput } from '../interfaces';

/**
 * Telegram Sender Tool
 * Send messages via Telegram bot
 */
async function telegramSenderHandler(input: ToolInput, context: ToolContext): Promise<ToolResult> {
  const { chatId, message, parseMode = 'Markdown' } = input;

  if (!chatId || typeof chatId !== 'string') {
    return {
      success: false,
      error: 'Chat ID is required',
    };
  }

  if (!message || typeof message !== 'string') {
    return {
      success: false,
      error: 'Message is required',
    };
  }

  try {
    // Get bot token from config
    const botToken = context.toolConfig.botToken as string;
    
    if (!botToken) {
      return {
        success: false,
        error: 'Telegram bot token not configured',
      };
    }

    // TODO: Implement real Telegram API call
    // const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     chat_id: chatId,
    //     text: message,
    //     parse_mode: parseMode,
    //   }),
    // });
    
    // For now, return mock success
    console.log(`[Telegram] Would send to ${chatId}: ${message.substring(0, 100)}...`);

    return {
      success: true,
      data: {
        chatId,
        messageId: `mock-${Date.now()}`,
        sent: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Telegram send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send Telegram message',
    };
  }
}

export const telegramSenderTool = createTool({
  id: 'builtin-telegram-sender',
  name: 'Telegram Sender',
  slug: 'telegram_send',
  description: 'Send messages via Telegram. Use this to notify users, send updates, or communicate through Telegram.',
  category: 'COMMUNICATION',
  icon: 'send',
  isBuiltin: true,
  timeoutMs: 10000,
  requiresAuth: true,
  
  inputSchema: {
    type: 'object',
    description: 'Parameters for sending Telegram messages',
    properties: {
      chatId: {
        type: 'string',
        description: 'Telegram chat ID or username to send message to',
      },
      message: {
        type: 'string',
        description: 'Message text to send (supports Markdown)',
      },
      parseMode: {
        type: 'string',
        description: 'How to parse the message text',
        enum: ['Markdown', 'HTML', 'MarkdownV2'],
        default: 'Markdown',
      },
    },
    required: ['chatId', 'message'],
  },
  
  configSchema: {
    type: 'object',
    description: 'Configuration for Telegram sender',
    properties: {
      botToken: {
        type: 'string',
        description: 'Telegram bot token (from @BotFather)',
      },
      defaultChatId: {
        type: 'string',
        description: 'Default chat ID to send messages to',
      },
    },
    required: ['botToken'],
  },
  
  handler: telegramSenderHandler,
});
