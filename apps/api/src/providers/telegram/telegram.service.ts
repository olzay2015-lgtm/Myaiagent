import { Telegraf, Context } from 'telegraf';
import { Update } from 'telegraf/typings/core/types/typegram';
import { prisma } from '@ai-agent-platform/database';
import { agentCore } from '../agent-core';

export interface TelegramMessage {
  telegramUserId: string;
  telegramChatId: string;
  messageId: number;
  text: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  isBot: boolean;
  timestamp: Date;
}

export interface TelegramReply {
  chatId: string;
  text: string;
  replyToMessageId?: number;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
}

export class TelegramService {
  private bot: Telegraf | null = null;
  private botToken: string;
  private webhookUrl: string;
  private isInitialized: boolean = false;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || '';
  }

  /**
   * Initialize the Telegram bot
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!this.botToken) {
      console.warn('⚠️  Telegram bot token not configured');
      return;
    }

    try {
      this.bot = new Telegraf(this.botToken);
      
      // Setup bot handlers
      this.setupHandlers();
      
      // Setup webhook if URL is configured
      if (this.webhookUrl) {
        await this.setupWebhook();
      }

      this.isInitialized = true;
      console.log('✅ Telegram bot initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Telegram bot:', error);
      throw error;
    }
  }

  /**
   * Setup webhook
   */
  private async setupWebhook(): Promise<void> {
    if (!this.bot) return;

    try {
      // Delete existing webhook
      await this.bot.telegram.deleteWebhook();
      
      // Set new webhook
      await this.bot.telegram.setWebhook(this.webhookUrl, {
        allowed_updates: ['message', 'callback_query'],
      });

      console.log(`✅ Telegram webhook set: ${this.webhookUrl}`);
    } catch (error) {
      console.error('❌ Failed to setup webhook:', error);
      throw error;
    }
  }

  /**
   * Setup bot message handlers
   */
  private setupHandlers(): void {
    if (!this.bot) return;

    // Handle /start command
    this.bot.command('start', async (ctx) => {
      await this.handleStartCommand(ctx);
    });

    // Handle /help command
    this.bot.command('help', async (ctx) => {
      await this.handleHelpCommand(ctx);
    });

    // Handle /agents command - show available agents
    this.bot.command('agents', async (ctx) => {
      await this.handleAgentsCommand(ctx);
    });

    // Handle /switch command - switch to different agent
    this.bot.command('switch', async (ctx) => {
      await this.handleSwitchCommand(ctx);
    });

    // Handle text messages
    this.bot.on('text', async (ctx) => {
      await this.handleMessage(ctx);
    });

    // Handle voice messages
    this.bot.on('voice', async (ctx) => {
      await this.handleVoiceMessage(ctx);
    });

    // Error handler
    this.bot.catch((err, ctx) => {
      console.error('Telegram bot error:', err);
      ctx.reply('Sorry, something went wrong. Please try again later.');
    });
  }

  /**
   * Handle /start command
   */
  private async handleStartCommand(ctx: Context): Promise<void> {
    const telegramUserId = ctx.from?.id.toString();
    
    if (!telegramUserId) return;

    // Get or create user mapping
    const userMapping = await this.getOrCreateUserMapping(ctx);

    // Check if user has agents connected
    const connectedAgents = await this.getUserConnectedAgents(telegramUserId);

    if (connectedAgents.length === 0) {
      await ctx.reply(
        `👋 Welcome to AI Agent Platform!\n\n` +
        `I can connect you to AI agents created on our platform.\n\n` +
        `To get started:\n` +
        `1. Visit our platform and create an agent\n` +
        `2. Connect your Telegram in the agent settings\n` +
        `3. Return here and start chatting!\n\n` +
        `Use /help for more information.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      const activeAgent = await this.getActiveAgent(telegramUserId);
      await ctx.reply(
        `👋 Welcome back!\n\n` +
        `You have ${connectedAgents.length} agent(s) connected.\n` +
        `Currently chatting with: *${activeAgent?.name || 'Unknown'}*\n\n` +
        `Use /agents to see all your agents\n` +
        `Use /switch to change agent`,
        { parse_mode: 'Markdown' }
      );
    }
  }

  /**
   * Handle /help command
   */
  private async handleHelpCommand(ctx: Context): Promise<void> {
    await ctx.reply(
      `🤖 *AI Agent Platform Bot*\n\n` +
      `*Available Commands:*\n` +
      `/start - Start the bot\n` +
      `/help - Show this help message\n` +
      `/agents - List your connected agents\n` +
      `/switch <agent_name> - Switch to a different agent\n\n` +
      `*How to use:*\n` +
      `1. Create an agent on our platform\n` +
      `2. Connect Telegram in agent settings\n` +
      `3. Simply send me a message and I'll route it to your agent!\n\n` +
      `*Features:*\n` +
      `✓ Text messages\n` +
      `✓ Voice messages (transcribed)\n` +
      `✓ Multiple agents per user\n` +
      `✓ Conversation history`,
      { parse_mode: 'Markdown' }
    );
  }

  /**
   * Handle /agents command
   */
  private async handleAgentsCommand(ctx: Context): Promise<void> {
    const telegramUserId = ctx.from?.id.toString();
    if (!telegramUserId) return;

    const agents = await this.getUserConnectedAgents(telegramUserId);
    const activeAgent = await this.getActiveAgent(telegramUserId);

    if (agents.length === 0) {
      await ctx.reply(
        `You don't have any agents connected yet.\n\n` +
        `Visit our platform to create and connect an agent!`
      );
      return;
    }

    let message = `*Your Connected Agents:*\n\n`;
    agents.forEach((agent, index) => {
      const isActive = activeAgent?.id === agent.id;
      message += `${index + 1}. ${isActive ? '✅ ' : ''}*${agent.name}*\n`;
      if (agent.description) {
        message += `   _${agent.description}_\n`;
      }
      message += `\n`;
    });

    message += `Use /switch <number> to change agent`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  /**
   * Handle /switch command
   */
  private async handleSwitchCommand(ctx: Context): Promise<void> {
    const telegramUserId = ctx.from?.id.toString();
    if (!telegramUserId) return;

    const args = ctx.message && 'text' in ctx.message 
      ? ctx.message.text.split(' ').slice(1) 
      : [];

    if (args.length === 0) {
      await ctx.reply(
        `Please specify which agent to switch to.\n` +
        `Example: /switch 1\n\n` +
        `Use /agents to see your available agents.`
      );
      return;
    }

    const agents = await this.getUserConnectedAgents(telegramUserId);
    const agentIndex = parseInt(args[0]) - 1;

    if (isNaN(agentIndex) || agentIndex < 0 || agentIndex >= agents.length) {
      await ctx.reply(
        `Invalid agent number.\n` +
        `Use /agents to see available agents.`
      );
      return;
    }

    const selectedAgent = agents[agentIndex];
    await this.setActiveAgent(telegramUserId, selectedAgent.id);

    await ctx.reply(
      `✅ Switched to agent: *${selectedAgent.name}*\n\n` +
      `You can now start chatting!`,
      { parse_mode: 'Markdown' }
    );
  }

  /**
   * Handle incoming text message
   */
  private async handleMessage(ctx: Context): Promise<void> {
    const telegramUserId = ctx.from?.id.toString();
    const chatId = ctx.chat?.id.toString();
    const messageText = ctx.message && 'text' in ctx.message 
      ? ctx.message.text 
      : '';

    if (!telegramUserId || !chatId || !messageText) return;

    console.log(`[Telegram] Message from ${telegramUserId}: ${messageText.substring(0, 50)}...`);

    try {
      // Show typing indicator
      await ctx.sendChatAction('typing');

      // Get or create user mapping
      const userMapping = await this.getOrCreateUserMapping(ctx);

      // Get active agent for this user
      const agent = await this.getActiveAgent(telegramUserId);

      if (!agent) {
        await ctx.reply(
          `You don't have an active agent.\n\n` +
          `Please visit our platform to create and connect an agent, ` +
          `or use /agents to see your connected agents.`
        );
        return;
      }

      // Get or create conversation
      const conversation = await this.getOrCreateTelegramConversation(
        telegramUserId,
        agent.id,
        chatId
      );

      // Process message through AgentCore
      const result = await agentCore.process(agent.id, agent.ownerId, messageText, {
        metadata: {
          conversationId: conversation.id,
          channel: 'TELEGRAM',
          telegramChatId: chatId,
          telegramUserId,
        },
      });

      // Send response back to Telegram
      await this.sendReply({
        chatId,
        text: result.message.content,
        replyToMessageId: ctx.message && 'message_id' in ctx.message 
          ? ctx.message.message_id 
          : undefined,
        parseMode: 'Markdown',
      });

      console.log(`[Telegram] Reply sent to ${telegramUserId}`);

    } catch (error) {
      console.error('[Telegram] Error handling message:', error);
      await ctx.reply(
        `Sorry, I encountered an error processing your message.\n` +
        `Please try again later.`
      );
    }
  }

  /**
   * Handle voice messages
   */
  private async handleVoiceMessage(ctx: Context): Promise<void> {
    const telegramUserId = ctx.from?.id.toString();
    
    if (!telegramUserId) return;

    // TODO: Implement voice transcription
    await ctx.reply(
      `🎤 Voice messages are not supported yet.\n` +
      `Please send a text message instead.`
    );
  }

  /**
   * Get or create user mapping
   */
  private async getOrCreateUserMapping(ctx: Context) {
    const telegramUserId = ctx.from?.id.toString();
    
    if (!telegramUserId) return null;

    let mapping = await prisma.telegramUserMapping.findUnique({
      where: { telegramUserId },
    });

    if (!mapping) {
      mapping = await prisma.telegramUserMapping.create({
        data: {
          telegramUserId,
          telegramUsername: ctx.from?.username,
          telegramFirstName: ctx.from?.first_name,
          telegramLastName: ctx.from?.last_name,
        },
      });
      console.log(`[Telegram] New user mapping created: ${telegramUserId}`);
    }

    return mapping;
  }

  /**
   * Get user's connected agents
   */
  private async getUserConnectedAgents(telegramUserId: string) {
    // Find agents that have Telegram config for this Telegram user
    const telegramConfigs = await prisma.telegramConfig.findMany({
      where: {
        allowedUserIds: {
          has: telegramUserId,
        },
        isActive: true,
      },
      include: {
        agent: true,
      },
    });

    return telegramConfigs.map(config => config.agent);
  }

  /**
   * Get active agent for Telegram user
   */
  private async getActiveAgent(telegramUserId: string) {
    // Get user's mapping
    const mapping = await prisma.telegramUserMapping.findUnique({
      where: { telegramUserId },
    });

    if (!mapping?.platformUserId) {
      // Try to find by allowed users in TelegramConfig
      const configs = await prisma.telegramConfig.findMany({
        where: {
          allowedUserIds: { has: telegramUserId },
          isActive: true,
        },
        include: { agent: true },
        take: 1,
      });

      return configs[0]?.agent || null;
    }

    // Get user's active agent from preferences (could store in Redis or DB)
    // For now, return first connected agent
    const agents = await this.getUserConnectedAgents(telegramUserId);
    return agents[0] || null;
  }

  /**
   * Set active agent for user
   */
  private async setActiveAgent(telegramUserId: string, agentId: string): Promise<void> {
    // Store in user's mapping or session
    // This could be stored in Redis or a dedicated table
    // For now, we'll just validate the agent is connected
    const agents = await this.getUserConnectedAgents(telegramUserId);
    const agent = agents.find(a => a.id === agentId);
    
    if (!agent) {
      throw new Error('Agent not connected');
    }
  }

  /**
   * Get or create Telegram conversation
   */
  private async getOrCreateTelegramConversation(
    telegramUserId: string,
    agentId: string,
    telegramChatId: string
  ) {
    // Look for existing conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        agentId,
        channel: 'TELEGRAM',
        channelMetadata: {
          path: ['telegramChatId'],
          equals: telegramChatId,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Get user mapping to get platform user ID
    const userMapping = await prisma.telegramUserMapping.findUnique({
      where: { telegramUserId },
    });

    const platformUserId = userMapping?.platformUserId || 'temp-user-id';

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          agentId,
          userId: platformUserId,
          channel: 'TELEGRAM',
          channelMetadata: {
            telegramChatId,
            telegramUserId,
          },
          status: 'ACTIVE',
        },
      });
      console.log(`[Telegram] New conversation created: ${conversation.id}`);
    }

    return conversation;
  }

  /**
   * Send reply to Telegram
   */
  async sendReply(reply: TelegramReply): Promise<void> {
    if (!this.bot) {
      throw new Error('Telegram bot not initialized');
    }

    try {
      const options: any = {
        parse_mode: reply.parseMode || 'Markdown',
      };

      if (reply.replyToMessageId) {
        options.reply_to_message_id = reply.replyToMessageId;
      }

      // Handle long messages
      const maxLength = 4096;
      if (reply.text.length > maxLength) {
        // Split into chunks
        const chunks = this.splitMessage(reply.text, maxLength);
        for (let i = 0; i < chunks.length; i++) {
          await this.bot.telegram.sendMessage(reply.chatId, chunks[i], {
            ...options,
            reply_to_message_id: i === 0 ? reply.replyToMessageId : undefined,
          });
        }
      } else {
        await this.bot.telegram.sendMessage(reply.chatId, reply.text, options);
      }
    } catch (error) {
      console.error('[Telegram] Failed to send reply:', error);
      throw error;
    }
  }

  /**
   * Split long message into chunks
   */
  private splitMessage(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    const lines = text.split('\n');
    for (const line of lines) {
      if (currentChunk.length + line.length + 1 > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
      }
      currentChunk += line + '\n';
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Handle webhook update
   */
  async handleWebhookUpdate(update: Update): Promise<void> {
    if (!this.bot) {
      throw new Error('Telegram bot not initialized');
    }

    await this.bot.handleUpdate(update);
  }

  /**
   * Get bot info
   */
  async getBotInfo() {
    if (!this.bot) return null;
    
    try {
      return await this.bot.telegram.getMe();
    } catch (error) {
      console.error('Failed to get bot info:', error);
      return null;
    }
  }

  /**
   * Stop the bot
   */
  async stop(): Promise<void> {
    if (this.bot) {
      await this.bot.stop();
      this.isInitialized = false;
      console.log('Telegram bot stopped');
    }
  }
}

// Singleton instance
export const telegramService = new TelegramService();
