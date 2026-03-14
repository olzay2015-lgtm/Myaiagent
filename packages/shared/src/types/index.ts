// Shared TypeScript types

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  avatar: string | null;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  systemPrompt: string | null;
  isActive: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  icon: string | null;
  color: string | null;
  prompt: string;
  variables: Record<string, unknown> | null;
  priority: number;
  isBuiltin: boolean;
  isPublic: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  creatorId: string | null;
}

export interface Tool {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  icon: string | null;
  configSchema: Record<string, unknown>;
  inputSchema: Record<string, unknown>;
  handlerModule: string;
  timeoutMs: number;
  requiresAuth: boolean;
  isBuiltin: boolean;
  isPublic: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  creatorId: string | null;
}

export interface Conversation {
  id: string;
  title: string | null;
  agentId: string;
  userId: string;
  channel: string;
  channelMetadata: Record<string, unknown> | null;
  status: string;
  messageCount: number;
  tokenCount: number;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'SYSTEM' | 'USER' | 'ASSISTANT' | 'TOOL';
  content: string;
  toolCalls: unknown[] | null;
  toolResults: unknown[] | null;
  audioUrl: string | null;
  audioDuration: number | null;
  transcript: string | null;
  metadata: Record<string, unknown> | null;
  tokensUsed: number | null;
  latencyMs: number | null;
  createdAt: Date;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// WebSocket events
export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface VoiceChunk {
  conversationId: string;
  chunk: ArrayBuffer;
  isFinal: boolean;
}
