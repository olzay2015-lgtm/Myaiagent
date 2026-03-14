import { 
  ToolDefinition, 
  ToolCategory, 
  IToolRegistry,
  ToolHandler,
  ToolContext,
  ToolInput,
  ToolResult,
  ToolConfigSchema,
  ToolInputSchema
} from './interfaces';

class ToolRegistry implements IToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private slugIndex: Map<string, string> = new Map(); // slug -> id

  register(tool: ToolDefinition): void {
    this.tools.set(tool.id, tool);
    this.slugIndex.set(tool.slug, tool.id);
    console.log(`✅ Tool registered: ${tool.name} (${tool.slug})`);
  }

  unregister(toolId: string): void {
    const tool = this.tools.get(toolId);
    if (tool) {
      this.slugIndex.delete(tool.slug);
      this.tools.delete(toolId);
      console.log(`❌ Tool unregistered: ${tool.name}`);
    }
  }

  get(toolId: string): ToolDefinition | undefined {
    return this.tools.get(toolId);
  }

  getBySlug(slug: string): ToolDefinition | undefined {
    const id = this.slugIndex.get(slug);
    if (id) {
      return this.tools.get(id);
    }
    return undefined;
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getByCategory(category: ToolCategory): ToolDefinition[] {
    return this.getAll().filter(tool => tool.category === category);
  }

  getBuiltin(): ToolDefinition[] {
    return this.getAll().filter(tool => tool.isBuiltin);
  }

  // Convert tool definition to OpenAI function format for LLM
  toOpenAIFunction(tool: ToolDefinition): any {
    return {
      type: 'function',
      function: {
        name: tool.slug,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    };
  }

  // Get all tools as OpenAI functions for an agent
  getToolsForAgent(agentTools: { toolId: string; isEnabled: boolean }[]): any[] {
    const enabledToolIds = new Set(
      agentTools.filter(at => at.isEnabled).map(at => at.toolId)
    );

    return this.getAll()
      .filter(tool => enabledToolIds.has(tool.id))
      .map(tool => this.toOpenAIFunction(tool));
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();

// Export factory function for creating tools
export function createTool(config: {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: ToolCategory;
  handler: ToolHandler;
  configSchema?: ToolConfigSchema;
  inputSchema: ToolInputSchema;
  timeoutMs?: number;
  requiresAuth?: boolean;
  isBuiltin?: boolean;
  icon?: string;
}): ToolDefinition {
  return {
    ...config,
    configSchema: config.configSchema || {
      type: 'object',
      properties: {},
    },
    timeoutMs: config.timeoutMs || 30000,
    requiresAuth: config.requiresAuth || false,
    isBuiltin: config.isBuiltin ?? false,
    isPublic: config.isBuiltin ?? false,
    version: 1,
  };
}

// Re-export interfaces
export * from './interfaces';
