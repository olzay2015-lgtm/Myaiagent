/**
 * Text Chunker — разбивает текст на чанки для RAG.
 * Без внешних зависимостей.
 */

export interface ChunkOptions {
  chunkSize?: number;       // Max chars per chunk (default: 500)
  chunkOverlap?: number;    // Overlap between chunks (default: 50)
  separator?: string;       // Preferred split point (default: '\n')
}

export interface TextChunk {
  index: number;
  content: string;
  startOffset: number;
  endOffset: number;
  metadata?: Record<string, unknown>;
}

/**
 * Split text into overlapping chunks
 */
export function chunkText(text: string, options?: ChunkOptions): TextChunk[] {
  const chunkSize = options?.chunkSize || 500;
  const chunkOverlap = options?.chunkOverlap || 50;
  const separator = options?.separator || '\n';

  if (!text || text.length === 0) return [];

  // If text fits in one chunk, return as-is
  if (text.length <= chunkSize) {
    return [{
      index: 0,
      content: text,
      startOffset: 0,
      endOffset: text.length,
    }];
  }

  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    // Try to split at a natural boundary (sentence end, newline)
    if (end < text.length) {
      // Look back from end for a good split point
      const searchRegion = text.substring(start, end);
      
      // Priority: paragraph break > sentence end > separator > word boundary
      const lastParagraph = searchRegion.lastIndexOf('\n\n');
      const lastSentence = Math.max(
        searchRegion.lastIndexOf('. '),
        searchRegion.lastIndexOf('! '),
        searchRegion.lastIndexOf('? '),
      );
      const lastSep = searchRegion.lastIndexOf(separator);
      const lastSpace = searchRegion.lastIndexOf(' ');

      // Pick the best split point (must be at least 50% of chunkSize)
      const minSplit = Math.floor(chunkSize * 0.5);
      
      if (lastParagraph > minSplit) {
        end = start + lastParagraph + 2;
      } else if (lastSentence > minSplit) {
        end = start + lastSentence + 2;
      } else if (lastSep > minSplit) {
        end = start + lastSep + 1;
      } else if (lastSpace > minSplit) {
        end = start + lastSpace + 1;
      }
    }

    chunks.push({
      index: chunks.length,
      content: text.substring(start, end).trim(),
      startOffset: start,
      endOffset: end,
    });

    // Move start forward with overlap
    start = end - chunkOverlap;
    if (start >= text.length) break;
    if (end >= text.length) break;
  }

  return chunks;
}
