/**
 * Task Scheduler — запуск задач по расписанию (cron-like).
 * Реализация на чистом setTimeout/setInterval — без зависимостей.
 */

export interface ScheduledTask {
  id: string;
  agentId: string;
  userId: string;
  name: string;
  description?: string;
  
  /** Cron expression: "*/5 * * * *" или simple interval: "every 30m", "every 2h", "daily 09:00" */
  schedule: string;

  /** Action to execute */
  action: TaskAction;

  /** Is task active */
  isActive: boolean;

  /** Timestamps */
  nextRunAt: Date | null;
  lastRunAt: Date | null;
  createdAt: Date;

  /** Run count */
  runCount: number;
  maxRuns?: number;   // undefined = unlimited
}

export interface TaskAction {
  type: 'send_message' | 'execute_tool' | 'webhook';
  payload: Record<string, unknown>;
}

export interface TaskRunResult {
  taskId: string;
  success: boolean;
  result?: unknown;
  error?: string;
  executedAt: Date;
}

type TaskCallback = (task: ScheduledTask) => Promise<TaskRunResult>;

/**
 * Scheduler Engine — менеджер задач по расписанию.
 * Tick-based: проверяет задачи каждую минуту.
 */
export class Scheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private callback: TaskCallback | null = null;
  private prisma: any = null;
  private running: boolean = false;

  setPrisma(prismaClient: any): void {
    this.prisma = prismaClient;
  }

  /**
   * Set the callback that runs when a task fires
   */
  onTaskRun(callback: TaskCallback): void {
    this.callback = callback;
  }

  /**
   * Start the scheduler tick loop (every 60 seconds)
   */
  start(): void {
    if (this.running) return;
    this.running = true;

    this.tickInterval = setInterval(() => this.tick(), 60_000); // every minute
    console.log('⏰ Scheduler started (1-minute tick interval)');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.running = false;
    console.log('⏰ Scheduler stopped');
  }

  /**
   * Add a scheduled task
   */
  async addTask(task: Omit<ScheduledTask, 'id' | 'nextRunAt' | 'lastRunAt' | 'createdAt' | 'runCount'>): Promise<ScheduledTask> {
    const id = `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const fullTask: ScheduledTask = {
      ...task,
      id,
      nextRunAt: this.calculateNextRun(task.schedule),
      lastRunAt: null,
      createdAt: new Date(),
      runCount: 0,
    };

    this.tasks.set(id, fullTask);

    // Persist
    if (this.prisma) {
      try {
        await this.prisma.scheduledTask.create({
          data: {
            id,
            agentId: fullTask.agentId,
            userId: fullTask.userId,
            name: fullTask.name,
            description: fullTask.description,
            schedule: fullTask.schedule,
            actionJson: JSON.stringify(fullTask.action),
            isActive: fullTask.isActive,
            nextRunAt: fullTask.nextRunAt,
            maxRuns: fullTask.maxRuns,
          },
        });
      } catch (error) {
        console.warn('Scheduler: Failed to persist task:', error);
      }
    }

    return fullTask;
  }

  /**
   * Remove a task
   */
  async removeTask(taskId: string): Promise<boolean> {
    const deleted = this.tasks.delete(taskId);
    if (deleted && this.prisma) {
      try {
        await this.prisma.scheduledTask.delete({ where: { id: taskId } });
      } catch (error) {
        console.warn('Scheduler: Failed to delete task from DB:', error);
      }
    }
    return deleted;
  }

  /**
   * Toggle task active/inactive
   */
  toggleTask(taskId: string, isActive: boolean): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    task.isActive = isActive;
    if (isActive) {
      task.nextRunAt = this.calculateNextRun(task.schedule);
    }
    return true;
  }

  /**
   * List tasks for an agent
   */
  listTasks(agentId: string): ScheduledTask[] {
    return Array.from(this.tasks.values()).filter(t => t.agentId === agentId);
  }

  /**
   * List tasks for a user
   */
  listUserTasks(userId: string): ScheduledTask[] {
    return Array.from(this.tasks.values()).filter(t => t.userId === userId);
  }

  /**
   * Load tasks from database
   */
  async loadFromDatabase(): Promise<void> {
    if (!this.prisma) return;
    try {
      const tasks = await this.prisma.scheduledTask.findMany({
        where: { isActive: true },
      });
      for (const t of tasks) {
        if (!this.tasks.has(t.id)) {
          this.tasks.set(t.id, {
            id: t.id,
            agentId: t.agentId,
            userId: t.userId,
            name: t.name,
            description: t.description,
            schedule: t.schedule,
            action: JSON.parse(t.actionJson),
            isActive: t.isActive,
            nextRunAt: t.nextRunAt,
            lastRunAt: t.lastRunAt,
            createdAt: t.createdAt,
            runCount: t.runCount || 0,
            maxRuns: t.maxRuns,
          });
        }
      }
    } catch (error) {
      console.warn('Scheduler: Failed to load from DB:', error);
    }
  }

  /**
   * The main tick — runs every minute, checks for due tasks
   */
  private async tick(): Promise<void> {
    const now = new Date();

    for (const [id, task] of this.tasks) {
      if (!task.isActive) continue;
      if (!task.nextRunAt) continue;
      if (task.nextRunAt > now) continue;

      // Check max runs
      if (task.maxRuns && task.runCount >= task.maxRuns) {
        task.isActive = false;
        continue;
      }

      // Execute task
      if (this.callback) {
        try {
          await this.callback(task);
          task.runCount++;
          task.lastRunAt = now;
          task.nextRunAt = this.calculateNextRun(task.schedule);
        } catch (error) {
          console.error(`Scheduler: Task "${task.name}" failed:`, error);
        }
      }
    }
  }

  /**
   * Parse schedule string and calculate next run time.
   * Supports:
   * - "every 5m" → every 5 minutes
   * - "every 2h" → every 2 hours
   * - "daily 09:00" → every day at 09:00
   * - "daily 14:30" → every day at 14:30
   * - Cron expressions (basic: "0 9 * * *")
   */
  calculateNextRun(schedule: string): Date {
    const now = new Date();

    // "every Nm" — every N minutes
    const minuteMatch = schedule.match(/^every\s+(\d+)m$/i);
    if (minuteMatch) {
      const minutes = parseInt(minuteMatch[1], 10);
      return new Date(now.getTime() + minutes * 60 * 1000);
    }

    // "every Nh" — every N hours
    const hourMatch = schedule.match(/^every\s+(\d+)h$/i);
    if (hourMatch) {
      const hours = parseInt(hourMatch[1], 10);
      return new Date(now.getTime() + hours * 60 * 60 * 1000);
    }

    // "daily HH:MM"
    const dailyMatch = schedule.match(/^daily\s+(\d{1,2}):(\d{2})$/i);
    if (dailyMatch) {
      const hours = parseInt(dailyMatch[1], 10);
      const minutes = parseInt(dailyMatch[2], 10);
      const next = new Date(now);
      next.setHours(hours, minutes, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }

    // "once YYYY-MM-DD HH:MM" — one-time
    const onceMatch = schedule.match(/^once\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})$/i);
    if (onceMatch) {
      return new Date(`${onceMatch[1]}T${onceMatch[2]}:${onceMatch[3]}:00`);
    }

    // Basic cron: "M H * * *" (minute hour)
    const cronMatch = schedule.match(/^(\d+|\*)\s+(\d+|\*)\s+/);
    if (cronMatch) {
      const minute = cronMatch[1] === '*' ? now.getMinutes() : parseInt(cronMatch[1], 10);
      const hour = cronMatch[2] === '*' ? now.getHours() : parseInt(cronMatch[2], 10);
      const next = new Date(now);
      next.setHours(hour, minute, 0, 0);
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      return next;
    }

    // Default: 1 hour from now
    return new Date(now.getTime() + 60 * 60 * 1000);
  }

  getStats(): { totalTasks: number; activeTasks: number } {
    const all = Array.from(this.tasks.values());
    return {
      totalTasks: all.length,
      activeTasks: all.filter(t => t.isActive).length,
    };
  }
}

// Singleton
export const scheduler = new Scheduler();
