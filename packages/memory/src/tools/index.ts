import { toolRegistry } from '@ai-agent-platform/tools-registry';
import {
  contextMemorySaveTool,
  contextMemoryRecallTool,
  longtermMemorySaveTool,
  longtermMemoryRecallTool,
} from './memory-tools';

export {
  contextMemorySaveTool,
  contextMemoryRecallTool,
  longtermMemorySaveTool,
  longtermMemoryRecallTool,
} from './memory-tools';

export const memoryTools = [
  contextMemorySaveTool,
  contextMemoryRecallTool,
  longtermMemorySaveTool,
  longtermMemoryRecallTool,
];

/**
 * Register all memory tools in the tool registry
 */
export function registerMemoryTools(): void {
  for (const tool of memoryTools) {
    toolRegistry.register(tool);
  }
  console.log(`✅ Registered ${memoryTools.length} memory tools`);
}
