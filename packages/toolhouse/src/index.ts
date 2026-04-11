import { Router } from 'express';
import { PlatformModule, ModuleHealth } from '@ai-agent-platform/module-loader';
import { toolHouseClient } from './toolhouse-client';
import { registerToolHouseTools, toolhouseTools } from './tools';

export { toolHouseClient, ToolHouseClient, ToolHouseConfig } from './toolhouse-client';
export { registerToolHouseTools, toolhouseTools } from './tools';
export { toolhouseWebSearchTool } from './tools/web-search';
export { toolhouseReadUrlTool } from './tools/read-url';

/**
 * ToolHouse Module — веб-поиск и чтение документов.
 * Работает сразу без настройки (DuckDuckGo fallback).
 * С TOOLHOUSE_API_KEY — использует ToolHouse API.
 */
export const toolhouseModule: PlatformModule = {
  id: 'toolhouse',
  name: 'ToolHouse Integration',
  description: 'Web search and document reading via ToolHouse API with built-in fallbacks',
  version: '0.1.0',

  async initialize(): Promise<void> {
    registerToolHouseTools();

    if (toolHouseClient.isConfigured) {
      console.log('  🔑 ToolHouse API key detected — using ToolHouse backend');
    } else {
      console.log('  ℹ️  No TOOLHOUSE_API_KEY — using built-in search (DuckDuckGo)');
    }
  },

  getRouter(): Router {
    const router = Router();

    // GET /modules/toolhouse/status
    router.get('/status', (_req, res) => {
      res.json({
        toolhouseConfigured: toolHouseClient.isConfigured,
        availableTools: toolhouseTools.map(t => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          description: t.description,
        })),
      });
    });

    return router;
  },

  async healthCheck(): Promise<ModuleHealth> {
    return {
      status: 'healthy',
      message: toolHouseClient.isConfigured
        ? 'ToolHouse API configured'
        : 'Using built-in fallback (no API key)',
      details: {
        toolhouseConfigured: toolHouseClient.isConfigured,
        toolCount: toolhouseTools.length,
      },
    };
  },
};
