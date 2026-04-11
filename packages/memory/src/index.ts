import { Router } from 'express';
import { PlatformModule, ModuleHealth } from '@ai-agent-platform/module-loader';
import { contextMemory, ContextMemory } from './context-memory';
import { longTermMemory, LongTermMemory } from './longterm-memory';
import { registerMemoryTools, memoryTools } from './tools';

export { contextMemory, ContextMemory } from './context-memory';
export { longTermMemory, LongTermMemory } from './longterm-memory';
export { registerMemoryTools, memoryTools } from './tools';

/**
 * Memory Module — контекстная и долгосрочная память агента.
 */
export const memoryModule: PlatformModule = {
  id: 'memory',
  name: 'Agent Memory',
  description: 'Context memory (per conversation) and long-term memory (persistent across conversations)',
  version: '0.1.0',

  async initialize(): Promise<void> {
    // Try to initialize long-term memory with Prisma
    try {
      const { prisma } = require('@ai-agent-platform/database');
      longTermMemory.setPrisma(prisma);
      console.log('  💾 Long-term memory: PostgreSQL connected');
    } catch (error) {
      console.warn('  ⚠️  Long-term memory: Database not available (context memory still works)');
    }

    registerMemoryTools();
  },

  getRouter(): Router {
    const router = Router();

    // GET /modules/memory/status
    router.get('/status', (_req, res) => {
      const stats = contextMemory.getStats();
      res.json({
        contextMemory: stats,
        tools: memoryTools.map(t => ({ id: t.id, name: t.name, slug: t.slug })),
      });
    });

    // GET /modules/memory/context/:conversationId
    router.get('/context/:conversationId', (req, res) => {
      const entries = contextMemory.getAll(req.params.conversationId);
      res.json({ conversationId: req.params.conversationId, entries, count: entries.length });
    });

    // DELETE /modules/memory/context/:conversationId
    router.delete('/context/:conversationId', (req, res) => {
      contextMemory.clear(req.params.conversationId);
      res.json({ success: true, message: 'Context memory cleared' });
    });

    return router;
  },

  async healthCheck(): Promise<ModuleHealth> {
    const stats = contextMemory.getStats();
    return {
      status: 'healthy',
      details: {
        contextMemory: stats,
        longtermAvailable: !!longTermMemory['prisma'],
      },
    };
  },
};
