import { toolRegistry } from './registry';
import { toolExecutor } from './executor';
import { registerBuiltinTools } from './builtin';

// Re-export all interfaces
export * from './interfaces';

// Re-export registry
export { toolRegistry, createTool } from './registry';

// Re-export executor
export { toolExecutor, ToolExecutor } from './executor';

// Re-export builtin tools
export * from './builtin';

// Initialize builtin tools
export function initializeTools(): void {
  registerBuiltinTools();
}
