import { prisma, Agent } from '@ai-agent-platform/database';
import { CreateAgentDto, UpdateAgentDto } from './agents.dto';

export interface AgentFilters {
  page: number;
  limit: number;
}

export class AgentsService {
  async list(userId: string, filters: AgentFilters): Promise<{ agents: Agent[]; total: number }> {
    const { page, limit } = filters;

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where: { ownerId: userId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          skills: {
            include: { skill: true },
          },
          _count: {
            select: { conversations: true },
          },
        },
      }),
      prisma.agent.count({ where: { ownerId: userId } }),
    ]);

    return { agents, total };
  }

  async create(data: CreateAgentDto, userId: string): Promise<Agent> {
    return prisma.agent.create({
      data: {
        ...data,
        ownerId: userId,
      },
      include: {
        skills: {
          include: { skill: true },
        },
      },
    }) as Promise<Agent>;
  }

  async getById(id: string): Promise<Agent | null> {
    return prisma.agent.findUnique({
      where: { id },
      include: {
        skills: {
          include: { skill: true },
        },
        _count: {
          select: { conversations: true },
        },
      },
    });
  }

  async update(id: string, data: UpdateAgentDto, userId: string): Promise<Agent> {
    const existing = await prisma.agent.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Agent not found');
    }

    if (existing.ownerId !== userId) {
      throw new Error('Unauthorized');
    }

    return prisma.agent.update({
      where: { id },
      data,
      include: {
        skills: {
          include: { skill: true },
        },
      },
    }) as Promise<Agent>;
  }

  async delete(id: string, userId: string): Promise<void> {
    const existing = await prisma.agent.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Agent not found');
    }

    if (existing.ownerId !== userId) {
      throw new Error('Unauthorized');
    }

    await prisma.agent.delete({
      where: { id },
    });
  }
}
