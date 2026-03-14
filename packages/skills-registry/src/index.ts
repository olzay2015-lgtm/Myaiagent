import { SkillDefinition, SkillRegistry } from './interfaces';

class SkillRegistryImpl implements SkillRegistry {
  private skills: Map<string, SkillDefinition> = new Map();

  register(skill: SkillDefinition): void {
    this.skills.set(skill.id, skill);
  }

  unregister(skillId: string): void {
    this.skills.delete(skillId);
  }

  get(skillId: string): SkillDefinition | undefined {
    return this.skills.get(skillId);
  }

  getAll(): SkillDefinition[] {
    return Array.from(this.skills.values());
  }

  getByCategory(category: string): SkillDefinition[] {
    return this.getAll().filter(skill => skill.category === category);
  }

  getBuiltin(): SkillDefinition[] {
    return this.getAll().filter(skill => skill.isBuiltin);
  }
}

// Singleton instance
export const skillRegistry = new SkillRegistryImpl();

// Re-export interfaces
export * from './interfaces';

// Export builtin skills
export * from './builtin';
