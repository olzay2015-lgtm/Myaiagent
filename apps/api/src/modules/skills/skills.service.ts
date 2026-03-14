import { prisma, Skill, SkillCategory } from '@ai-agent-platform/database';
import { CreateSkillDto, UpdateSkillDto, SkillFilters } from './skills.dto';

export class SkillsService {
  async list(filters: SkillFilters): Promise<{ skills: Skill[]; total: number }> {
    const { category, search, isBuiltin, page, limit } = filters;
    
    const where: any = {};
    
    if (category) {
      where.category = category as SkillCategory;
    }
    
    if (isBuiltin !== undefined) {
      where.isBuiltin = isBuiltin;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { isBuiltin: 'desc' },
          { priority: 'desc' },
          { name: 'asc' },
        ],
      }),
      prisma.skill.count({ where }),
    ]);

    return { skills, total };
  }

  async getById(id: string): Promise<Skill | null> {
    return prisma.skill.findUnique({
      where: { id },
    });
  }

  async create(data: CreateSkillDto, userId: string): Promise<Skill> {
    const slug = this.generateSlug(data.name);

    return prisma.skill.create({
      data: {
        ...data,
        slug,
        isBuiltin: false,
        isPublic: false,
        creatorId: userId,
        priority: data.priority ?? 0,
      },
    });
  }

  async update(id: string, data: UpdateSkillDto, userId: string): Promise<Skill> {
    const existing = await prisma.skill.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Skill not found');
    }

    if (existing.isBuiltin) {
      throw new Error('Cannot modify builtin skill');
    }

    // Only allow update if user is the creator
    if (existing.creatorId !== userId) {
      throw new Error('Unauthorized');
    }

    const updateData: any = { ...data };
    
    // If name changed, regenerate slug
    if (data.name && data.name !== existing.name) {
      updateData.slug = this.generateSlug(data.name);
    }

    return prisma.skill.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const existing = await prisma.skill.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Skill not found');
    }

    if (existing.isBuiltin) {
      throw new Error('Cannot delete builtin skill');
    }

    // Only allow delete if user is the creator
    if (existing.creatorId !== userId) {
      throw new Error('Unauthorized');
    }

    await prisma.skill.delete({
      where: { id },
    });
  }

  async clone(id: string, userId: string): Promise<Skill> {
    const existing = await prisma.skill.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Skill not found');
    }

    const newSlug = `${existing.slug}-clone-${Date.now()}`;

    return prisma.skill.create({
      data: {
        name: `${existing.name} (Clone)`,
        slug: newSlug,
        description: existing.description,
        category: existing.category,
        icon: existing.icon,
        color: existing.color,
        prompt: existing.prompt,
        variables: existing.variables,
        priority: existing.priority,
        isBuiltin: false,
        isPublic: false,
        creatorId: userId,
      },
    });
  }

  async getCategories(): Promise<{ id: string; name: string; description: string }[]> {
    return [
      { id: 'PERSONALITY', name: 'Personality', description: 'Core personality traits and behaviors' },
      { id: 'DOMAIN_EXPERTISE', name: 'Domain Expertise', description: 'Professional knowledge and expertise' },
      { id: 'TASK_SPECIFIC', name: 'Task Specific', description: 'Task-oriented capabilities' },
      { id: 'COMMUNICATION', name: 'Communication', description: 'Communication style and tone' },
      { id: 'CUSTOM', name: 'Custom', description: 'User-created custom skills' },
    ];
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
  }
}
