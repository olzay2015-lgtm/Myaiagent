// Tool execution context - passed to all tool handlers
export interface ToolContext {
  agentId: string;
  userId: string;
  conversationId: string;
  toolConfig: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Tool input from LLM function call
export interface ToolInput {
  [key: string]: unknown;
}

// Tool execution result
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    executionTimeMs?: number;
    tokensUsed?: number;
    [key: string]: unknown;
  };
}

// Tool handler function type
export type ToolHandler = (
  input: ToolInput,
  context: ToolContext
) => Promise<ToolResult> | ToolResult;

// JSON Schema for tool configuration (set by user when attaching tool to agent)
export interface ToolConfigSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
  description?: string;
}

// JSON Schema for tool inputs (used by LLM for function calling)
export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
  description?: string;
}

export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: JSONSchemaProperty; // For array type
  properties?: Record<string, JSONSchemaProperty>; // For object type
  default?: unknown;
}

// Tool definition
export interface ToolDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: ToolCategory;
  icon?: string;
  
  // Schemas
  configSchema: ToolConfigSchema; // For agent-specific configuration
  inputSchema: ToolInputSchema; // For LLM function calling
  
  // Execution settings
  handler: ToolHandler;
  timeoutMs: number;
  requiresAuth: boolean;
  
  // Visibility
  version: number;
  isBuiltin: boolean;
  isPublic: boolean;
  
  // Metadata
  creatorId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ToolCategory =
  | 'COMMUNICATION'    // Telegram, Email, Slack
  | 'DATA_ACCESS'      // Database, API, Search
  | 'FILE_SYSTEM'      // File operations
  | 'CODE_EXECUTION'   // Sandboxed code
  | 'EXTERNAL_API'     // Third-party APIs
  | 'CUSTOM';          // User-created

// Tool registry interface
export interface IToolRegistry {
  register(tool: ToolDefinition): void;
  unregister(toolId: string): void;
  get(toolId: string): ToolDefinition | undefined;
  getBySlug(slug: string): ToolDefinition | undefined;
  getAll(): ToolDefinition[];
  getByCategory(category: ToolCategory): ToolDefinition[];
  getBuiltin(): ToolDefinition[];
}

// Tool execution options
export interface ToolExecutionOptions {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

// Registered tool in database
export interface AgentToolConfig {
  toolId: string;
  isEnabled: boolean;
  config: Record<string, unknown>;
  allowedOperations?: string[];
}

// Tool call from LLM
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

// Tool call result for LLM
export interface ToolCallResult {
  tool_call_id: string;
  role: 'tool';
  name: string;
  content: string;
}
