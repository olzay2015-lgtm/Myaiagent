import {
  ToolDefinition,
  ToolContext,
  ToolInput,
  ToolResult,
  ToolExecutionOptions,
  ToolCall,
  ToolCallResult,
} from './interfaces';
import { toolRegistry } from './registry';

export class ToolExecutor {
  private defaultOptions: ToolExecutionOptions = {
    timeoutMs: 30000,
    retries: 1,
    retryDelayMs: 1000,
  };

  /**
   * Execute a single tool
   */
  async execute(
    tool: ToolDefinition,
    input: ToolInput,
    context: ToolContext,
    options: ToolExecutionOptions = {}
  ): Promise<ToolResult> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();

    try {
      // Validate input against schema
      const validationError = this.validateInput(tool, input);
      if (validationError) {
        return {
          success: false,
          error: validationError,
          metadata: { executionTimeMs: Date.now() - startTime },
        };
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(
        tool,
        input,
        context,
        opts.timeoutMs || 30000
      );

      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      console.error(`Tool execution error (${tool.name}):`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during tool execution',
        metadata: { executionTimeMs: Date.now() - startTime },
      };
    }
  }

  /**
   * Execute a tool call from LLM
   */
  async executeToolCall(
    toolCall: ToolCall,
    context: ToolContext,
    options?: ToolExecutionOptions
  ): Promise<ToolCallResult> {
    const tool = toolRegistry.getBySlug(toolCall.function.name);

    if (!tool) {
      return {
        tool_call_id: toolCall.id,
        role: 'tool',
        name: toolCall.function.name,
        content: JSON.stringify({
          success: false,
          error: `Tool not found: ${toolCall.function.name}`,
        }),
      };
    }

    // Parse arguments
    let input: ToolInput;
    try {
      input = JSON.parse(toolCall.function.arguments);
    } catch (error) {
      return {
        tool_call_id: toolCall.id,
        role: 'tool',
        name: tool.slug,
        content: JSON.stringify({
          success: false,
          error: 'Invalid arguments: failed to parse JSON',
        }),
      };
    }

    // Execute tool
    const result = await this.execute(tool, input, context, options);

    return {
      tool_call_id: toolCall.id,
      role: 'tool',
      name: tool.slug,
      content: JSON.stringify(result),
    };
  }

  /**
   * Execute multiple tool calls
   */
  async executeToolCalls(
    toolCalls: ToolCall[],
    context: ToolContext,
    options?: ToolExecutionOptions
  ): Promise<ToolCallResult[]> {
    const results: ToolCallResult[] = [];

    for (const toolCall of toolCalls) {
      const result = await this.executeToolCall(toolCall, context, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout(
    tool: ToolDefinition,
    input: ToolInput,
    context: ToolContext,
    timeoutMs: number
  ): Promise<ToolResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Tool execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      Promise.resolve(tool.handler(input, context))
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Validate input against tool schema
   */
  private validateInput(tool: ToolDefinition, input: ToolInput): string | null {
    const schema = tool.inputSchema;

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in input) || input[field] === undefined || input[field] === null) {
          return `Missing required field: ${field}`;
        }
      }
    }

    // Validate field types (basic validation)
    for (const [key, value] of Object.entries(input)) {
      const propSchema = schema.properties[key];
      if (propSchema) {
        const expectedType = propSchema.type;
        const actualType = Array.isArray(value) ? 'array' : typeof value;

        if (expectedType !== actualType) {
          return `Invalid type for field '${key}': expected ${expectedType}, got ${actualType}`;
        }

        // Validate enum values
        if (propSchema.enum && !propSchema.enum.includes(value as string)) {
          return `Invalid value for field '${key}': must be one of ${propSchema.enum.join(', ')}`;
        }
      }
    }

    return null;
  }

  /**
   * Format tool result for LLM
   */
  formatResultForLLM(result: ToolResult): string {
    if (result.success) {
      if (typeof result.data === 'string') {
        return result.data;
      }
      return JSON.stringify(result.data, null, 2);
    } else {
      return `Error: ${result.error}`;
    }
  }
}

// Singleton instance
export const toolExecutor = new ToolExecutor();
