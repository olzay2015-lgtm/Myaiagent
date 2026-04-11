import { createTool } from '@ai-agent-platform/tools-registry';
import { ToolResult, ToolContext, ToolInput } from '@ai-agent-platform/tools-registry';
import { toolHouseClient } from '../toolhouse-client';

/**
 * Read URL / Document Tool — читает содержимое веб-страниц и документов.
 *
 * Стратегия:
 * 1. Если TOOLHOUSE_API_KEY задан → используем ToolHouse API
 * 2. Иначе → встроенный fetch + HTML парсинг (без внешних зависимостей)
 */
async function readUrlHandler(input: ToolInput, context: ToolContext): Promise<ToolResult> {
  const { url, maxLength = 10000, extractLinks = false } = input;

  if (!url || typeof url !== 'string') {
    return { success: false, error: 'URL is required and must be a string' };
  }

  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url as string);
  } catch {
    return { success: false, error: 'Invalid URL format' };
  }

  // Only allow http/https protocols
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { success: false, error: 'Only HTTP and HTTPS URLs are supported' };
  }

  // Strategy 1: ToolHouse API
  if (toolHouseClient.isConfigured) {
    try {
      const result = await toolHouseClient.executeToolCall('web_scrape', {
        url,
        max_length: maxLength,
      });
      if (result.success) {
        return { success: true, data: result.data };
      }
      console.warn('ToolHouse read_url failed, falling back to built-in:', result.error);
    } catch (error) {
      console.warn('ToolHouse read_url error, falling back:', error);
    }
  }

  // Strategy 2: Built-in fetch + HTML parsing
  try {
    const content = await fetchAndParse(url as string, maxLength as number, extractLinks as boolean);
    return {
      success: true,
      data: content,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read URL',
    };
  }
}

/**
 * Fetch URL and parse content (no external dependencies)
 */
async function fetchAndParse(
  url: string,
  maxLength: number,
  extractLinks: boolean
): Promise<{
  url: string;
  title: string;
  content: string;
  contentLength: number;
  links?: Array<{ text: string; href: string }>;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MyAIAgent/1.0; +https://github.com/myaiagent)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
        'Accept-Language': 'en-US,en;q=0.5,ru;q=0.3',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const html = await response.text();

    // If it's plain text, return as-is
    if (contentType.includes('text/plain') || contentType.includes('application/json')) {
      return {
        url,
        title: url,
        content: html.substring(0, maxLength),
        contentLength: html.length,
      };
    }

    // Parse HTML
    const title = extractTitle(html);
    const textContent = htmlToText(html);
    const truncated = textContent.substring(0, maxLength);

    const result: {
      url: string;
      title: string;
      content: string;
      contentLength: number;
      links?: Array<{ text: string; href: string }>;
    } = {
      url,
      title,
      content: truncated,
      contentLength: textContent.length,
    };

    if (extractLinks) {
      result.links = extractHtmlLinks(html, url).slice(0, 20);
    }

    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extract title from HTML
 */
function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].trim()) : '';
}

/**
 * Convert HTML to plain text (no dependencies)
 */
function htmlToText(html: string): string {
  let text = html;

  // Remove script and style blocks
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  text = text.replace(/<header[\s\S]*?<\/header>/gi, '');

  // Convert common elements to text equivalents
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n\n');
  text = text.replace(/<li[^>]*>/gi, '\n• ');
  text = text.replace(/<\/li>/gi, '');

  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = decodeHtmlEntities(text);

  // Clean up whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  return text;
}

/**
 * Decode common HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&mdash;': '—',
    '&ndash;': '–',
    '&hellip;': '…',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
  };

  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'g'), char);
  }

  // Numeric entities
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));

  return result;
}

/**
 * Extract links from HTML
 */
function extractHtmlLinks(html: string, baseUrl: string): Array<{ text: string; href: string }> {
  const links: Array<{ text: string; href: string }> = [];
  const regex = /<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    let href = match[1];
    const text = match[2].replace(/<[^>]+>/g, '').trim();

    if (!text || text.length < 2) continue;
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;

    // Resolve relative URLs
    try {
      href = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }

    links.push({ text: text.substring(0, 200), href });
  }

  return links;
}

export const toolhouseReadUrlTool = createTool({
  id: 'toolhouse-read-url',
  name: 'Read URL / Document (ToolHouse)',
  slug: 'toolhouse_read_url',
  description: 'Read and extract text content from a web page or document URL. Returns the main text content, title, and optionally links. Use this to read articles, documentation, or any web page.',
  category: 'DATA_ACCESS',
  icon: 'file-text',
  isBuiltin: true,
  timeoutMs: 15000,
  requiresAuth: false,

  inputSchema: {
    type: 'object',
    description: 'Parameters for reading a URL',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to read content from',
      },
      maxLength: {
        type: 'number',
        description: 'Maximum characters of content to return (default: 10000)',
        default: 10000,
      },
      extractLinks: {
        type: 'boolean',
        description: 'Whether to extract links from the page (default: false)',
        default: false,
      },
    },
    required: ['url'],
  },

  handler: readUrlHandler,
});
