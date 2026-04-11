/**
 * Long-term Memory — долгосрочная память агента.
 * Персистентное хранение фактов о пользователе и контексте
 * через Prisma (PostgreSQL).
 *
 * Данные сохраняются между сессиями и беседами.
 */

export interface LongTermEntry {
  id: string;
  agentId: string;
  userId: string;
  key: string;
  value: string;
  category: string;
  importance: number; // 1-10
  accessCount: number;
  lastAccessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LongTermSearchOptions {
  category?: string;
  minImportance?: number;
  limit?: number;
}

/**
 * LongTermMemory — работает через repopsitory pattern.
 * Prisma-зависимость инжектится через конструктор для тестируемости.
 */
export class LongTermMemory {
  private prisma: any; // PrismaClient injected

  constructor(prismaClient?: any) {
    this.prisma = prismaClient;
  }

  /**
   * Set Prisma client (для lazy init когда BD недоступна при старте)
   */
  setPrisma(prismaClient: any): void {
    this.prisma = prismaClient;
  }

  private ensurePrisma(): void {
    if (!this.prisma) {
      throw new Error('LongTermMemory: Prisma client not initialized. Call setPrisma() first or ensure database is available.');
    }
  }

  /**
   * Save or update a long-term memory entry
   */
  async save(
    agentId: string,
    userId: string,
    key: string,
    value: string,
    options?: { category?: string; importance?: number }
  ): Promise<LongTermEntry> {
    this.ensurePrisma();

    const existing = await this.prisma.memoryEntry.findFirst({
      where: { agentId, userId, key },
    });

    if (existing) {
      return this.prisma.memoryEntry.update({
        where: { id: existing.id },
        data: {
          value,
          category: options?.category || existing.category,
          importance: options?.importance || existing.importance,
          accessCount: existing.accessCount + 1,
          lastAccessedAt: new Date(),
        },
      });
    }

    return this.prisma.memoryEntry.create({
      data: {
        agentId,
        userId,
        key,
        value,
        category: options?.category || 'general',
        importance: options?.importance || 5,
        accessCount: 0,
        lastAccessedAt: new Date(),
      },
    });
  }

  /**
   * Recall a specific memory
   */
  async recall(agentId: string, userId: string, key: string): Promise<LongTermEntry | null> {
    this.ensurePrisma();

    const entry = await this.prisma.memoryEntry.findFirst({
      where: { agentId, userId, key },
    });

    if (entry) {
      // Update access stats
      await this.prisma.memoryEntry.update({
        where: { id: entry.id },
        data: {
          accessCount: entry.accessCount + 1,
          lastAccessedAt: new Date(),
        },
      });
    }

    return entry;
  }

  /**
   * Search long-term memory by query text
   */
  async search(
    agentId: string,
    userId: string,
    query: string,
    options?: LongTermSearchOptions
  ): Promise<LongTermEntry[]> {
    this.ensurePrisma();

    const where: any = { agentId, userId };

    if (options?.category) {
      where.category = options.category;
    }
    if (options?.minImportance) {
      where.importance = { gte: options.minImportance };
    }

    // Text search in key and value
    where.OR = [
      { key: { contains: query, mode: 'insensitive' } },
      { value: { contains: query, mode: 'insensitive' } },
    ];

    return this.prisma.memoryEntry.findMany({
      where,
      orderBy: [
        { importance: 'desc' },
        { lastAccessedAt: 'desc' },
      ],
      take: options?.limit || 20,
    });
  }

  /**
   * Get all memories for agent+user
   */
  async getAll(agentId: string, userId: string, options?: LongTermSearchOptions): Promise<LongTermEntry[]> {
    this.ensurePrisma();

    const where: any = { agentId, userId };

    if (options?.category) {
      where.category = options.category;
    }
    if (options?.minImportance) {
      where.importance = { gte: options.minImportance };
    }

    return this.prisma.memoryEntry.findMany({
      where,
      orderBy: { importance: 'desc' },
      take: options?.limit || 50,
    });
  }

  /**
   * Delete a memory entry
   */
  async delete(agentId: string, userId: string, key: string): Promise<boolean> {
    this.ensurePrisma();

    const entry = await this.prisma.memoryEntry.findFirst({
      where: { agentId, userId, key },
    });

    if (!entry) return false;

    await this.prisma.memoryEntry.delete({ where: { id: entry.id } });
    return true;
  }

  /**
   * Build context string for system prompt (most important memories)
   */
  async buildContextString(agentId: string, userId: string, maxEntries: number = 10): Promise<string> {
    const entries = await this.getAll(agentId, userId, {
      minImportance: 3,
      limit: maxEntries,
    });

    if (entries.length === 0) return '';

    const lines = entries.map((e: LongTermEntry) =>
      `- [${e.category}] ${e.key}: ${e.value} (importance: ${e.importance})`
    );

    return `\n\n## Long-term Memory (persistent facts about this user):\n${lines.join('\n')}`;
  }
}

// Singleton
export const longTermMemory = new LongTermMemory();
