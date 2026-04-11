import { Router } from 'express';
import { PlatformModule, ModuleHealth } from '@ai-agent-platform/module-loader';
import { scheduler, Scheduler } from './scheduler';
import { reminderManager, ReminderManager } from './reminders';
import { registerSchedulerTools, schedulerTools } from './tools';

export { scheduler, Scheduler } from './scheduler';
export { reminderManager, ReminderManager } from './reminders';
export { registerSchedulerTools, schedulerTools } from './tools';

/**
 * Scheduler Module — задачи по расписанию + напоминания.
 */
export const schedulerModule: PlatformModule = {
  id: 'scheduler',
  name: 'Task Scheduler & Reminders',
  description: 'Schedule recurring agent tasks and user reminders',
  version: '0.1.0',

  async initialize(): Promise<void> {
    // Try to connect to database for persistence
    try {
      const { prisma } = require('@ai-agent-platform/database');
      scheduler.setPrisma(prisma);
      await scheduler.loadFromDatabase();
      console.log('  💾 Scheduler: Database persistence enabled');
    } catch (error) {
      console.warn('  ⚠️  Scheduler: No database — using in-memory only');
    }

    // Set default task handler (logs task execution)
    scheduler.onTaskRun(async (task) => {
      console.log(`⏰ Task executed: "${task.name}" (${task.id})`);
      return {
        taskId: task.id,
        success: true,
        executedAt: new Date(),
      };
    });

    // Start the scheduler
    scheduler.start();

    registerSchedulerTools();
  },

  getRouter(): Router {
    const router = Router();

    // GET /modules/scheduler/status
    router.get('/status', (_req, res) => {
      const taskStats = scheduler.getStats();
      const reminderStats = reminderManager.getStats();
      res.json({
        scheduler: taskStats,
        reminders: reminderStats,
        tools: schedulerTools.map(t => ({ id: t.id, name: t.name, slug: t.slug })),
      });
    });

    // GET /modules/scheduler/tasks?agentId=...
    router.get('/tasks', (req, res) => {
      const agentId = req.query.agentId as string;
      if (!agentId) {
        return res.status(400).json({ error: 'agentId is required' });
      }
      const tasks = scheduler.listTasks(agentId);
      res.json({ tasks, count: tasks.length });
    });

    // DELETE /modules/scheduler/tasks/:id
    router.delete('/tasks/:id', async (req, res) => {
      const deleted = await scheduler.removeTask(req.params.id);
      res.json({ success: deleted });
    });

    // GET /modules/scheduler/reminders?userId=...
    router.get('/reminders', (req, res) => {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      const reminders = reminderManager.listReminders(userId);
      res.json({ reminders, count: reminders.length });
    });

    return router;
  },

  async shutdown(): Promise<void> {
    scheduler.stop();
  },

  async healthCheck(): Promise<ModuleHealth> {
    const stats = scheduler.getStats();
    return {
      status: 'healthy',
      details: {
        ...stats,
        reminders: reminderManager.getStats(),
      },
    };
  },
};
