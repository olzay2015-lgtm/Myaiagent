/**
 * RAG Document Store — хранилище документов для RAG.
 * In-memory TF-IDF поиск (без внешних зависимостей).
 * При наличии БД — персистентное хранение.
 */

import { chunkText, TextChunk, ChunkOptions } from './chunker';

export interface RagDocument {
  id: string;
  title: string;
  content: string;
  source: string;           // URL, файл, пользоватeль
  agentId: string;
  chunks: TextChunk[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface SearchResult {
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  content: string;
  score: number;
  source: string;
}

/**
 * Simple TF-IDF based search engine (no external dependencies)
 */
export class DocumentStore {
  private documents: Map<string, RagDocument> = new Map();
  private idfCache: Map<string, number> = new Map();
  private dirty: boolean = false;
  private prisma: any = null;

  setPrisma(prismaClient: any): void {
    this.prisma = prismaClient;
  }

  /**
   * Add a document to the store
   */
  async addDocument(
    agentId: string,
    title: string,
    content: string,
    source: string,
    options?: ChunkOptions & { metadata?: Record<string, unknown> }
  ): Promise<RagDocument> {
    const id = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const chunks = chunkText(content, options);

    const doc: RagDocument = {
      id,
      title,
      content,
      source,
      agentId,
      chunks,
      metadata: options?.metadata,
      createdAt: new Date(),
    };

    this.documents.set(id, doc);
    this.dirty = true;

    // Persist to DB if available
    if (this.prisma) {
      try {
        await this.prisma.ragDocument.create({
          data: {
            id,
            agentId,
            title,
            content,
            source,
            chunksJson: JSON.stringify(chunks),
            metadata: options?.metadata || {},
          },
        });
      } catch (error) {
        console.warn('RAG: Failed to persist document to DB:', error);
      }
    }

    return doc;
  }

  /**
   * Search across all documents for an agent
   */
  search(agentId: string, query: string, maxResults: number = 5): SearchResult[] {
    if (this.dirty) {
      this.rebuildIdfCache();
    }

    const queryTerms = this.tokenize(query);
    const results: SearchResult[] = [];

    for (const doc of this.documents.values()) {
      if (doc.agentId !== agentId) continue;

      for (const chunk of doc.chunks) {
        const score = this.calculateTfIdfScore(chunk.content, queryTerms);
        if (score > 0) {
          results.push({
            documentId: doc.id,
            documentTitle: doc.title,
            chunkIndex: chunk.index,
            content: chunk.content,
            score,
            source: doc.source,
          });
        }
      }
    }

    // Sort by score (highest first) and return top N
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults);
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    const deleted = this.documents.delete(documentId);
    if (deleted) {
      this.dirty = true;
      if (this.prisma) {
        try {
          await this.prisma.ragDocument.delete({ where: { id: documentId } });
        } catch (error) {
          console.warn('RAG: Failed to delete document from DB:', error);
        }
      }
    }
    return deleted;
  }

  /**
   * List all documents for an agent
   */
  listDocuments(agentId: string): Array<{
    id: string;
    title: string;
    source: string;
    chunkCount: number;
    createdAt: Date;
  }> {
    return Array.from(this.documents.values())
      .filter(d => d.agentId === agentId)
      .map(d => ({
        id: d.id,
        title: d.title,
        source: d.source,
        chunkCount: d.chunks.length,
        createdAt: d.createdAt,
      }));
  }

  /**
   * Load documents from database
   */
  async loadFromDatabase(agentId: string): Promise<void> {
    if (!this.prisma) return;

    try {
      const docs = await this.prisma.ragDocument.findMany({
        where: { agentId },
      });

      for (const doc of docs) {
        if (!this.documents.has(doc.id)) {
          this.documents.set(doc.id, {
            id: doc.id,
            title: doc.title,
            content: doc.content,
            source: doc.source,
            agentId: doc.agentId,
            chunks: JSON.parse(doc.chunksJson),
            metadata: doc.metadata as Record<string, unknown>,
            createdAt: doc.createdAt,
          });
        }
      }
      this.dirty = true;
    } catch (error) {
      console.warn('RAG: Failed to load documents from DB:', error);
    }
  }

  // --- TF-IDF Implementation ---

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);
  }

  private termFrequency(term: string, tokens: string[]): number {
    const count = tokens.filter(t => t === term).length;
    return count / (tokens.length || 1);
  }

  private rebuildIdfCache(): void {
    this.idfCache.clear();
    const allChunks: string[][] = [];

    for (const doc of this.documents.values()) {
      for (const chunk of doc.chunks) {
        allChunks.push(this.tokenize(chunk.content));
      }
    }

    if (allChunks.length === 0) return;

    // Collect all unique terms
    const termSet = new Set<string>();
    for (const tokens of allChunks) {
      for (const token of tokens) {
        termSet.add(token);
      }
    }

    // Calculate IDF for each term
    const totalDocs = allChunks.length;
    for (const term of termSet) {
      const docsWithTerm = allChunks.filter(tokens =>
        tokens.includes(term)
      ).length;
      this.idfCache.set(term, Math.log(totalDocs / (docsWithTerm + 1)) + 1);
    }

    this.dirty = false;
  }

  private calculateTfIdfScore(text: string, queryTerms: string[]): number {
    const tokens = this.tokenize(text);
    let score = 0;

    for (const term of queryTerms) {
      const tf = this.termFrequency(term, tokens);
      const idf = this.idfCache.get(term) || 1;
      score += tf * idf;
    }

    return score;
  }

  /**
   * Stats
   */
  getStats(): { totalDocuments: number; totalChunks: number } {
    let totalChunks = 0;
    for (const doc of this.documents.values()) {
      totalChunks += doc.chunks.length;
    }
    return { totalDocuments: this.documents.size, totalChunks };
  }
}

// Singleton
export const documentStore = new DocumentStore();
