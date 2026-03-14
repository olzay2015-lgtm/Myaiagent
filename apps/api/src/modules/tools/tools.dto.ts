import { ToolCategory } from '@prisma/client';

export interface CreateToolDto {
  name: string;
  description?: string;
  category: ToolCategory;
  configSchema: Record<string, unknown>;
  inputSchema: Record<string, unknown>;
  handlerModule?: string;
  icon?: string;
  timeoutMs?: number;
  requiresAuth?: boolean;
}

export interface UpdateToolDto {
  name?: string;
  description?: string;
  category?: ToolCategory;
  configSchema?: Record<string, unknown>;
  inputSchema?: Record<string, unknown>;
  icon?: string;
  timeoutMs?: number;
}

export interface ExecuteToolDto {
  toolId?: string;
  toolSlug?: string;
  input: Record<string, unknown>;
  config?: Record<string, unknown>;
  agentId?: string;
  conversationId?: string;
}

export interface ToolFilters {
  category?: string;
  search?: string;
  isBuiltin?: boolean;
  page: number;
  limit: number;
}
