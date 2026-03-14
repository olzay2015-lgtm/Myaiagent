import { Request, Response } from 'express';
import { agentCore, MiddlewareHook, createLoggingMiddleware } from '../../services/agent-core';
import { z } from 'zod';

// Validation schema
const chatRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export class ChatController {
  constructor() {
    // Register example middleware
    this.registerMiddlewares();
  }

  private registerMiddlewares() {
    // Add logging middleware
    agentCore.use(MiddlewareHook.BEFORE_LOAD_CONTEXT, createLoggingMiddleware(console));
    
    // Add custom middleware example
    agentCore.use(MiddlewareHook.AFTER_PROCESS, async (context, next) => {
      console.log(`[Chat] Completed processing for agent ${context.agentId}`);
      console.log(`[Chat] Latency: ${context.result?.latencyMs}ms`);
      console.log(`[Chat] Tokens used: ${context.result?.usage.totalTokens}`);
      await next();
    });
  }

  async chat(req: Request, res: Response) {
    try {
      // Validate request
      const validation = chatRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: validation.error.errors,
          },
        });
      }

      const { agentId } = req.params;
      const userId = (req as any).user?.id || 'anonymous';
      const { message, conversationId, metadata } = validation.data;

      // Process message through AgentCore
      const result = await agentCore.process(agentId, userId, message, {
        metadata: {
          ...metadata,
          conversationId,
        },
      });

      // Return formatted response
      res.json({
        success: true,
        data: {
          message: {
            id: result.message.id,
            role: result.message.role,
            content: result.message.content,
            timestamp: result.message.timestamp,
          },
          conversationId: result.conversation.id,
          toolCalls: result.toolCalls?.map(tc => ({
            id: tc.id,
            toolSlug: tc.toolSlug,
            arguments: tc.arguments,
          })),
          toolResults: result.toolResults?.map(tr => ({
            toolCallId: tr.toolCallId,
            toolSlug: tr.toolSlug,
            success: tr.success,
            data: tr.data,
            error: tr.error,
            executionTimeMs: tr.executionTimeMs,
          })),
          usage: result.usage,
          latencyMs: result.latencyMs,
          iterations: result.iterations,
        },
      });

    } catch (error: any) {
      console.error('[ChatController] Error:', error);

      if (error.message?.includes('Agent not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'AGENT_NOT_FOUND',
            message: 'Agent not found',
          },
        });
      }

      if (error.message?.includes('Rate limit')) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded. Please try again later.',
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to process message',
        },
      });
    }
  }

  async stream(req: Request, res: Response) {
    try {
      const { agentId } = req.params;
      const userId = (req as any).user?.id || 'anonymous';
      const { message, conversationId, metadata } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Message is required',
          },
        });
      }

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Stream response
      const stream = agentCore.stream(agentId, userId, message, {
        metadata: {
          ...metadata,
          conversationId,
        },
      });

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

    } catch (error: any) {
      console.error('[ChatController] Stream error:', error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }

  async getConversation(req: Request, res: Response) {
    try {
      const { conversationId } = req.params;
      
      const conversation = await agentCore.getConversation(conversationId);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'CONVERSATION_NOT_FOUND',
            message: 'Conversation not found',
          },
        });
      }

      res.json({
        success: true,
        data: {
          id: conversation.id,
          agentId: conversation.agentId,
          messages: conversation.messages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            metadata: m.metadata,
            timestamp: m.timestamp,
          })),
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
      });

    } catch (error: any) {
      console.error('[ChatController] Get conversation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to get conversation',
        },
      });
    }
  }

  async deleteConversation(req: Request, res: Response) {
    try {
      const { conversationId } = req.params;
      
      await agentCore.deleteConversation(conversationId);

      res.json({
        success: true,
        data: { deleted: true },
      });

    } catch (error: any) {
      console.error('[ChatController] Delete conversation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message || 'Failed to delete conversation',
        },
      });
    }
  }
}
