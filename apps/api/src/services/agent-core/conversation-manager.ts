import { prisma } from '@ai-agent-platform/database';
import { 
  Conversation, 
  Message, 
  LLMMessage,
  ToolCall,
  ToolResult 
} from './types';
import { v4 as uuidv4 } from 'uuid';

export class ConversationManager {
  /**
   * Get or create a conversation
   */
  async getOrCreate(
    conversationId: string | undefined,
    agentId: string,
    userId: string,
    metadata?: Record<string, unknown>
  ): Promise<Conversation> {
    if (conversationId) {
      const existing = await this.getById(conversationId);
      if (existing) {
        return existing;
      }
    }

    return this.create(agentId, userId, metadata);
  }

  /**
   * Get conversation by ID
   */
  async getById(conversationId: string): Promise<Conversation | null> {
    const dbConversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!dbConversation) {
      return null;
    }

    return this.mapToConversation(dbConversation);
  }

  /**
   * Create a new conversation
   */
  async create(
    agentId: string,
    userId: string,
    metadata?: Record<string, unknown>
  ): Promise<Conversation> {
    const dbConversation = await prisma.conversation.create({
      data: {
        agentId,
        userId,
        channel: 'API',
        channelMetadata: metadata || {},
        status: 'ACTIVE',
      },
      include: { messages: true },
    });

    return this.mapToConversation(dbConversation);
  }

  /**
   * Add a message to conversation
   */
  async addMessage(
    conversationId: string,
    message: Omit<Message, 'id' | 'timestamp'>
  ): Promise<Message> {
    const dbMessage = await prisma.message.create({
      data: {
        conversationId,
        role: message.role,
        content: message.content,
        metadata: message.metadata || {},
      },
    });

    // Update conversation last message time
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { 
        lastMessageAt: new Date(),
        messageCount: { increment: 1 },
      },
    });

    return this.mapToMessage(dbMessage);
  }

  /**
   * Get recent messages for LLM context
   */
  async getRecentMessages(
    conversationId: string,
    limit: number = 20
  ): Promise<Message[]> {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages
      .map(m => this.mapToMessage(m))
      .reverse(); // Return in chronological order
  }

  /**
   * Build LLM messages array from conversation history
   */
  async buildLLMMessages(
    conversationId: string,
    systemPrompt: string,
    currentUserMessage: string,
    limit: number = 20
  ): Promise<LLMMessage[]> {
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
    ];

    // Get recent conversation history
    const recentMessages = await this.getRecentMessages(conversationId, limit);

    for (const msg of recentMessages) {
      const llmMsg: LLMMessage = {
        role: msg.role,
        content: msg.content,
      };

      // Add tool calls if present
      if (msg.metadata?.toolCalls) {
        llmMsg.tool_calls = msg.metadata.toolCalls as any[];
      }

      // Add tool call id if present
      if (msg.metadata?.toolCallId) {
        llmMsg.tool_call_id = msg.metadata.toolCallId as string;
        llmMsg.name = msg.metadata.toolName as string;
      }

      messages.push(llmMsg);
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: currentUserMessage,
    });

    return messages;
  }

  /**
   * Save assistant response with tool calls
   */
  async saveAssistantResponse(
    conversationId: string,
    content: string,
    toolCalls?: ToolCall[],
    metadata?: Record<string, unknown>
  ): Promise<Message> {
    return this.addMessage(conversationId, {
      role: 'assistant',
      content,
      metadata: {
        ...metadata,
        toolCalls: toolCalls || [],
      },
    });
  }

  /**
   * Save tool results
   */
  async saveToolResults(
    conversationId: string,
    results: ToolResult[]
  ): Promise<Message[]> {
    const messages: Message[] = [];

    for (const result of results) {
      const content = result.success
        ? JSON.stringify(result.data)
        : JSON.stringify({ error: result.error });

      const msg = await this.addMessage(conversationId, {
        role: 'tool',
        content,
        metadata: {
          toolCallId: result.toolCallId,
          toolName: result.toolSlug,
          toolSuccess: result.success,
          executionTimeMs: result.executionTimeMs,
        },
      });

      messages.push(msg);
    }

    return messages;
  }

  /**
   * Map database conversation to domain model
   */
  private mapToConversation(dbConversation: any): Conversation {
    return {
      id: dbConversation.id,
      agentId: dbConversation.agentId,
      userId: dbConversation.userId,
      messages: dbConversation.messages.map((m: any) => this.mapToMessage(m)),
      metadata: (dbConversation.channelMetadata as Record<string, unknown>) || {},
      createdAt: dbConversation.createdAt,
      updatedAt: dbConversation.updatedAt,
    };
  }

  /**
   * Map database message to domain model
   */
  private mapToMessage(dbMessage: any): Message {
    return {
      id: dbMessage.id,
      role: dbMessage.role.toLowerCase() as any,
      content: dbMessage.content,
      metadata: (dbMessage.metadata as Record<string, unknown>) || {},
      timestamp: dbMessage.createdAt,
    };
  }

  /**
   * Update conversation metadata
   */
  async updateMetadata(
    conversationId: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        channelMetadata: metadata,
      },
    });
  }

  /**
   * Delete conversation
   */
  async delete(conversationId: string): Promise<void> {
    await prisma.conversation.delete({
      where: { id: conversationId },
    });
  }
}

// Singleton instance
export const conversationManager = new ConversationManager();
