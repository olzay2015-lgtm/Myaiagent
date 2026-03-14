import { toolRegistry, toolExecutor } from '@ai-agent-platform/tools-registry';
import { 
  ToolContext, 
  ToolCall, 
  ToolResult,
  LLMResponse 
} from './types';

export interface ToolExecutionContext {
  agentId: string;
  userId: string;
  conversationId: string;
  toolConfig: Record<string, unknown>;
}

export class ToolOrchestrator {
  private maxIterations: number;

  constructor(maxIterations: number = 5) {
    this.maxIterations = maxIterations;
  }

  /**
   * Check if LLM response contains tool calls
   */
  hasToolCalls(response: LLMResponse): boolean {
    return !!response.toolCalls && response.toolCalls.length > 0;
  }

  /**
   * Extract tool calls from LLM response
   */
  extractToolCalls(response: LLMResponse): ToolCall[] {
    if (!response.toolCalls || response.toolCalls.length === 0) {
      return [];
    }

    return response.toolCalls.map((tc: any) => ({
      id: tc.id,
      toolSlug: tc.function.name,
      arguments: JSON.parse(tc.function.arguments || '{}'),
    }));
  }

  /**
   * Execute a single tool call
   */
  async executeTool(
    toolCall: ToolCall,
    toolContext: ToolContext,
    executionContext: ToolExecutionContext
  ): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Get tool from registry
      const tool = toolRegistry.getBySlug(toolCall.toolSlug);

      if (!tool) {
        return {
          toolCallId: toolCall.id,
          toolSlug: toolCall.toolSlug,
          success: false,
          error: `Tool not found: ${toolCall.toolSlug}`,
          executionTimeMs: Date.now() - startTime,
        };
      }

      // Merge agent tool config with execution context
      const context = {
        agentId: executionContext.agentId,
        userId: executionContext.userId,
        conversationId: executionContext.conversationId,
        toolConfig: {
          ...toolContext.config,
          ...executionContext.toolConfig,
        },
      };

      // Execute tool
      const result = await toolExecutor.execute(tool, toolCall.arguments, context);

      return {
        toolCallId: toolCall.id,
        toolSlug: toolCall.toolSlug,
        success: result.success,
        data: result.data,
        error: result.error,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        toolCallId: toolCall.id,
        toolSlug: toolCall.toolSlug,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute multiple tool calls
   */
  async executeToolCalls(
    toolCalls: ToolCall[],
    tools: ToolContext[],
    executionContext: ToolExecutionContext
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    // Create tool lookup map
    const toolMap = new Map(tools.map(t => [t.slug, t]));

    for (const toolCall of toolCalls) {
      const toolContext = toolMap.get(toolCall.toolSlug);
      
      if (!toolContext) {
        results.push({
          toolCallId: toolCall.id,
          toolSlug: toolCall.toolSlug,
          success: false,
          error: `Tool ${toolCall.toolSlug} not available to this agent`,
          executionTimeMs: 0,
        });
        continue;
      }

      const result = await this.executeTool(toolCall, toolContext, executionContext);
      results.push(result);
    }

    return results;
  }

  /**
   * Format tool results for LLM
   */
  formatResultsForLLM(results: ToolResult[]): Array<{
    role: 'tool';
    content: string;
    tool_call_id: string;
    name: string;
  }> {
    return results.map(result => ({
      role: 'tool' as const,
      content: result.success
        ? JSON.stringify(result.data)
        : JSON.stringify({ error: result.error }),
      tool_call_id: result.toolCallId,
      name: result.toolSlug,
    }));
  }

  /**
   * Check if should continue iterating (more tool calls needed)
   */
  shouldContinue(iteration: number, response: LLMResponse): boolean {
    if (iteration >= this.maxIterations) {
      return false;
    }

    return this.hasToolCalls(response);
  }

  /**
   * Get execution summary
   */
  getSummary(results: ToolResult[]): {
    total: number;
    successful: number;
    failed: number;
    totalExecutionTimeMs: number;
  } {
    return {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalExecutionTimeMs: results.reduce((sum, r) => sum + r.executionTimeMs, 0),
    };
  }
}

// Singleton instance with default 5 iterations
export const toolOrchestrator = new ToolOrchestrator(5);
