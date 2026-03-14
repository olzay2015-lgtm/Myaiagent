import { openRouterProvider } from '../../providers/openrouter';
import { contextBuilder, ContextBuilder } from './context-builder';
import { conversationManager, ConversationManager } from './conversation-manager';
import { toolOrchestrator, ToolOrchestrator } from './tool-orchestrator';
import { responseProcessor, ResponseProcessor } from './response-processor';
import { middlewareRegistry, MiddlewareRegistry } from './middleware';
import {
  ProcessOptions,
  ProcessResult,
  Conversation,
  MiddlewareContext,
  MiddlewareHook,
  LLMMessage,
  LLMOptions,
  LLMResponse,
  ToolCall,
  ToolResult,
} from './types';

export interface AgentCoreOptions {
  contextBuilder?: ContextBuilder;
  conversationManager?: ConversationManager;
  toolOrchestrator?: ToolOrchestrator;
  responseProcessor?: ResponseProcessor;
  middlewareRegistry?: MiddlewareRegistry;
  llmProvider?: typeof openRouterProvider;
}

export class AgentCore {
  private contextBuilder: ContextBuilder;
  private conversationManager: ConversationManager;
  private toolOrchestrator: ToolOrchestrator;
  private responseProcessor: ResponseProcessor;
  private middlewareRegistry: MiddlewareRegistry;
  private llmProvider: typeof openRouterProvider;

  constructor(options: AgentCoreOptions = {}) {
    this.contextBuilder = options.contextBuilder || contextBuilder;
    this.conversationManager = options.conversationManager || conversationManager;
    this.toolOrchestrator = options.toolOrchestrator || toolOrchestrator;
    this.responseProcessor = options.responseProcessor || responseProcessor;
    this.middlewareRegistry = options.middlewareRegistry || middlewareRegistry;
    this.llmProvider = options.llmProvider || openRouterProvider;
  }

  /**
   * Process a user message through the complete agent pipeline
   * 
   * Flow:
   * 1. Load agent context (skills, tools)
   * 2. Build conversation messages
   * 3. Send to LLM with function calling
   * 4. If tool calls, execute tools and continue
   * 5. Return final response
   */
  async process(
    agentId: string,
    userId: string,
    message: string,
    options: ProcessOptions = {}
  ): Promise<ProcessResult> {
    const startTime = Date.now();
    const middlewareContext: MiddlewareContext = {
      agentId,
      userId,
      conversationId: options.metadata?.conversationId as string || '',
      message,
      metadata: options.metadata || {},
    };

    try {
      // BEFORE_LOAD_CONTEXT hook
      await this.middlewareRegistry.execute(MiddlewareHook.BEFORE_LOAD_CONTEXT, middlewareContext);

      // Step 1: Load Agent Context
      const agentContext = await this.contextBuilder.build(agentId, userId);
      middlewareContext.agentContext = agentContext;

      // AFTER_LOAD_CONTEXT hook
      await this.middlewareRegistry.execute(MiddlewareHook.AFTER_LOAD_CONTEXT, middlewareContext);

      // Get or create conversation
      const conversation = await this.conversationManager.getOrCreate(
        middlewareContext.conversationId,
        agentId,
        userId,
        options.metadata
      );
      middlewareContext.conversationId = conversation.id;

      // Step 2: Build LLM messages
      const messages = await this.conversationManager.buildLLMMessages(
        conversation.id,
        agentContext.systemPrompt,
        message
      );
      middlewareContext.messages = messages;

      // Prepare tools for LLM
      const tools = this.contextBuilder.getToolsForLLM(agentContext.tools);

      // BEFORE_SEND_TO_LLM hook
      await this.middlewareRegistry.execute(MiddlewareHook.BEFORE_SEND_TO_LLM, middlewareContext);

      // Step 3-5: LLM Loop with Tool Calling
      const { 
        finalResponse, 
        allToolCalls, 
        allToolResults, 
        iterations 
      } = await this.runLLMLoop(
        agentContext.agent,
        messages,
        tools,
        agentId,
        userId,
        conversation.id,
        agentContext.tools,
        middlewareContext
      );

      // AFTER_LLM_RESPONSE hook
      await this.middlewareRegistry.execute(MiddlewareHook.AFTER_LLM_RESPONSE, middlewareContext);

      // Step 6: Process final response
      const processed = this.responseProcessor.process(
        finalResponse,
        allToolCalls,
        allToolResults,
        iterations
      );

      // BEFORE_SAVE_MESSAGE hook
      await this.middlewareRegistry.execute(MiddlewareHook.BEFORE_SAVE_MESSAGE, middlewareContext);

      // Save assistant response
      const assistantMessage = await this.conversationManager.saveAssistantResponse(
        conversation.id,
        processed.content,
        allToolCalls,
        {
          model: finalResponse.model,
          tokensUsed: finalResponse.usage,
          iterations,
        }
      );

      // Build final result
      const result = this.responseProcessor.buildResult(
        assistantMessage,
        processed,
        Date.now() - startTime,
        iterations
      );

      middlewareContext.result = result as ProcessResult;

      // AFTER_PROCESS hook
      await this.middlewareRegistry.execute(MiddlewareHook.AFTER_PROCESS, middlewareContext);

      return {
        ...result,
        conversation,
      } as ProcessResult;

    } catch (error) {
      // ON_ERROR hook
      middlewareContext.error = error as Error;
      await this.middlewareRegistry.execute(MiddlewareHook.ON_ERROR, middlewareContext);

      throw error;
    }
  }

  /**
   * Run the LLM loop with tool calling
   */
  private async runLLMLoop(
    agent: any,
    messages: LLMMessage[],
    tools: any[],
    agentId: string,
    userId: string,
    conversationId: string,
    agentTools: any[],
    middlewareContext: MiddlewareContext
  ): Promise<{
    finalResponse: LLMResponse;
    allToolCalls: ToolCall[];
    allToolResults: ToolResult[];
    iterations: number;
  }> {
    const allToolCalls: ToolCall[] = [];
    const allToolResults: ToolResult[] = [];
    let iteration = 0;
    const maxIterations = agent.maxToolIterations || 5;

    while (iteration < maxIterations) {
      iteration++;

      // Send request to LLM
      const llmOptions: LLMOptions = {
        model: agent.model,
        messages,
        temperature: options.temperature || agent.temperature,
        maxTokens: options.maxTokens || agent.maxTokens,
        topP: agent.topP,
        frequencyPenalty: agent.frequencyPenalty,
        presencePenalty: agent.presencePenalty,
        tools: tools.length > 0 ? tools : undefined,
      };

      const response = await this.llmProvider.createCompletion(llmOptions);

      // Check if there are tool calls
      if (this.toolOrchestrator.hasToolCalls(response)) {
        const toolCalls = this.toolOrchestrator.extractToolCalls(response);
        allToolCalls.push(...toolCalls);

        // Add assistant message with tool calls
        messages.push({
          role: 'assistant',
          content: response.content || '',
          tool_calls: response.toolCalls,
        });

        // BEFORE_TOOL_EXECUTION hook
        await this.middlewareRegistry.execute(MiddlewareHook.BEFORE_TOOL_EXECUTION, middlewareContext);

        // Execute tools
        const executionContext = {
          agentId,
          userId,
          conversationId,
          toolConfig: {},
        };

        const toolResults = await this.toolOrchestrator.executeToolCalls(
          toolCalls,
          agentTools,
          executionContext
        );
        allToolResults.push(...toolResults);

        // AFTER_TOOL_EXECUTION hook
        await this.middlewareRegistry.execute(MiddlewareHook.AFTER_TOOL_EXECUTION, middlewareContext);

        // Save tool results
        await this.conversationManager.saveToolResults(conversationId, toolResults);

        // Add tool results to messages
        const formattedResults = this.toolOrchestrator.formatResultsForLLM(toolResults);
        for (const result of formattedResults) {
          messages.push(result as LLMMessage);
        }

        // Continue loop for LLM to process tool results
        continue;
      }

      // No tool calls, we have final response
      return {
        finalResponse: response,
        allToolCalls,
        allToolResults,
        iterations: iteration,
      };
    }

    // Max iterations reached
    throw new Error(`Max iterations (${maxIterations}) reached without final response`);
  }

  /**
   * Stream a response (simplified version without tool calling in stream)
   */
  async *stream(
    agentId: string,
    userId: string,
    message: string,
    options: ProcessOptions = {}
  ): AsyncGenerator<{ content: string; isComplete: boolean }> {
    // Load context
    const agentContext = await this.contextBuilder.build(agentId, userId);

    // Get conversation
    const conversation = await this.conversationManager.getOrCreate(
      options.metadata?.conversationId as string,
      agentId,
      userId,
      options.metadata
    );

    // Build messages
    const messages = await this.conversationManager.buildLLMMessages(
      conversation.id,
      agentContext.systemPrompt,
      message
    );

    // Stream from LLM (without tool calling for simplicity)
    const llmOptions: LLMOptions = {
      model: agentContext.agent.model,
      messages,
      temperature: options.temperature || agentContext.agent.temperature,
      maxTokens: options.maxTokens || agentContext.agent.maxTokens,
      topP: agentContext.agent.topP,
      frequencyPenalty: agentContext.agent.frequencyPenalty,
      presencePenalty: agentContext.agent.presencePenalty,
    };

    let fullContent = '';

    for await (const chunk of this.llmProvider.createStream(llmOptions)) {
      fullContent += chunk.content;
      yield {
        content: chunk.content,
        isComplete: !!chunk.finishReason,
      };
    }

    // Save message
    await this.conversationManager.saveAssistantResponse(
      conversation.id,
      fullContent,
      undefined,
      { model: agentContext.agent.model }
    );
  }

  /**
   * Register a middleware
   */
  use(hook: MiddlewareHook, middleware: any): void {
    this.middlewareRegistry.use(hook, middleware);
  }

  /**
   * Get conversation history
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    return this.conversationManager.getById(conversationId);
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    return this.conversationManager.delete(conversationId);
  }
}

// Singleton instance
export const agentCore = new AgentCore();

// Export all components
export * from './types';
export { contextBuilder, ContextBuilder } from './context-builder';
export { conversationManager, ConversationManager } from './conversation-manager';
export { toolOrchestrator, ToolOrchestrator } from './tool-orchestrator';
export { responseProcessor, ResponseProcessor } from './response-processor';
export { 
  middlewareRegistry, 
  MiddlewareRegistry,
  createLoggingMiddleware,
  createMetricsMiddleware,
  createRateLimitMiddleware,
} from './middleware';
