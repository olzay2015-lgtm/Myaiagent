/**
 * Reminders — напоминания пользователю.
 * Работает поверх Scheduler, но с упрощённым API.
 */

import { scheduler, ScheduledTask, TaskRunResult } from './scheduler';

export interface Reminder {
  id: string;
  agentId: string;
  userId: string;
  message: string;
  remindAt: Date;
  isRecurring: boolean;
  schedule?: string;  // For recurring: "daily 09:00", "every 2h"
  isDelivered: boolean;
  createdAt: Date;
}

/**
 * Reminder Manager — manages user reminders via scheduler
 */
export class ReminderManager {
  private reminders: Map<string, Reminder> = new Map();
  private deliveryCallback: ((reminder: Reminder) => Promise<void>) | null = null;

  /**
   * Set the callback that delivers the reminder message to the user
   */
  onDeliver(callback: (reminder: Reminder) => Promise<void>): void {
    this.deliveryCallback = callback;
  }

  /**
   * Create a one-time reminder
   */
  async createReminder(
    agentId: string,
    userId: string,
    message: string,
    remindAt: Date
  ): Promise<Reminder> {
    const schedule = `once ${remindAt.toISOString().substring(0, 10)} ${remindAt.toISOString().substring(11, 16)}`;

    const task = await scheduler.addTask({
      agentId,
      userId,
      name: `Reminder: ${message.substring(0, 50)}`,
      description: message,
      schedule,
      action: {
        type: 'send_message',
        payload: { message, type: 'reminder' },
      },
      isActive: true,
      maxRuns: 1,
    });

    const reminder: Reminder = {
      id: task.id,
      agentId,
      userId,
      message,
      remindAt,
      isRecurring: false,
      isDelivered: false,
      createdAt: new Date(),
    };

    this.reminders.set(task.id, reminder);
    return reminder;
  }

  /**
   * Create a recurring reminder
   */
  async createRecurringReminder(
    agentId: string,
    userId: string,
    message: string,
    schedule: string
  ): Promise<Reminder> {
    const task = await scheduler.addTask({
      agentId,
      userId,
      name: `Recurring: ${message.substring(0, 50)}`,
      description: message,
      schedule,
      action: {
        type: 'send_message',
        payload: { message, type: 'recurring_reminder' },
      },
      isActive: true,
    });

    const reminder: Reminder = {
      id: task.id,
      agentId,
      userId,
      message,
      remindAt: task.nextRunAt || new Date(),
      isRecurring: true,
      schedule,
      isDelivered: false,
      createdAt: new Date(),
    };

    this.reminders.set(task.id, reminder);
    return reminder;
  }

  /**
   * Cancel a reminder
   */
  async cancelReminder(reminderId: string): Promise<boolean> {
    const deleted = await scheduler.removeTask(reminderId);
    this.reminders.delete(reminderId);
    return deleted;
  }

  /**
   * List reminders for a user
   */
  listReminders(userId: string): Reminder[] {
    return Array.from(this.reminders.values())
      .filter(r => r.userId === userId)
      .sort((a, b) => a.remindAt.getTime() - b.remindAt.getTime());
  }

  /**
   * List reminders for an agent
   */
  listAgentReminders(agentId: string): Reminder[] {
    return Array.from(this.reminders.values())
      .filter(r => r.agentId === agentId)
      .sort((a, b) => a.remindAt.getTime() - b.remindAt.getTime());
  }

  getStats(): { total: number; pending: number; delivered: number } {
    const all = Array.from(this.reminders.values());
    return {
      total: all.length,
      pending: all.filter(r => !r.isDelivered).length,
      delivered: all.filter(r => r.isDelivered).length,
    };
  }
}

// Singleton
export const reminderManager = new ReminderManager();
