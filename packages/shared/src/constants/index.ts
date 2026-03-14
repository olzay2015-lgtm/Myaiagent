// Shared constants

export const APP_NAME = 'AI Agent Platform';
export const APP_VERSION = '1.0.0';

// LLM Models supported via OpenRouter
export const SUPPORTED_MODELS = [
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3-haiku',
  'google/gemini-pro',
  'meta-llama/llama-3.1-70b-instruct',
  'meta-llama/llama-3.1-8b-instruct',
] as const;

export const DEFAULT_MODEL = 'openai/gpt-4o-mini';

// Token limits
export const MAX_TOKENS_DEFAULT = 4096;
export const MAX_TOKENS_PREMIUM = 8192;

// Rate limits
export const RATE_LIMITS = {
  ANONYMOUS: { requests: 10, window: 60 }, // 10 requests per minute
  USER: { requests: 100, window: 60 }, // 100 requests per minute
  PREMIUM: { requests: 500, window: 60 }, // 500 requests per minute
} as const;

// Skill categories
export const SKILL_CATEGORIES = [
  'PERSONALITY',
  'DOMAIN_EXPERTISE',
  'TASK_SPECIFIC',
  'COMMUNICATION',
  'CUSTOM',
] as const;

// Tool categories
export const TOOL_CATEGORIES = [
  'COMMUNICATION',
  'DATA_ACCESS',
  'FILE_SYSTEM',
  'CODE_EXECUTION',
  'EXTERNAL_API',
  'CUSTOM',
] as const;

// Channels
export const CHANNELS = [
  'WEB',
  'TELEGRAM',
  'API',
  'VOICE',
  'WIDGET',
] as const;

// Error codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  SKILL_NOT_FOUND: 'SKILL_NOT_FOUND',
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
  CONVERSATION_NOT_FOUND: 'CONVERSATION_NOT_FOUND',
  LLM_ERROR: 'LLM_ERROR',
  TOOL_EXECUTION_ERROR: 'TOOL_EXECUTION_ERROR',
} as const;
