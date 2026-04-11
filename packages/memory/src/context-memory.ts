/**
 * Context Memory — память в рамках одной беседы.
 * Хранит ключевые факты, извлечённые из разговора.
 * Живёт в памяти процесса, привязана к conversationId.
 */

export interface MemoryEntry {
  key: string;
  value: string;
  category?: string;
  timestamp: Date;
  source: 'user' | 'agent' | 'system';
}

export class ContextMemory {
  /** conversationId → Map<key, MemoryEntry> */
  private store: Map<string, Map<string, MemoryEntry>> = new Map();
  private maxEntriesPerConversation: number;

  constructor(maxEntriesPerConversation: number = 100) {
    this.maxEntriesPerConversation = maxEntriesPerConversation;
  }

  /**
   * Save a fact to context memory
   */
  save(conversationId: string, key: string, value: string, options?: {
    category?: string;
    source?: 'user' | 'agent' | 'system';
  }): void {
    if (!this.store.has(conversationId)) {
      this.store.set(conversationId, new Map());
    }

    const convMemory = this.store.get(conversationId)!;

    // Enforce limit
    if (convMemory.size >= this.maxEntriesPerConversation && !convMemory.has(key)) {
      // Remove oldest entry
      const firstKey = convMemory.keys().next().value;
      if (firstKey !== undefined) {
        convMemory.delete(firstKey);
      }
    }

    convMemory.set(key, {
      key,
      value,
      category: options?.category,
      timestamp: new Date(),
      source: options?.source || 'system',
    });
  }

  /**
   * Recall a specific fact
   */
  recall(conversationId: string, key: string): MemoryEntry | undefined {
    return this.store.get(conversationId)?.get(key);
  }

  /**
   * Search memory by keyword (simple text match)
   */
  search(conversationId: string, query: string): MemoryEntry[] {
    const convMemory = this.store.get(conversationId);
    if (!convMemory) return [];

    const lowerQuery = query.toLowerCase();
    return Array.from(convMemory.values()).filter(entry =>
      entry.key.toLowerCase().includes(lowerQuery) ||
      entry.value.toLowerCase().includes(lowerQuery) ||
      (entry.category && entry.category.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get all memory for a conversation
   */
  getAll(conversationId: string): MemoryEntry[] {
    const convMemory = this.store.get(conversationId);
    if (!convMemory) return [];
    return Array.from(convMemory.values());
  }

  /**
   * Get memory by category
   */
  getByCategory(conversationId: string, category: string): MemoryEntry[] {
    return this.getAll(conversationId).filter(e => e.category === category);
  }

  /**
   * Delete a specific memory entry
   */
  delete(conversationId: string, key: string): boolean {
    return this.store.get(conversationId)?.delete(key) || false;
  }

  /**
   * Clear all memory for a conversation
   */
  clear(conversationId: string): void {
    this.store.delete(conversationId);
  }

  /**
   * Build a context string for LLM system prompt injection
   */
  buildContextString(conversationId: string): string {
    const entries = this.getAll(conversationId);
    if (entries.length === 0) return '';

    const lines = entries.map(e => {
      const cat = e.category ? ` [${e.category}]` : '';
      return `- ${e.key}${cat}: ${e.value}`;
    });

    return `\n\n## Context Memory (remembered facts from this conversation):\n${lines.join('\n')}`;
  }

  /**
   * Get stats
   */
  getStats(): { totalConversations: number; totalEntries: number } {
    let totalEntries = 0;
    for (const convMemory of this.store.values()) {
      totalEntries += convMemory.size;
    }
    return {
      totalConversations: this.store.size,
      totalEntries,
    };
  }
}

// Singleton
export const contextMemory = new ContextMemory();
