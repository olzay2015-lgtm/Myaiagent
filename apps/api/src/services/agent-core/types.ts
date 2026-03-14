// Agent Core Types and Interfaces

export interface AgentConfig {
  id: string;
  name: string;
  description?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  maxToolIterations: number;
}

export interface AgentContext {
  agent: AgentConfig;
  systemPrompt: string;
  skills: SkillContext[];
  tools: ToolContext[];
  metadata: Record<string, unknown>;
}

export interface SkillContext {
  id: string;
  name: string;
  category: string;
  prompt: string;
  priority: number;
  variables?: Record<string, unknown>;
}

export interface ToolContext {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  config: Record<string, unknown>;
  inputSchema: Record<string, unknown>;
  enabled: boolean;
}

export interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  metadata?: {
    toolCalls?: ToolCall[];
    toolResults?: ToolResult[];
    tokensUsed?: number;
    latencyMs?: number;
    [key: string]: unknown;
  };
  timestamp: Date;
}

export interface ToolCall {
  id: string;
  toolSlug: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  toolSlug: string;
  success: boolean;
  data?: unknown;
  error?: string;
  executionTimeMs: number;
}

export interface Conversation {
  id: string;
  agentId: string;
  userId: string;
  messages: Message[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessOptions {
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
  metadata?: Record<string, unknown>;
}

export interface ProcessResult {
  message: Message;
  conversation: Conversation;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  iterations: number;
}

export interface StreamChunk {
  content: string;
  isComplete: boolean;
  toolCalls?: ToolCall[];
}

// Middleware types
export type MiddlewareFunction = (
  context: MiddlewareContext,
  next: () => Promise<void>
) => Promise<void>;

export interface MiddlewareContext {
  agentId: string;
  userId: string;
  conversationId: string;
  message: string;
  agentContext?: AgentContext;
  messages?: any[];
  result?: ProcessResult;
  error?: Error;
  metadata: Record<string, unknown>;
}

export enum MiddlewareHook {
  BEFORE_LOAD_CONTEXT = 'beforeLoadContext',
  AFTER_LOAD_CONTEXT = 'afterLoadContext',
  BEFORE_SEND_TO_LLM = 'beforeSendToLLM',
  AFTER_LLM_RESPONSE = 'afterLLMResponse',
  BEFORE_TOOL_EXECUTION = 'beforeToolExecution',
  AFTER_TOOL_EXECUTION = 'afterToolExecution',
  BEFORE_SAVE_MESSAGE = 'beforeSaveMessage',
  AFTER_PROCESS = 'afterProcess',
  ON_ERROR = 'onError',
}

// LLM Types
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export interface LLMOptions {
  model: string;
  messages: LLMMessage[];
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  tools?: any[];
  stream?: boolean;
}

export interface LLMResponse {
  id: string;
  content: string;
  role: string;
  model: string;
  toolCalls?: any[];
  finishReason: string | null;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
