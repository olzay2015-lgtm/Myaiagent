import { prisma } from '@ai-agent-platform/database';
import { 
  AgentConfig, 
  AgentContext, 
  SkillContext, 
  ToolContext 
} from './types';
import { promptAssembler } from '../prompt-assembler';
import { toolRegistry } from '@ai-agent-platform/tools-registry';

export class ContextBuilder {
  /**
   * Build complete agent context including skills, tools, and system prompt
   */
  async build(agentId: string, userId: string): Promise<AgentContext> {
    // Load agent configuration
    const agent = await this.loadAgentConfig(agentId);
    
    // Load active skills
    const skills = await this.loadSkills(agentId);
    
    // Load active tools
    const tools = await this.loadTools(agentId);
    
    // Build system prompt from skills
    const systemPrompt = await this.buildSystemPrompt(agentId, skills);
    
    return {
      agent,
      systemPrompt,
      skills,
      tools,
      metadata: {
        userId,
        skillCount: skills.length,
        toolCount: tools.length,
        builtAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Load agent configuration from database
   */
  private async loadAgentConfig(agentId: string): Promise<AgentConfig> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    return {
      id: agent.id,
      name: agent.name,
      description: agent.description || undefined,
      model: agent.model,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      topP: agent.topP,
      frequencyPenalty: agent.frequencyPenalty,
      presencePenalty: agent.presencePenalty,
      maxToolIterations: 5, // Default, could be configurable per agent
    };
  }

  /**
   * Load active skills for agent
   */
  private async loadSkills(agentId: string): Promise<SkillContext[]> {
    const agentSkills = await prisma.agentSkill.findMany({
      where: { 
        agentId,
        isEnabled: true,
      },
      include: { skill: true },
      orderBy: { priority: 'desc' },
    });

    return agentSkills.map(as => ({
      id: as.skill.id,
      name: as.skill.name,
      category: as.skill.category,
      prompt: as.customPrompt || as.skill.prompt,
      priority: as.priority,
      variables: (as.variables as Record<string, unknown>) || undefined,
    }));
  }

  /**
   * Load active tools for agent
   */
  private async loadTools(agentId: string): Promise<ToolContext[]> {
    const agentTools = await prisma.agentTool.findMany({
      where: {
        agentId,
        isEnabled: true,
      },
      include: { tool: true },
    });

    return agentTools.map(at => {
      // Get full tool definition from registry
      const toolDef = toolRegistry.get(at.tool.id) || toolRegistry.getBySlug(at.tool.slug);
      
      return {
        id: at.tool.id,
        name: at.tool.name,
        slug: at.tool.slug,
        description: at.tool.description || '',
        category: at.tool.category,
        config: (at.config as Record<string, unknown>) || {},
        inputSchema: at.tool.inputSchema as Record<string, unknown>,
        enabled: at.isEnabled,
      };
    });
  }

  /**
   * Build system prompt from agent base prompt and skills
   */
  private async buildSystemPrompt(agentId: string, skills: SkillContext[]): Promise<string> {
    const assembled = await promptAssembler.assembleForAgent(agentId);
    return assembled.systemPrompt;
  }

  /**
   * Get tools in OpenAI function format for LLM
   */
  getToolsForLLM(tools: ToolContext[]): any[] {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.slug,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  /**
   * Refresh context (reload skills/tools)
   */
  async refresh(agentId: string, userId: string): Promise<AgentContext> {
    return this.build(agentId, userId);
  }
}

// Singleton instance
export const contextBuilder = new ContextBuilder();
