import { toolRegistry } from '../registry';
import { webSearchTool } from './web-search';
import { fileSystemTool } from './file-system';
import { telegramSenderTool } from './telegram-sender';

// Export individual tools
export { webSearchTool } from './web-search';
export { fileSystemTool } from './file-system';
export { telegramSenderTool } from './telegram-sender';

// Array of all builtin tools
export const builtinTools = [
  webSearchTool,
  fileSystemTool,
  telegramSenderTool,
];

/**
 * Register all builtin tools in the registry
 */
export function registerBuiltinTools(): void {
  for (const tool of builtinTools) {
    toolRegistry.register(tool);
  }
  console.log(`✅ Registered ${builtinTools.length} builtin tools`);
}

/**
 * Get all registered builtin tools
 */
export function getBuiltinTools() {
  return builtinTools;
}
