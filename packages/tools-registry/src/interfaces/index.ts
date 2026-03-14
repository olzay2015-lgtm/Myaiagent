// Tool interface that all tools must implement
export interface ToolDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: 'COMMUNICATION' | 'DATA_ACCESS' | 'FILE_SYSTEM' | 'CODE_EXECUTION' | 'EXTERNAL_API' | 'CUSTOM';
  icon?: string;
  configSchema: JSONSchema;
  inputSchema: JSONSchema; // For function calling
  timeoutMs: number;
  requiresAuth: boolean;
  version: number;
  isBuiltin: boolean;
  handler: ToolHandler;
}

export interface JSONSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
}

export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: JSONSchemaProperty; // For array type
}

export interface ToolContext {
  agentId: string;
  userId: string;
  conversationId: string;
  config: Record<string, unknown>;
}

export interface ToolInput {
  [key: string]: unknown;
}

export interface ToolOutput {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

export type ToolHandler = (
  input: ToolInput,
  context: ToolContext
) => Promise<ToolOutput> | ToolOutput;

// Tool registry interface
export interface ToolRegistry {
  register(tool: ToolDefinition): void;
  unregister(toolId: string): void;
  get(toolId: string): ToolDefinition | undefined;
  getAll(): ToolDefinition[];
  getByCategory(category: string): ToolDefinition[];
  getBuiltin(): ToolDefinition[];
}

// Tool executor interface
export interface ToolExecutor {
  execute(toolId: string, input: ToolInput, context: ToolContext): Promise<ToolOutput>;
  validateInput(toolId: string, input: ToolInput): boolean;
}

// Sandbox interface for secure execution
export interface ToolSandbox {
  execute(tool: ToolDefinition, input: ToolInput, context: ToolContext): Promise<ToolOutput>;
}
