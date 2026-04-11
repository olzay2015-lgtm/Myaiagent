import { createTool } from '@ai-agent-platform/tools-registry';
import { ToolResult, ToolContext, ToolInput } from '@ai-agent-platform/tools-registry';
import { scheduler } from '../scheduler';
import { reminderManager } from '../reminders';

/**
 * Schedule Task Tool — создать задачу по расписанию
 */
async function scheduleTaskHandler(input: ToolInput, context: ToolContext): Promise<ToolResult> {
  const { name, description, schedule, actionType, actionPayload } = input;

  if (!name || !schedule) {
    return { success: false, error: 'Name and schedule are required' };
  }

  try {
    const task = await scheduler.addTask({
      agentId: context.agentId,
      userId: context.userId,
      name: name as string,
      description: description as string,
      schedule: schedule as string,
      action: {
        type: (actionType as any) || 'send_message',
        payload: (actionPayload as Record<string, unknown>) || {},
      },
      isActive: true,
    });

    return {
      success: true,
      data: {
        message: `Task "${name}" scheduled: ${schedule}`,
        taskId: task.id,
        nextRunAt: task.nextRunAt,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to schedule task',
    };
  }
}

export const scheduleTaskTool = createTool({
  id: 'scheduler-schedule-task',
  name: 'Schedule Task',
  slug: 'schedule_task',
  description: 'Schedule a recurring task for the agent. Supports: "every 5m", "every 2h", "daily 09:00", cron expressions. Use for periodic reports, checks, or automated actions.',
  category: 'EXTERNAL_API',
  icon: 'clock',
  isBuiltin: true,
  timeoutMs: 5000,
  requiresAuth: false,
  inputSchema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Task name' },
      description: { type: 'string', description: 'What the task does' },
      schedule: { type: 'string', description: 'Schedule: "every 5m", "every 2h", "daily 09:00", or cron expression' },
      actionType: { type: 'string', description: 'Action type: "send_message", "execute_tool", "webhook"' },
      actionPayload: { type: 'object', description: 'Action parameters (JSON)' },
    },
    required: ['name', 'schedule'],
  },
  handler: scheduleTaskHandler,
});

/**
 * List Tasks Tool
 */
async function listTasksHandler(input: ToolInput, context: ToolContext): Promise<ToolResult> {
  const tasks = scheduler.listTasks(context.agentId);
  return {
    success: true,
    data: {
      tasks: tasks.map(t => ({
        id: t.id,
        name: t.name,
        schedule: t.schedule,
        isActive: t.isActive,
        nextRunAt: t.nextRunAt,
        lastRunAt: t.lastRunAt,
        runCount: t.runCount,
      })),
      count: tasks.length,
    },
  };
}

export const listTasksTool = createTool({
  id: 'scheduler-list-tasks',
  name: 'List Scheduled Tasks',
  slug: 'list_scheduled_tasks',
  description: 'List all scheduled tasks for the current agent.',
  category: 'EXTERNAL_API',
  icon: 'list',
  isBuiltin: true,
  timeoutMs: 5000,
  requiresAuth: false,
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  handler: listTasksHandler,
});

/**
 * Set Reminder Tool
 */
async function setReminderHandler(input: ToolInput, context: ToolContext): Promise<ToolResult> {
  const { message, remindAt, schedule } = input;

  if (!message) {
    return { success: false, error: 'Message is required' };
  }

  try {
    let reminder;

    if (schedule) {
      // Recurring reminder
      reminder = await reminderManager.createRecurringReminder(
        context.agentId,
        context.userId,
        message as string,
        schedule as string,
      );
    } else if (remindAt) {
      // One-time reminder
      const remindDate = new Date(remindAt as string);
      if (isNaN(remindDate.getTime())) {
        return { success: false, error: 'Invalid date format for remindAt. Use ISO 8601: "2025-01-15T14:30:00"' };
      }
      reminder = await reminderManager.createReminder(
        context.agentId,
        context.userId,
        message as string,
        remindDate,
      );
    } else {
      return { success: false, error: 'Either remindAt (date) or schedule (recurring) is required' };
    }

    return {
      success: true,
      data: {
        message: `Reminder set: "${message}"`,
        reminderId: reminder.id,
        remindAt: reminder.remindAt,
        isRecurring: reminder.isRecurring,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to set reminder',
    };
  }
}

export const setReminderTool = createTool({
  id: 'scheduler-set-reminder',
  name: 'Set Reminder',
  slug: 'set_reminder',
  description: 'Set a reminder for the user. Can be one-time (with specific date/time) or recurring (with schedule like "daily 09:00", "every 2h").',
  category: 'EXTERNAL_API',
  icon: 'bell',
  isBuiltin: true,
  timeoutMs: 5000,
  requiresAuth: false,
  inputSchema: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'Reminder message text' },
      remindAt: { type: 'string', description: 'Date/time for one-time reminder (ISO 8601: "2025-01-15T14:30:00")' },
      schedule: { type: 'string', description: 'For recurring: "every 30m", "every 2h", "daily 09:00"' },
    },
    required: ['message'],
  },
  handler: setReminderHandler,
});

/**
 * List Reminders Tool
 */
async function listRemindersHandler(input: ToolInput, context: ToolContext): Promise<ToolResult> {
  const reminders = reminderManager.listReminders(context.userId);
  return {
    success: true,
    data: {
      reminders: reminders.map(r => ({
        id: r.id,
        message: r.message,
        remindAt: r.remindAt,
        isRecurring: r.isRecurring,
        schedule: r.schedule,
        isDelivered: r.isDelivered,
      })),
      count: reminders.length,
    },
  };
}

export const listRemindersTool = createTool({
  id: 'scheduler-list-reminders',
  name: 'List Reminders',
  slug: 'list_reminders',
  description: 'List all pending and delivered reminders for the current user.',
  category: 'EXTERNAL_API',
  icon: 'bell',
  isBuiltin: true,
  timeoutMs: 5000,
  requiresAuth: false,
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  handler: listRemindersHandler,
});

/**
 * Cancel Reminder Tool
 */
async function cancelReminderHandler(input: ToolInput, context: ToolContext): Promise<ToolResult> {
  const { reminderId } = input;
  if (!reminderId) {
    return { success: false, error: 'reminderId is required' };
  }

  const cancelled = await reminderManager.cancelReminder(reminderId as string);
  return {
    success: cancelled,
    data: cancelled
      ? { message: 'Reminder cancelled' }
      : undefined,
    error: cancelled ? undefined : 'Reminder not found',
  };
}

export const cancelReminderTool = createTool({
  id: 'scheduler-cancel-reminder',
  name: 'Cancel Reminder',
  slug: 'cancel_reminder',
  description: 'Cancel a previously set reminder by its ID.',
  category: 'EXTERNAL_API',
  icon: 'bell-off',
  isBuiltin: true,
  timeoutMs: 5000,
  requiresAuth: false,
  inputSchema: {
    type: 'object',
    properties: {
      reminderId: { type: 'string', description: 'The ID of the reminder to cancel' },
    },
    required: ['reminderId'],
  },
  handler: cancelReminderHandler,
});
