/**
 * Module Init — инициализация всех модулей платформы.
 * Это единственная точка входа для подключения новых модулей.
 *
 * Принцип: «Добавляй — не меняй».
 * Чтобы добавить новый модуль:
 * 1. Создайте пакет в packages/ (или модуль в apps/api/src/modules/)
 * 2. Импортируйте и зарегистрируйте здесь через moduleRegistry.register()
 */

import { Express } from 'express';
import { moduleRegistry } from '@ai-agent-platform/module-loader';

/**
 * Register and initialize all platform modules.
 * Called once during application startup.
 */
export async function initializeModules(app: Express): Promise<void> {
  // ──────────────────────────────────────
  // Register modules (add new modules here)
  // ──────────────────────────────────────

  try {
    const { toolhouseModule } = require('@ai-agent-platform/toolhouse');
    moduleRegistry.register(toolhouseModule);
  } catch (e) {
    console.warn('⚠️  ToolHouse module not available:', (e as Error).message);
  }

  try {
    const { memoryModule } = require('@ai-agent-platform/memory');
    moduleRegistry.register(memoryModule);
  } catch (e) {
    console.warn('⚠️  Memory module not available:', (e as Error).message);
  }

  try {
    const { ragModule } = require('@ai-agent-platform/rag');
    moduleRegistry.register(ragModule);
  } catch (e) {
    console.warn('⚠️  RAG module not available:', (e as Error).message);
  }

  try {
    const { schedulerModule } = require('@ai-agent-platform/scheduler');
    moduleRegistry.register(schedulerModule);
  } catch (e) {
    console.warn('⚠️  Scheduler module not available:', (e as Error).message);
  }

  // ──────────────────────────────────────
  // Initialize all registered modules
  // ──────────────────────────────────────

  await moduleRegistry.initializeAll(app);

  // ──────────────────────────────────────
  // Module health endpoint
  // ──────────────────────────────────────

  app.get('/modules', async (_req, res) => {
    const modules = moduleRegistry.list();
    const health = await moduleRegistry.healthCheckAll();
    res.json({ modules, health });
  });
}
