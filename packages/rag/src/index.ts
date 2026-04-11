import { Router } from 'express';
import { PlatformModule, ModuleHealth } from '@ai-agent-platform/module-loader';
import { documentStore, DocumentStore } from './document-store';
import { registerRagTools, ragTools } from './tools';

export { documentStore, DocumentStore } from './document-store';
export { chunkText, ChunkOptions, TextChunk } from './chunker';
export { registerRagTools, ragTools } from './tools';

/**
 * RAG Module — Retrieval Augmented Generation.
 * Хранилище документов + TF-IDF поиск + инструменты.
 */
export const ragModule: PlatformModule = {
  id: 'rag',
  name: 'RAG (Retrieval Augmented Generation)',
  description: 'Document storage, chunking, and search for knowledge-augmented responses',
  version: '0.1.0',

  async initialize(): Promise<void> {
    // Try to connect to database for persistence
    try {
      const { prisma } = require('@ai-agent-platform/database');
      documentStore.setPrisma(prisma);
      console.log('  📚 RAG: Database persistence enabled');
    } catch (error) {
      console.warn('  ⚠️  RAG: No database — using in-memory store only');
    }

    registerRagTools();
  },

  getRouter(): Router {
    const router = Router();

    // GET /modules/rag/status
    router.get('/status', (_req, res) => {
      const stats = documentStore.getStats();
      res.json({
        ...stats,
        tools: ragTools.map(t => ({ id: t.id, name: t.name, slug: t.slug })),
      });
    });

    // GET /modules/rag/documents?agentId=...
    router.get('/documents', (req, res) => {
      const agentId = req.query.agentId as string;
      if (!agentId) {
        return res.status(400).json({ error: 'agentId query parameter is required' });
      }
      const docs = documentStore.listDocuments(agentId);
      res.json({ documents: docs, count: docs.length });
    });

    // POST /modules/rag/documents
    router.post('/documents', async (req, res) => {
      const { agentId, title, content, source } = req.body;
      if (!agentId || !title || !content) {
        return res.status(400).json({ error: 'agentId, title, and content are required' });
      }
      try {
        const doc = await documentStore.addDocument(agentId, title, content, source || 'api');
        res.json({ success: true, document: { id: doc.id, title: doc.title, chunkCount: doc.chunks.length } });
      } catch (error) {
        res.status(500).json({ error: 'Failed to add document' });
      }
    });

    // POST /modules/rag/search
    router.post('/search', (req, res) => {
      const { agentId, query, maxResults } = req.body;
      if (!agentId || !query) {
        return res.status(400).json({ error: 'agentId and query are required' });
      }
      const results = documentStore.search(agentId, query, maxResults || 5);
      res.json({ results, count: results.length });
    });

    // DELETE /modules/rag/documents/:id
    router.delete('/documents/:id', async (req, res) => {
      const deleted = await documentStore.deleteDocument(req.params.id);
      res.json({ success: deleted });
    });

    return router;
  },

  async healthCheck(): Promise<ModuleHealth> {
    const stats = documentStore.getStats();
    return {
      status: 'healthy',
      details: stats,
    };
  },
};
