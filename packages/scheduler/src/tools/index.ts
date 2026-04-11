import { toolRegistry } from '@ai-agent-platform/tools-registry';
import {
  scheduleTaskTool,
  listTasksTool,
  setReminderTool,
  listRemindersTool,
  cancelReminderTool,
} from './scheduler-tools';

export {
  scheduleTaskTool,
  listTasksTool,
  setReminderTool,
  listRemindersTool,
  cancelReminderTool,
} from './scheduler-tools';

export const schedulerTools = [
  scheduleTaskTool,
  listTasksTool,
  setReminderTool,
  listRemindersTool,
  cancelReminderTool,
];

export function registerSchedulerTools(): void {
  for (const tool of schedulerTools) {
    toolRegistry.register(tool);
  }
  console.log(`✅ Registered ${schedulerTools.length} scheduler & reminder tools`);
}
