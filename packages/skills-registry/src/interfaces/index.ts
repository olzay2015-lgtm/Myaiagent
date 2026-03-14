// Skill interface that all skills must implement
export interface SkillDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: 'PERSONALITY' | 'DOMAIN_EXPERTISE' | 'TASK_SPECIFIC' | 'COMMUNICATION' | 'CUSTOM';
  icon?: string;
  color?: string;
  prompt: string;
  variables?: Record<string, SkillVariable>;
  priority: number;
  version: number;
  isBuiltin: boolean;
}

export interface SkillVariable {
  type: 'string' | 'number' | 'boolean' | 'select';
  label: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  options?: string[]; // For select type
}

// Skill registry interface
export interface SkillRegistry {
  register(skill: SkillDefinition): void;
  unregister(skillId: string): void;
  get(skillId: string): SkillDefinition | undefined;
  getAll(): SkillDefinition[];
  getByCategory(category: string): SkillDefinition[];
  getBuiltin(): SkillDefinition[];
}

// Skill assembler interface
export interface SkillAssembler {
  assemblePrompts(skillIds: string[], variables?: Record<string, Record<string, unknown>>): string;
  validateVariables(skillId: string, variables: Record<string, unknown>): boolean;
}
