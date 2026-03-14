import { Message, ProcessResult, ToolCall, ToolResult, LLMResponse } from './types';

export interface ProcessedResponse {
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  metadata: {
    model: string;
    finishReason: string | null;
    tokensUsed?: {
      prompt: number;
      completion: number;
      total: number;
    };
    iterations: number;
    toolExecutionSummary?: {
      total: number;
      successful: number;
      failed: number;
      totalExecutionTimeMs: number;
    };
  };
}

export class ResponseProcessor {
  /**
   * Process LLM response into standardized format
   */
  process(
    response: LLMResponse,
    toolCalls?: ToolCall[],
    toolResults?: ToolResult[],
    iterations: number = 1
  ): ProcessedResponse {
    const metadata: ProcessedResponse['metadata'] = {
      model: response.model,
      finishReason: response.finishReason,
      iterations,
    };

    // Add token usage if available
    if (response.usage) {
      metadata.tokensUsed = {
        prompt: response.usage.promptTokens,
        completion: response.usage.completionTokens,
        total: response.usage.totalTokens,
      };
    }

    // Add tool execution summary if tools were used
    if (toolResults && toolResults.length > 0) {
      metadata.toolExecutionSummary = this.calculateToolSummary(toolResults);
    }

    return {
      content: response.content,
      toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
      toolResults: toolResults && toolResults.length > 0 ? toolResults : undefined,
      metadata,
    };
  }

  /**
   * Create final message object
   */
  createMessage(
    content: string,
    role: 'assistant' = 'assistant',
    metadata?: Record<string, unknown>
  ): Omit<Message, 'id' | 'timestamp'> {
    return {
      role,
      content,
      metadata,
    };
  }

  /**
   * Build final process result
   */
  buildResult(
    message: Message,
    processedResponse: ProcessedResponse,
    latencyMs: number,
    iterations: number
  ): Omit<ProcessResult, 'conversation'> {
    return {
      message,
      usage: processedResponse.metadata.tokensUsed || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      latencyMs,
      toolCalls: processedResponse.toolCalls,
      toolResults: processedResponse.toolResults,
      iterations,
    };
  }

  /**
   * Format response for API output
   */
  formatForAPI(result: ProcessResult): any {
    return {
      message: {
        id: result.message.id,
        role: result.message.role,
        content: result.message.content,
        timestamp: result.message.timestamp,
      },
      toolCalls: result.toolCalls,
      toolResults: result.toolResults?.map(tr => ({
        toolCallId: tr.toolCallId,
        toolSlug: tr.toolSlug,
        success: tr.success,
        data: tr.data,
        error: tr.error,
        executionTimeMs: tr.executionTimeMs,
      })),
      usage: result.usage,
      latencyMs: result.latencyMs,
      iterations: result.iterations,
    };
  }

  /**
   * Calculate tool execution summary
   */
  private calculateToolSummary(toolResults: ToolResult[]): {
    total: number;
    successful: number;
    failed: number;
    totalExecutionTimeMs: number;
  } {
    return {
      total: toolResults.length,
      successful: toolResults.filter(r => r.success).length,
      failed: toolResults.filter(r => !r.success).length,
      totalExecutionTimeMs: toolResults.reduce((sum, r) => sum + r.executionTimeMs, 0),
    };
  }

  /**
   * Post-process content (e.g., clean up formatting)
   */
  postProcess(content: string): string {
    // Remove excessive whitespace
    let cleaned = content.replace(/\n{3,}/g, '\n\n');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  /**
   * Check if response indicates an error
   */
  isError(response: LLMResponse): boolean {
    return !response.content && !response.toolCalls;
  }

  /**
   * Generate error message
   */
  generateErrorMessage(error: Error): string {
    return `I apologize, but I encountered an error while processing your request: ${error.message}`;
  }
}

// Singleton instance
export const responseProcessor = new ResponseProcessor();
