import { prisma, Agent, AgentSkill, Skill, AgentTool, Tool } from '@ai-agent-platform/database';
import { promptAssembler, AssembledPrompt } from '../prompt-assembler';
import { openRouterProvider, LLMMessage, LLMCompletionOptions } from '../../providers/openrouter';
import { toolRegistry, toolExecutor } from '@ai-agent-platform/tools-registry';
import { ToolCall, ToolCallResult } from '@ai-agent-platform/tools-registry';

export interface AgentConfig {
  id: string;
  name: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  systemPrompt: string | null;
  assembledPrompt?: AssembledPrompt;
  tools?: AgentTool[];
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  message: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolCallResult[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  model: string;
  iteration?: number;
}

export interface StreamChunk {
  content: string;
  isComplete: boolean;
  toolCalls?: ToolCall[];
}

export class AgentEngine {
  /**
   * Load agent configuration with assembled prompt and tools
   */
  async loadAgent(agentId: string): Promise<AgentConfig> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        skills: {
          where: { isEnabled: true },
          include: { skill: true },
          orderBy: { priority: 'desc' },
        },
        tools: {
          where: { isEnabled: true },
          include: { tool: true },
        },
      },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    const assembled = await promptAssembler.assembleForAgent(agentId);

    return {
      id: agent.id,
      name: agent.name,
      model: agent.model,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      topP: agent.topP,
      frequencyPenalty: agent.frequencyPenalty,
      presencePenalty: agent.presencePenalty,
      systemPrompt: agent.systemPrompt,
      assembledPrompt: assembled,
      tools: agent.tools,
    };
  }

  /**
   * Generate a chat completion with optional tool calling
   */
  async chat(
    agentId: string,
    userMessage: string,
    history: ChatMessage[] = [],
    options?: {
      maxIterations?: number;
    }
  ): Promise<ChatResponse> {
    const startTime = Date.now();
    const maxIterations = options?.maxIterations || 5;
    
    // Load agent with assembled prompt and tools
    const agent = await this.loadAgent(agentId);

    if (!agent.assembledPrompt) {
      throw new Error('Failed to assemble agent prompt');
    }

    // Build messages array
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: agent.assembledPrompt.systemPrompt,
      },
    ];

    // Add conversation history
    for (const msg of history) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    // Get available tools
    const tools = this.getToolsForAgent(agent);

    let iteration = 0;
    let finalResponse: ChatResponse | null = null;
    const allToolCalls: ToolCall[] = [];
    const allToolResults: ToolCallResult[] = [];

    // Tool calling loop
    while (iteration < maxIterations) {
      iteration++;

      // Call LLM
      const llmOptions: LLMCompletionOptions = {
        model: agent.model,
        messages,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        topP: agent.topP,
        frequencyPenalty: agent.frequencyPenalty,
        presencePenalty: agent.presencePenalty,
        tools: tools.length > 0 ? tools : undefined,
      };

      const response = await openRouterProvider.createCompletion(llmOptions);

      // Check if there are tool calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        const toolCalls: ToolCall[] = response.toolCalls;
        allToolCalls.push(...toolCalls);

        // Add assistant message with tool calls
        messages.push({
          role: 'assistant',
          content: response.content || '',
          tool_calls: toolCalls,
        });

        // Execute tools
        const context = {
          agentId: agent.id,
          userId: 'temp-user-id', // TODO: Get from auth
          conversationId: 'temp-conversation', // TODO: Get from context
          toolConfig: {},
        };

        const toolResults = await toolExecutor.executeToolCalls(toolCalls, context);
        allToolResults.push(...toolResults);

        // Add tool results to messages
        for (const result of toolResults) {
          messages.push({
            role: 'tool',
            content: result.content,
            tool_call_id: result.tool_call_id,
            name: result.name,
          });
        }

        // Continue to next iteration
        continue;
      }

      // No tool calls, we have the final response
      finalResponse = {
        message: response.content,
        toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
        toolResults: allToolResults.length > 0 ? allToolResults : undefined,
        usage: response.usage,
        latencyMs: Date.now() - startTime,
        model: response.model,
        iteration,
      };

      break;
    }

    if (!finalResponse) {
      throw new Error('Max iterations reached without final response');
    }

    return finalResponse;
  }

  /**
   * Stream a chat completion
   */
  async *streamChat(
    agentId: string,
    userMessage: string,
    history: ChatMessage[] = []
  ): AsyncGenerator<StreamChunk> {
    const agent = await this.loadAgent(agentId);

    if (!agent.assembledPrompt) {
      throw new Error('Failed to assemble agent prompt');
    }

    // Build messages array
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: agent.assembledPrompt.systemPrompt,
      },
    ];

    // Add conversation history
    for (const msg of history) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    // Get available tools
    const tools = this.getToolsForAgent(agent);

    // Stream from LLM
    const options: LLMCompletionOptions = {
      model: agent.model,
      messages,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      topP: agent.topP,
      frequencyPenalty: agent.frequencyPenalty,
      presencePenalty: agent.presencePenalty,
      tools: tools.length > 0 ? tools : undefined,
    };

    for await (const chunk of openRouterProvider.createStream(options)) {
      yield {
        content: chunk.content,
        isComplete: chunk.finishReason !== null && chunk.finishReason !== undefined,
      };
    }
  }

  /**
   * Get available tools for an agent
   */
  private getToolsForAgent(agent: AgentConfig): any[] {
    if (!agent.tools || agent.tools.length === 0) {
      return [];
    }

    const enabledTools = agent.tools.filter(at => at.isEnabled);
    const openAIFunctions: any[] = [];

    for (const agentTool of enabledTools) {
      const tool = toolRegistry.get(agentTool.toolId);
      if (tool) {
        openAIFunctions.push({
          type: 'function',
          function: {
            name: tool.slug,
            description: tool.description,
            parameters: tool.inputSchema,
          },
        });
      }
    }

    return openAIFunctions;
  }

  /**
   * Preview the assembled prompt for an agent
   */
  async previewPrompt(agentId: string): Promise<{
    assembledPrompt: AssembledPrompt;
    tokenValidation: {
      valid: boolean;
      estimatedTokens: number;
      excess: number;
    };
  }> {
    const assembled = await promptAssembler.assembleForAgent(agentId);
    const tokenValidation = promptAssembler.validateTokenLimit(assembled);

    return {
      assembledPrompt: assembled,
      tokenValidation,
    };
  }

  /**
   * Get agent's current skills
   */
  async getAgentSkills(agentId: string): Promise<(AgentSkill & { skill: Skill })[]> {
    const skills = await prisma.agentSkill.findMany({
      where: { agentId },
      include: { skill: true },
      orderBy: { priority: 'desc' },
    });

    return skills;
  }

  /**
   * Attach skill to agent
   */
  async attachSkill(
    agentId: string,
    skillId: string,
    options?: {
      isEnabled?: boolean;
      customPrompt?: string;
      priority?: number;
      variables?: Record<string, unknown>;
    }
  ): Promise<AgentSkill> {
    const existing = await prisma.agentSkill.findUnique({
      where: {
        agentId_skillId: {
          agentId,
          skillId,
        },
      },
    });

    if (existing) {
      // Update existing
      return prisma.agentSkill.update({
        where: {
          agentId_skillId: {
            agentId,
            skillId,
          },
        },
        data: {
          isEnabled: options?.isEnabled ?? existing.isEnabled,
          customPrompt: options?.customPrompt ?? existing.customPrompt,
          priority: options?.priority ?? existing.priority,
          variables: options?.variables ?? existing.variables,
        },
      });
    }

    // Create new
    return prisma.agentSkill.create({
      data: {
        agentId,
        skillId,
        isEnabled: options?.isEnabled ?? true,
        customPrompt: options?.customPrompt,
        priority: options?.priority ?? 0,
        variables: options?.variables,
      },
    });
  }

  /**
   * Detach skill from agent
   */
  async detachSkill(agentId: string, skillId: string): Promise<void> {
    await prisma.agentSkill.delete({
      where: {
        agentId_skillId: {
          agentId,
          skillId,
        },
      },
    });
  }

  /**
   * Toggle skill enabled state
   */
  async toggleSkill(agentId: string, skillId: string, isEnabled: boolean): Promise<AgentSkill> {
    return prisma.agentSkill.update({
      where: {
        agentId_skillId: {
          agentId,
          skillId,
        },
      },
      data: { isEnabled },
    });
  }

  /**
   * Update skill priority
   */
  async updateSkillPriority(agentId: string, skillId: string, priority: number): Promise<AgentSkill> {
    return prisma.agentSkill.update({
      where: {
        agentId_skillId: {
          agentId,
          skillId,
        },
      },
      data: { priority },
    });
  }

  // ==================== TOOL MANAGEMENT ====================

  /**
   * Get agent's current tools
   */
  async getAgentTools(agentId: string): Promise<(AgentTool & { tool: Tool })[]> {
    const tools = await prisma.agentTool.findMany({
      where: { agentId },
      include: { tool: true },
    });

    return tools;
  }

  /**
   * Attach tool to agent
   */
  async attachTool(
    agentId: string,
    toolId: string,
    options?: {
      isEnabled?: boolean;
      config?: Record<string, unknown>;
      allowedOperations?: string[];
    }
  ): Promise<AgentTool> {
    const existing = await prisma.agentTool.findUnique({
      where: {
        agentId_toolId: {
          agentId,
          toolId,
        },
      },
    });

    if (existing) {
      // Update existing
      return prisma.agentTool.update({
        where: {
          agentId_toolId: {
            agentId,
            toolId,
          },
        },
        data: {
          isEnabled: options?.isEnabled ?? existing.isEnabled,
          config: options?.config ?? existing.config,
          allowedOperations: options?.allowedOperations ?? existing.allowedOperations,
        },
      });
    }

    // Create new
    return prisma.agentTool.create({
      data: {
        agentId,
        toolId,
        isEnabled: options?.isEnabled ?? true,
        config: options?.config,
        allowedOperations: options?.allowedOperations,
      },
    });
  }

  /**
   * Detach tool from agent
   */
  async detachTool(agentId: string, toolId: string): Promise<void> {
    await prisma.agentTool.delete({
      where: {
        agentId_toolId: {
          agentId,
          toolId,
        },
      },
    });
  }

  /**
   * Toggle tool enabled state
   */
  async toggleTool(agentId: string, toolId: string, isEnabled: boolean): Promise<AgentTool> {
    return prisma.agentTool.update({
      where: {
        agentId_toolId: {
          agentId,
          toolId,
        },
      },
      data: { isEnabled },
    });
  }

  /**
   * Update tool configuration
   */
  async updateToolConfig(
    agentId: string,
    toolId: string,
    config: Record<string, unknown>
  ): Promise<AgentTool> {
    return prisma.agentTool.update({
      where: {
        agentId_toolId: {
          agentId,
          toolId,
        },
      },
      data: { config },
    });
  }
}

// Singleton instance
export const agentEngine = new AgentEngine();
