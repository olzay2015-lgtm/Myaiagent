import OpenAI from 'openai';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: any[];
  tool_call_id?: string;
}

export interface LLMCompletionOptions {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
  tools?: any[];
}

export interface LLMCompletionResponse {
  id: string;
  content: string;
  role: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  toolCalls?: any[];
  finishReason: string | null;
}

export interface LLMStreamChunk {
  content: string;
  finishReason?: string | null;
}

export class OpenRouterProvider {
  private client: OpenAI;
  private defaultModel: string;

  constructor() {
    this.client = new OpenAI({
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'X-Title': 'AI Agent Platform',
      },
    });

    this.defaultModel = process.env.DEFAULT_MODEL || 'openai/gpt-4o-mini';
  }

  /**
   * Create a completion request
   */
  async createCompletion(options: LLMCompletionOptions): Promise<LLMCompletionResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: options.model || this.defaultModel,
        messages: options.messages as any,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        top_p: options.topP ?? 1.0,
        frequency_penalty: options.frequencyPenalty ?? 0.0,
        presence_penalty: options.presencePenalty ?? 0.0,
        stream: false,
        tools: options.tools,
      });

      const choice = response.choices[0];

      return {
        id: response.id,
        content: choice.message.content || '',
        role: choice.message.role,
        model: response.model,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
        toolCalls: choice.message.tool_calls,
        finishReason: choice.finish_reason,
      };
    } catch (error) {
      console.error('OpenRouter completion error:', error);
      throw new Error(`LLM request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a streaming completion request
   */
  async *createStream(options: LLMCompletionOptions): AsyncGenerator<LLMStreamChunk> {
    try {
      const stream = await this.client.chat.completions.create({
        model: options.model || this.defaultModel,
        messages: options.messages as any,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        top_p: options.topP ?? 1.0,
        frequency_penalty: options.frequencyPenalty ?? 0.0,
        presence_penalty: options.presencePenalty ?? 0.0,
        stream: true,
        tools: options.tools,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const finishReason = chunk.choices[0]?.finish_reason;

        if (delta?.content || finishReason) {
          yield {
            content: delta?.content || '',
            finishReason: finishReason,
          };
        }
      }
    } catch (error) {
      console.error('OpenRouter streaming error:', error);
      throw new Error(`LLM streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get list of available models
   */
  async getModels(): Promise<{ id: string; name: string; contextLength: number }[]> {
    // Hardcoded list of supported models with OpenRouter
    // In production, you could fetch this from OpenRouter API
    return [
      { id: 'openai/gpt-4o', name: 'GPT-4o', contextLength: 128000 },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', contextLength: 128000 },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', contextLength: 200000 },
      { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', contextLength: 200000 },
      { id: 'google/gemini-pro', name: 'Gemini Pro', contextLength: 1000000 },
      { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', contextLength: 128000 },
      { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', contextLength: 128000 },
    ];
  }

  /**
   * Validate API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const openRouterProvider = new OpenRouterProvider();
