import { z } from 'zod';

// User schemas
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  avatar: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  password: z.string().min(8),
});

// Agent schemas
export const agentSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  avatar: z.string().optional(),
  model: z.string().default('openai/gpt-4o-mini'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(8192).default(4096),
  topP: z.number().min(0).max(1).default(1.0),
  frequencyPenalty: z.number().min(-2).max(2).default(0.0),
  presencePenalty: z.number().min(-2).max(2).default(0.0),
  systemPrompt: z.string().optional(),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(false),
});

export const createAgentSchema = agentSchema.omit({ id: true });
export const updateAgentSchema = createAgentSchema.partial();

// Skill schemas
export const skillSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  slug: z.string(),
  description: z.string().max(500).optional(),
  category: z.enum(['PERSONALITY', 'DOMAIN_EXPERTISE', 'TASK_SPECIFIC', 'COMMUNICATION', 'CUSTOM']),
  icon: z.string().optional(),
  color: z.string().optional(),
  prompt: z.string().min(1),
  variables: z.record(z.any()).optional(),
  priority: z.number().default(0),
});

export const createSkillSchema = skillSchema.omit({ id: true, slug: true });

// Tool schemas
export const toolSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  slug: z.string(),
  description: z.string().max(500).optional(),
  category: z.enum(['COMMUNICATION', 'DATA_ACCESS', 'FILE_SYSTEM', 'CODE_EXECUTION', 'EXTERNAL_API', 'CUSTOM']),
  icon: z.string().optional(),
  configSchema: z.record(z.any()),
  inputSchema: z.record(z.any()),
  timeoutMs: z.number().default(30000),
  requiresAuth: z.boolean().default(false),
});

export const createToolSchema = toolSchema.omit({ id: true, slug: true });

// Conversation schemas
export const messageSchema = z.object({
  id: z.string(),
  role: z.enum(['SYSTEM', 'USER', 'ASSISTANT', 'TOOL']),
  content: z.string(),
  toolCalls: z.array(z.any()).optional(),
  toolResults: z.array(z.any()).optional(),
});

export const createMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

// API Key schema
export const apiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()),
  expiresAt: z.date().optional(),
});
