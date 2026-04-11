import { createTool } from '@ai-agent-platform/tools-registry';
import { ToolResult, ToolContext, ToolInput } from '@ai-agent-platform/tools-registry';
import { contextMemory } from '../context-memory';
import { longTermMemory } from '../longterm-memory';

/**
 * Context Memory Save Tool — сохранить факт в рамках текущей беседы
 */
async function contextMemorySaveHandler(input: ToolInput, context: ToolContext): Promise<ToolResult> {
  const { key, value, category } = input;

  if (!key || !value) {
    return { success: false, error: 'Key and value are required' };
  }

  contextMemory.save(context.conversationId, key as string, value as string, {
    category: category as string,
    source: 'agent',
  });

  return {
    success: true,
    data: { message: `Remembered: ${key} = ${value}` },
  };
}

export const contextMemorySaveTool = createTool({
  id: 'memory-context-save',
  name: 'Remember (Context)',
  slug: 'memory_context_save',
  description: 'Save an important fact or detail from the current conversation. This memory lasts only during this conversation. Use this to remember user preferences, names, or key details mentioned in the chat.',
  category: 'DATA_ACCESS',
  icon: 'brain',
  isBuiltin: true,
  timeoutMs: 5000,
  requiresAuth: false,
  inputSchema: {
    type: 'object',
    properties: {
      key: { type: 'string', description: 'Short label for the fact (e.g., "user_name", "preferred_language")' },
      value: { type: 'string', description: 'The value to remember' },
      category: { type: 'string', description: 'Category (e.g., "preference", "fact", "context")' },
    },
    required: ['key', 'value'],
  },
  handler: contextMemorySaveHandler,
});

/**
 * Context Memory Recall Tool — вспомнить факт из текущей беседы
 */
async function contextMemoryRecallHandler(input: ToolInput, context: ToolContext): Promise<ToolResult> {
  const { query } = input;

  if (!query) {
    // Return all context memory
    const all = contextMemory.getAll(context.conversationId);
    return { success: true, data: { entries: all, count: all.length } };
  }

  const results = contextMemory.search(context.conversationId, query as string);
  return {
    success: true,
    data: { query, results, count: results.length },
  };
}

export const contextMemoryRecallTool = createTool({
  id: 'memory-context-recall',
  name: 'Recall (Context)',
  slug: 'memory_context_recall',
  description: 'Recall facts saved earlier in the current conversation. Search by keyword or get all remembered facts.',
  category: 'DATA_ACCESS',
  icon: 'brain',
  isBuiltin: true,
  timeoutMs: 5000,
  requiresAuth: false,
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Keyword to search for in remembered facts (optional — leave empty to get all)' },
    },
    required: [],
  },
  handler: contextMemoryRecallHandler,
});

/**
 * Long-term Memory Save Tool — сохранить факт на долгое время
 */
async function longtermMemorySaveHandler(input: ToolInput, context: ToolContext): Promise<ToolResult> {
  const { key, value, category, importance } = input;

  if (!key || !value) {
    return { success: false, error: 'Key and value are required' };
  }

  try {
    const entry = await longTermMemory.save(
      context.agentId,
      context.userId,
      key as string,
      value as string,
      {
        category: (category as string) || 'general',
        importance: (importance as number) || 5,
      }
    );

    return {
      success: true,
      data: { message: `Saved to long-term memory: ${key}`, entry },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save to long-term memory',
    };
  }
}

export const longtermMemorySaveTool = createTool({
  id: 'memory-longterm-save',
  name: 'Remember (Long-term)',
  slug: 'memory_longterm_save',
  description: 'Save an important fact about the user to long-term memory. This memory persists across conversations. Use for important user preferences, personal details, or frequently referenced information.',
  category: 'DATA_ACCESS',
  icon: 'database',
  isBuiltin: true,
  timeoutMs: 5000,
  requiresAuth: false,
  inputSchema: {
    type: 'object',
    properties: {
      key: { type: 'string', description: 'Short label for the fact' },
      value: { type: 'string', description: 'The value to remember permanently' },
      category: { type: 'string', description: 'Category: "preference", "personal", "work", "health", "general"' },
      importance: { type: 'number', description: 'Importance level 1-10 (higher = more important, default 5)' },
    },
    required: ['key', 'value'],
  },
  handler: longtermMemorySaveHandler,
});

/**
 * Long-term Memory Recall Tool — вспомнить из долгосрочной памяти
 */
async function longtermMemoryRecallHandler(input: ToolInput, context: ToolContext): Promise<ToolResult> {
  const { query, category, minImportance } = input;

  try {
    if (query) {
      const results = await longTermMemory.search(
        context.agentId,
        context.userId,
        query as string,
        {
          category: category as string,
          minImportance: minImportance as number,
        }
      );
      return { success: true, data: { query, results, count: results.length } };
    }

    const all = await longTermMemory.getAll(context.agentId, context.userId, {
      category: category as string,
      limit: 20,
    });
    return { success: true, data: { results: all, count: all.length } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to recall from long-term memory',
    };
  }
}

export const longtermMemoryRecallTool = createTool({
  id: 'memory-longterm-recall',
  name: 'Recall (Long-term)',
  slug: 'memory_longterm_recall',
  description: 'Recall facts from long-term memory (persists across conversations). Search by keyword, category, or list all remembered facts about a user.',
  category: 'DATA_ACCESS',
  icon: 'database',
  isBuiltin: true,
  timeoutMs: 5000,
  requiresAuth: false,
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query (optional — leave empty to get all)' },
      category: { type: 'string', description: 'Filter by category (optional)' },
      minImportance: { type: 'number', description: 'Minimum importance level 1-10 (optional)' },
    },
    required: [],
  },
  handler: longtermMemoryRecallHandler,
});
