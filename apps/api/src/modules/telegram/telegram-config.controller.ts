import { Request, Response } from 'express';
import { prisma } from '@ai-agent-platform/database';
import { telegramService } from '../../providers/telegram/telegram.service';

export class TelegramConfigController {
  /**
   * List all Telegram configurations for the user
   */
  async listConfigs(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || 'temp-user-id';

      const agents = await prisma.agent.findMany({
        where: { ownerId: userId },
        include: {
          telegramConfig: true,
        },
      });

      const configs = agents.map(agent => ({
        agentId: agent.id,
        agentName: agent.name,
        isConnected: !!agent.telegramConfig,
        isActive: agent.telegramConfig?.isActive || false,
        botUsername: agent.telegramConfig?.botUsername || null,
        totalMessages: agent.telegramConfig?.totalMessages || 0,
      }));

      res.json({
        success: true,
        data: configs,
      });
    } catch (error) {
      console.error('[TelegramConfig] List error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list configs' },
      });
    }
  }

  /**
   * Get Telegram config for specific agent
   */
  async getConfig(req: Request, res: Response) {
    try {
      const { agentId } = req.params;
      const userId = (req as any).user?.id || 'temp-user-id';

      // Verify agent ownership
      const agent = await prisma.agent.findFirst({
        where: { id: agentId, ownerId: userId },
        include: { telegramConfig: true },
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found' },
        });
      }

      if (!agent.telegramConfig) {
        return res.status(404).json({
          success: false,
          error: { code: 'CONFIG_NOT_FOUND', message: 'Telegram config not found' },
        });
      }

      res.json({
        success: true,
        data: {
          agentId: agent.id,
          agentName: agent.name,
          config: {
            isActive: agent.telegramConfig.isActive,
            botUsername: agent.telegramConfig.botUsername,
            webhookUrl: agent.telegramConfig.webhookUrl,
            welcomeMessage: agent.telegramConfig.welcomeMessage,
            allowAllUsers: agent.telegramConfig.allowAllUsers,
            allowedUserIds: agent.telegramConfig.allowedUserIds,
            showTypingIndicator: agent.telegramConfig.showTypingIndicator,
            voiceEnabled: agent.telegramConfig.voiceEnabled,
            totalMessages: agent.telegramConfig.totalMessages,
          },
        },
      });
    } catch (error) {
      console.error('[TelegramConfig] Get error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get config' },
      });
    }
  }

  /**
   * Create or update Telegram config
   */
  async createOrUpdateConfig(req: Request, res: Response) {
    try {
      const { agentId } = req.params;
      const userId = (req as any).user?.id || 'temp-user-id';
      const {
        welcomeMessage,
        allowAllUsers,
        allowedUserIds,
        showTypingIndicator,
        voiceEnabled,
      } = req.body;

      // Verify agent ownership
      const agent = await prisma.agent.findFirst({
        where: { id: agentId, ownerId: userId },
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found' },
        });
      }

      // Get bot info
      const botInfo = await telegramService.getBotInfo();
      if (!botInfo) {
        return res.status(500).json({
          success: false,
          error: { code: 'BOT_ERROR', message: 'Telegram bot not configured' },
        });
      }

      // Use platform-wide bot token
      const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
      const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || '';

      // Create or update config
      const config = await prisma.telegramConfig.upsert({
        where: { agentId },
        update: {
          welcomeMessage,
          allowAllUsers: allowAllUsers ?? false,
          allowedUserIds: allowedUserIds || [],
          showTypingIndicator: showTypingIndicator ?? true,
          voiceEnabled: voiceEnabled ?? true,
          isActive: true,
        },
        create: {
          agentId,
          botToken, // Encrypted in real implementation
          botUsername: botInfo.username,
          webhookUrl,
          welcomeMessage,
          allowAllUsers: allowAllUsers ?? false,
          allowedUserIds: allowedUserIds || [],
          showTypingIndicator: showTypingIndicator ?? true,
          voiceEnabled: voiceEnabled ?? true,
          isActive: true,
        },
      });

      res.json({
        success: true,
        data: {
          agentId: agent.id,
          agentName: agent.name,
          config: {
            isActive: config.isActive,
            botUsername: config.botUsername,
            allowAllUsers: config.allowAllUsers,
            allowedUserIds: config.allowedUserIds,
          },
        },
      });
    } catch (error) {
      console.error('[TelegramConfig] Create/update error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to save config' },
      });
    }
  }

  /**
   * Delete Telegram config
   */
  async deleteConfig(req: Request, res: Response) {
    try {
      const { agentId } = req.params;
      const userId = (req as any).user?.id || 'temp-user-id';

      // Verify agent ownership
      const agent = await prisma.agent.findFirst({
        where: { id: agentId, ownerId: userId },
        include: { telegramConfig: true },
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found' },
        });
      }

      if (agent.telegramConfig) {
        await prisma.telegramConfig.delete({
          where: { agentId },
        });
      }

      res.json({
        success: true,
        data: { deleted: true },
      });
    } catch (error) {
      console.error('[TelegramConfig] Delete error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete config' },
      });
    }
  }

  /**
   * Test Telegram connection
   */
  async testConnection(req: Request, res: Response) {
    try {
      const { agentId } = req.params;
      const userId = (req as any).user?.id || 'temp-user-id';
      const { chatId } = req.body;

      // Verify agent ownership
      const agent = await prisma.agent.findFirst({
        where: { id: agentId, ownerId: userId },
        include: { telegramConfig: true },
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found' },
        });
      }

      if (!agent.telegramConfig) {
        return res.status(400).json({
          success: false,
          error: { code: 'CONFIG_NOT_FOUND', message: 'Telegram not configured' },
        });
      }

      if (!chatId) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'chatId is required' },
        });
      }

      // Send test message
      await telegramService.sendReply({
        chatId,
        text: `🤖 *Test Message*\n\n` +
              `This is a test from your agent: *${agent.name}*\n\n` +
              `Your Telegram integration is working correctly! ✅`,
        parseMode: 'Markdown',
      });

      res.json({
        success: true,
        data: { sent: true },
      });
    } catch (error: any) {
      console.error('[TelegramConfig] Test error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'SEND_ERROR', message: error.message },
      });
    }
  }

  /**
   * Toggle Telegram config enabled/disabled
   */
  async toggleConfig(req: Request, res: Response) {
    try {
      const { agentId } = req.params;
      const userId = (req as any).user?.id || 'temp-user-id';
      const { isActive } = req.body;

      // Verify agent ownership
      const agent = await prisma.agent.findFirst({
        where: { id: agentId, ownerId: userId },
        include: { telegramConfig: true },
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found' },
        });
      }

      if (!agent.telegramConfig) {
        return res.status(404).json({
          success: false,
          error: { code: 'CONFIG_NOT_FOUND', message: 'Telegram config not found' },
        });
      }

      const config = await prisma.telegramConfig.update({
        where: { agentId },
        data: { isActive },
      });

      res.json({
        success: true,
        data: {
          agentId,
          isActive: config.isActive,
        },
      });
    } catch (error) {
      console.error('[TelegramConfig] Toggle error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to toggle config' },
      });
    }
  }

  /**
   * Link Telegram user to platform account
   */
  async linkTelegramUser(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || 'temp-user-id';
      const { telegramUserId, platformUserId } = req.body;

      if (!telegramUserId) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'telegramUserId is required' },
        });
      }

      // Update or create mapping
      const mapping = await prisma.telegramUserMapping.upsert({
        where: { telegramUserId },
        update: {
          platformUserId: platformUserId || userId,
          lastInteractionAt: new Date(),
        },
        create: {
          telegramUserId,
          platformUserId: platformUserId || userId,
        },
      });

      res.json({
        success: true,
        data: {
          telegramUserId: mapping.telegramUserId,
          platformUserId: mapping.platformUserId,
          linked: true,
        },
      });
    } catch (error) {
      console.error('[TelegramConfig] Link error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to link user' },
      });
    }
  }

  /**
   * Get Telegram statistics
   */
  async getStats(req: Request) {
    try {
      const userId = (req as any).user?.id || 'temp-user-id';

      // Get user's agents with Telegram
      const agents = await prisma.agent.findMany({
        where: { ownerId: userId },
        include: {
          telegramConfig: true,
          _count: {
            select: { conversations: { where: { channel: 'TELEGRAM' } } },
          },
        },
      });

      const totalMessages = agents.reduce(
        (sum, agent) => sum + (agent.telegramConfig?.totalMessages || 0),
        0
      );

      const activeAgents = agents.filter(
        agent => agent.telegramConfig?.isActive
      ).length;

      res.json({
        success: true,
        data: {
          totalAgents: agents.length,
          activeAgents,
          totalMessages,
          agents: agents.map(agent => ({
            id: agent.id,
            name: agent.name,
            isActive: agent.telegramConfig?.isActive || false,
            totalMessages: agent.telegramConfig?.totalMessages || 0,
            conversationCount: agent._count.conversations,
          })),
        },
      });
    } catch (error) {
      console.error('[TelegramConfig] Stats error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get stats' },
      });
    }
  }
}
