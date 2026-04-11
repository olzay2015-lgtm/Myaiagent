import { createTool } from '@ai-agent-platform/tools-registry';
import { ToolResult, ToolContext, ToolInput } from '@ai-agent-platform/tools-registry';
import { documentStore } from '../document-store';

/**
 * RAG Search Tool — поиск по загруженным документам
 */
async function ragSearchHandler(input: ToolInput, context: ToolContext): Promise<ToolResult> {
  const { query, maxResults = 5 } = input;

  if (!query || typeof query !== 'string') {
    return { success: false, error: 'Query is required' };
  }

  const results = documentStore.search(context.agentId, query as string, maxResults as number);

  return {
    success: true,
    data: {
      query,
      results,
      count: results.length,
    },
  };
}

export const ragSearchTool = createTool({
  id: 'rag-search',
  name: 'Search Documents (RAG)',
  slug: 'rag_search',
  description: 'Search through previously uploaded documents and knowledge base. Returns the most relevant text chunks. Use this to find specific information in uploaded documents.',
  category: 'DATA_ACCESS',
  icon: 'file-search',
  isBuiltin: true,
  timeoutMs: 5000,
  requiresAuth: false,
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query to find relevant document chunks' },
      maxResults: { type: 'number', description: 'Maximum number of results to return (default: 5)' },
    },
    required: ['query'],
  },
  handler: ragSearchHandler,
});

/**
 * RAG Add Document Tool — добавить документ в базу знаний
 */
async function ragAddDocumentHandler(input: ToolInput, context: ToolContext): Promise<ToolResult> {
  const { title, content, source } = input;

  if (!title || !content) {
    return { success: false, error: 'Title and content are required' };
  }

  try {
    const doc = await documentStore.addDocument(
      context.agentId,
      title as string,
      content as string,
      (source as string) || 'user_input',
    );

    return {
      success: true,
      data: {
        message: `Document "${title}" added successfully`,
        documentId: doc.id,
        chunkCount: doc.chunks.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add document',
    };
  }
}

export const ragAddDocumentTool = createTool({
  id: 'rag-add-document',
  name: 'Add Document (RAG)',
  slug: 'rag_add_document',
  description: 'Add a document or text to the agent knowledge base. The text will be chunked and indexed for later search.',
  category: 'DATA_ACCESS',
  icon: 'file-plus',
  isBuiltin: true,
  timeoutMs: 10000,
  requiresAuth: false,
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Document title' },
      content: { type: 'string', description: 'Full text content of the document' },
      source: { type: 'string', description: 'Source of the document (URL, filename, etc.)' },
    },
    required: ['title', 'content'],
  },
  handler: ragAddDocumentHandler,
});

/**
 * RAG List Documents Tool — список загруженных документов
 */
async function ragListDocumentsHandler(input: ToolInput, context: ToolContext): Promise<ToolResult> {
  const docs = documentStore.listDocuments(context.agentId);

  return {
    success: true,
    data: { documents: docs, count: docs.length },
  };
}

export const ragListDocumentsTool = createTool({
  id: 'rag-list-documents',
  name: 'List Documents (RAG)',
  slug: 'rag_list_documents',
  description: 'List all documents in the agent knowledge base.',
  category: 'DATA_ACCESS',
  icon: 'file-list',
  isBuiltin: true,
  timeoutMs: 5000,
  requiresAuth: false,
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  handler: ragListDocumentsHandler,
});
