import { createTool } from '@ai-agent-platform/tools-registry';
import { ToolResult, ToolContext, ToolInput } from '@ai-agent-platform/tools-registry';
import { toolHouseClient } from '../toolhouse-client';

/**
 * Web Search Tool — реально работающий поиск.
 *
 * Стратегия:
 * 1. Если TOOLHOUSE_API_KEY задан → используем ToolHouse API
 * 2. Иначе → DuckDuckGo Instant Answer API (работает без ключа)
 */
async function webSearchHandler(input: ToolInput, context: ToolContext): Promise<ToolResult> {
  const { query, numResults = 5 } = input;

  if (!query || typeof query !== 'string') {
    return { success: false, error: 'Query is required and must be a string' };
  }

  // Strategy 1: ToolHouse API
  if (toolHouseClient.isConfigured) {
    try {
      const result = await toolHouseClient.executeToolCall('web_search', {
        query,
        num_results: numResults,
      });
      if (result.success) {
        return { success: true, data: result.data };
      }
      // Fall through to built-in search if ToolHouse fails
      console.warn('ToolHouse web search failed, falling back to built-in:', result.error);
    } catch (error) {
      console.warn('ToolHouse web search error, falling back:', error);
    }
  }

  // Strategy 2: DuckDuckGo API (no key needed)
  try {
    const results = await searchDuckDuckGo(query, numResults as number);
    return {
      success: true,
      data: {
        query,
        source: 'duckduckgo',
        results,
        totalResults: results.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Search failed',
    };
  }
}

/**
 * DuckDuckGo search — работает без API ключа
 */
async function searchDuckDuckGo(query: string, numResults: number): Promise<Array<{
  title: string;
  url: string;
  snippet: string;
}>> {
  const encodedQuery = encodeURIComponent(query);

  // DuckDuckGo Instant Answer API
  const response = await fetch(
    `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`,
    {
      headers: { 'User-Agent': 'MyAIAgent/1.0' },
    }
  );

  if (!response.ok) {
    throw new Error(`DuckDuckGo API error: ${response.status}`);
  }

  const data = await response.json() as any;
  const results: Array<{ title: string; url: string; snippet: string }> = [];

  // Abstract
  if (data.Abstract && data.AbstractURL) {
    results.push({
      title: data.Heading || query,
      url: data.AbstractURL,
      snippet: data.Abstract,
    });
  }

  // Related topics
  if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
    for (const topic of data.RelatedTopics) {
      if (results.length >= numResults) break;
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: topic.Text.substring(0, 100),
          url: topic.FirstURL,
          snippet: topic.Text,
        });
      }
      // Nested topics (subtopics)
      if (topic.Topics && Array.isArray(topic.Topics)) {
        for (const sub of topic.Topics) {
          if (results.length >= numResults) break;
          if (sub.Text && sub.FirstURL) {
            results.push({
              title: sub.Text.substring(0, 100),
              url: sub.FirstURL,
              snippet: sub.Text,
            });
          }
        }
      }
    }
  }

  // Results (web results)
  if (data.Results && Array.isArray(data.Results)) {
    for (const r of data.Results) {
      if (results.length >= numResults) break;
      results.push({
        title: r.Text || '',
        url: r.FirstURL || '',
        snippet: r.Text || '',
      });
    }
  }

  // If no results from API, try HTML scraping as last resort
  if (results.length === 0) {
    const htmlResults = await searchDuckDuckGoHtml(query, numResults);
    return htmlResults;
  }

  return results.slice(0, numResults);
}

/**
 * DuckDuckGo HTML scraping fallback
 */
async function searchDuckDuckGoHtml(query: string, numResults: number): Promise<Array<{
  title: string;
  url: string;
  snippet: string;
}>> {
  const encodedQuery = encodeURIComponent(query);
  const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodedQuery}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    return [{
      title: `Search results for: ${query}`,
      url: `https://duckduckgo.com/?q=${encodedQuery}`,
      snippet: `Please visit the link to see search results for "${query}"`,
    }];
  }

  const html = await response.text();
  const results: Array<{ title: string; url: string; snippet: string }> = [];

  // Simple regex-based extraction from DuckDuckGo HTML results
  const resultBlocks = html.match(/<a rel="nofollow" class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g) || [];
  const snippetBlocks = html.match(/<a class="result__snippet"[^>]*>(.*?)<\/a>/g) || [];

  for (let i = 0; i < Math.min(resultBlocks.length, numResults); i++) {
    const urlMatch = resultBlocks[i].match(/href="([^"]*)"/);
    const titleMatch = resultBlocks[i].match(/>([^<]*)</);
    const snippetText = snippetBlocks[i]
      ? snippetBlocks[i].replace(/<[^>]*>/g, '').trim()
      : '';

    let url = urlMatch ? urlMatch[1] : '';
    // DuckDuckGo wraps URLs in redirects, extract actual URL
    if (url.includes('uddg=')) {
      const uddgMatch = url.match(/uddg=([^&]*)/);
      if (uddgMatch) {
        url = decodeURIComponent(uddgMatch[1]);
      }
    }

    results.push({
      title: titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '',
      url: url,
      snippet: snippetText,
    });
  }

  return results;
}

export const toolhouseWebSearchTool = createTool({
  id: 'toolhouse-web-search',
  name: 'Web Search (ToolHouse)',
  slug: 'toolhouse_web_search',
  description: 'Search the web for current information, news, facts, and data. Uses ToolHouse API when configured, falls back to DuckDuckGo. Always returns real search results.',
  category: 'DATA_ACCESS',
  icon: 'search',
  isBuiltin: true,
  timeoutMs: 15000,
  requiresAuth: false,

  inputSchema: {
    type: 'object',
    description: 'Parameters for web search',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to look up',
      },
      numResults: {
        type: 'number',
        description: 'Number of results to return (1-10)',
        default: 5,
      },
    },
    required: ['query'],
  },

  handler: webSearchHandler,
});
