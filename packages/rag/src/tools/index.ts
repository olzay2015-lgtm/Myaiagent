import { toolRegistry } from '@ai-agent-platform/tools-registry';
import { ragSearchTool, ragAddDocumentTool, ragListDocumentsTool } from './rag-tools';

export { ragSearchTool, ragAddDocumentTool, ragListDocumentsTool } from './rag-tools';

export const ragTools = [ragSearchTool, ragAddDocumentTool, ragListDocumentsTool];

export function registerRagTools(): void {
  for (const tool of ragTools) {
    toolRegistry.register(tool);
  }
  console.log(`✅ Registered ${ragTools.length} RAG tools`);
}
