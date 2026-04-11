/**
 * ToolHouse API Client
 * Connects to ToolHouse platform for tool execution.
 * Falls back to built-in implementations when TOOLHOUSE_API_KEY is not set.
 */

export interface ToolHouseConfig {
  apiKey?: string;
  bundle?: string;
  baseUrl?: string;
}

export interface ToolHouseToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export class ToolHouseClient {
  private apiKey: string | undefined;
  private bundle: string;
  private baseUrl: string;

  constructor(config?: ToolHouseConfig) {
    this.apiKey = config?.apiKey || process.env.TOOLHOUSE_API_KEY;
    this.bundle = config?.bundle || process.env.TOOLHOUSE_BUNDLE || 'default';
    this.baseUrl = config?.baseUrl || 'https://api.toolhouse.ai/v1';
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Fetch available tools from ToolHouse platform
   */
  async getTools(): Promise<ToolHouseToolDef[]> {
    if (!this.apiKey) return [];

    try {
      const response = await fetch(`${this.baseUrl}/tools`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`ToolHouse API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      return data.tools || [];
    } catch (error) {
      console.warn('ToolHouse API unavailable, using built-in tools:', error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * Execute a tool call via ToolHouse platform
   */
  async executeToolCall(toolName: string, args: Record<string, unknown>): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
  }> {
    if (!this.apiKey) {
      return { success: false, error: 'ToolHouse API key not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/tool_calls`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: toolName,
          arguments: args,
          bundle: this.bundle,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return { success: false, error: `ToolHouse API error: ${response.status} — ${errorBody}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'ToolHouse execution failed',
      };
    }
  }
}

// Singleton
export const toolHouseClient = new ToolHouseClient();
