import { prisma, Tool, ToolCategory } from '@ai-agent-platform/database';
import { CreateToolDto, UpdateToolDto, ToolFilters } from './tools.dto';

export class ToolsService {
  async list(filters: ToolFilters): Promise<{ tools: Tool[]; total: number }> {
    const { category, search, isBuiltin, page, limit } = filters;
    
    const where: any = {};
    
    if (category) {
      where.category = category as ToolCategory;
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

    const [tools, total] = await Promise.all([
      prisma.tool.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { isBuiltin: 'desc' },
          { name: 'asc' },
        ],
      }),
      prisma.tool.count({ where }),
    ]);

    return { tools, total };
  }

  async getById(id: string): Promise<Tool | null> {
    return prisma.tool.findUnique({
      where: { id },
    });
  }

  async create(data: CreateToolDto, userId: string): Promise<Tool> {
    const slug = this.generateSlug(data.name);

    return prisma.tool.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        category: data.category,
        icon: data.icon,
        configSchema: data.configSchema,
        inputSchema: data.inputSchema,
        handlerModule: data.handlerModule || 'custom',
        timeoutMs: data.timeoutMs || 30000,
        requiresAuth: data.requiresAuth || false,
        isBuiltin: false,
        isPublic: false,
        creatorId: userId,
        version: 1,
      },
    });
  }

  async update(id: string, data: UpdateToolDto, userId: string): Promise<Tool> {
    const existing = await prisma.tool.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Tool not found');
    }

    if (existing.isBuiltin) {
      throw new Error('Cannot modify builtin tool');
    }

    if (existing.creatorId !== userId) {
      throw new Error('Unauthorized');
    }

    const updateData: any = { ...data };
    
    if (data.name && data.name !== existing.name) {
      updateData.slug = this.generateSlug(data.name);
    }

    // Increment version on update
    updateData.version = existing.version + 1;

    return prisma.tool.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const existing = await prisma.tool.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Tool not found');
    }

    if (existing.isBuiltin) {
      throw new Error('Cannot delete builtin tool');
    }

    if (existing.creatorId !== userId) {
      throw new Error('Unauthorized');
    }

    await prisma.tool.delete({
      where: { id },
    });
  }

  async clone(id: string, userId: string): Promise<Tool> {
    const existing = await prisma.tool.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Tool not found');
    }

    const newSlug = `${existing.slug}-clone-${Date.now()}`;

    return prisma.tool.create({
      data: {
        name: `${existing.name} (Clone)`,
        slug: newSlug,
        description: existing.description,
        category: existing.category,
        icon: existing.icon,
        configSchema: existing.configSchema,
        inputSchema: existing.inputSchema,
        handlerModule: existing.handlerModule,
        timeoutMs: existing.timeoutMs,
        requiresAuth: existing.requiresAuth,
        isBuiltin: false,
        isPublic: false,
        creatorId: userId,
        version: 1,
      },
    });
  }

  async getCategories(): Promise<{ id: string; name: string; description: string }[]> {
    return [
      { id: 'COMMUNICATION', name: 'Communication', description: 'Send messages via Telegram, Email, Slack' },
      { id: 'DATA_ACCESS', name: 'Data Access', description: 'Search web, query databases, access APIs' },
      { id: 'FILE_SYSTEM', name: 'File System', description: 'Read and write files' },
      { id: 'CODE_EXECUTION', name: 'Code Execution', description: 'Execute code in sandboxed environment' },
      { id: 'EXTERNAL_API', name: 'External API', description: 'Connect to third-party APIs' },
      { id: 'CUSTOM', name: 'Custom', description: 'User-created custom tools' },
    ];
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
  }
}
