import { toolRegistry } from '@ai-agent-platform/tools-registry';
import { toolhouseWebSearchTool } from './web-search';
import { toolhouseReadUrlTool } from './read-url';

export { toolhouseWebSearchTool } from './web-search';
export { toolhouseReadUrlTool } from './read-url';

export const toolhouseTools = [
  toolhouseWebSearchTool,
  toolhouseReadUrlTool,
];

/**
 * Register all ToolHouse tools in the tool registry
 */
export function registerToolHouseTools(): void {
  for (const tool of toolhouseTools) {
    toolRegistry.register(tool);
  }
  console.log(`✅ Registered ${toolhouseTools.length} ToolHouse tools`);
}
