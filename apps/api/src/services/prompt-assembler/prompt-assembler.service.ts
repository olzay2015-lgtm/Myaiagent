import { prisma, Agent, AgentSkill, Skill } from '@ai-agent-platform/database';

export interface AssembledPrompt {
  systemPrompt: string;
  skillsUsed: string[];
  metadata: {
    skillCount: number;
    basePromptUsed: boolean;
    totalCharacters: number;
  };
}

export interface SkillWithOverride extends AgentSkill {
  skill: Skill;
}

export class PromptAssembler {
  /**
   * Assemble system prompt from agent's base prompt and enabled skills
   */
  async assembleForAgent(agentId: string): Promise<AssembledPrompt> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        skills: {
          where: { isEnabled: true },
          include: { skill: true },
          orderBy: { priority: 'desc' },
        },
      },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    return this.assemble(agent.systemPrompt, agent.skills as SkillWithOverride[]);
  }

  /**
   * Assemble system prompt from base prompt and skills
   */
  assemble(basePrompt: string | null, skills: SkillWithOverride[]): AssembledPrompt {
    const parts: string[] = [];
    const skillsUsed: string[] = [];

    // Start with base system prompt if exists
    if (basePrompt && basePrompt.trim()) {
      parts.push('# BASE INSTRUCTIONS\n\n' + basePrompt.trim());
      parts.push(''); // Empty line separator
    }

    // Group skills by category for better organization
    const groupedSkills = this.groupSkillsByCategory(skills);

    // Add each skill's prompt
    for (const [category, categorySkills] of Object.entries(groupedSkills)) {
      if (categorySkills.length > 0) {
        parts.push(`# ${category.toUpperCase().replace('_', ' ')}`);
        parts.push('');

        for (const agentSkill of categorySkills) {
          const skill = agentSkill.skill;
          
          // Use custom prompt if override exists, otherwise use skill's default
          const promptText = agentSkill.customPrompt || skill.prompt;
          
          // Replace variables if provided
          const processedPrompt = this.processVariables(
            promptText,
            (agentSkill.variables as Record<string, unknown>) || {}
          );

          parts.push(`## ${skill.name}`);
          parts.push(processedPrompt);
          parts.push('');

          skillsUsed.push(skill.name);
        }
      }
    }

    // Add final instructions
    if (parts.length > 0) {
      parts.push('# IMPORTANT REMINDERS');
      parts.push('');
      parts.push('- Always follow the above instructions when responding.');
      parts.push('- Stay in character according to your defined personality and skills.');
      parts.push('- Be helpful, accurate, and thoughtful in your responses.');
    }

    const systemPrompt = parts.join('\n').trim();

    return {
      systemPrompt,
      skillsUsed,
      metadata: {
        skillCount: skills.length,
        basePromptUsed: !!basePrompt,
        totalCharacters: systemPrompt.length,
      },
    };
  }

  /**
   * Group skills by their category
   */
  private groupSkillsByCategory(skills: SkillWithOverride[]): Record<string, SkillWithOverride[]> {
    const grouped: Record<string, SkillWithOverride[]> = {};

    for (const skill of skills) {
      const category = skill.skill.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(skill);
    }

    // Define category order
    const categoryOrder = ['PERSONALITY', 'COMMUNICATION', 'DOMAIN_EXPERTISE', 'TASK_SPECIFIC', 'CUSTOM'];
    
    // Sort skills within each category by priority
    for (const category of Object.keys(grouped)) {
      grouped[category].sort((a, b) => b.priority - a.priority);
    }

    // Return in defined order
    const ordered: Record<string, SkillWithOverride[]> = {};
    for (const category of categoryOrder) {
      if (grouped[category]) {
        ordered[category] = grouped[category];
      }
    }

    // Add any remaining categories
    for (const [category, skillsList] of Object.entries(grouped)) {
      if (!ordered[category]) {
        ordered[category] = skillsList;
      }
    }

    return ordered;
  }

  /**
   * Process variable substitution in prompt text
   */
  private processVariables(prompt: string, variables: Record<string, unknown>): string {
    let processed = prompt;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), String(value));
    }

    // Clean up any unreplaced variables
    processed = processed.replace(/\{\{\w+\}\}/g, '');

    return processed;
  }

  /**
   * Preview what the assembled prompt will look like
   */
  preview(agent: Agent, skills: SkillWithOverride[]): AssembledPrompt {
    return this.assemble(agent.systemPrompt, skills);
  }

  /**
   * Get estimated token count (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  /**
   * Validate that assembled prompt is within token limits
   */
  validateTokenLimit(assembledPrompt: AssembledPrompt, maxTokens: number = 4000): {
    valid: boolean;
    estimatedTokens: number;
    excess: number;
  } {
    const estimatedTokens = this.estimateTokens(assembledPrompt.systemPrompt);
    const excess = Math.max(0, estimatedTokens - maxTokens);

    return {
      valid: estimatedTokens <= maxTokens,
      estimatedTokens,
      excess,
    };
  }
}

// Singleton instance
export const promptAssembler = new PromptAssembler();
