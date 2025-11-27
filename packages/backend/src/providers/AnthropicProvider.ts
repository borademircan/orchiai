import { BaseLLMProvider } from './LLMProvider';
import { CompletionRequest, CompletionResponse, Provider } from '@orchiai/shared';

export class AnthropicProvider extends BaseLLMProvider {
  private defaultModel: string = 'claude-3-5-sonnet-20241022';

  constructor(apiKey: string, baseUrl?: string) {
    super(apiKey, baseUrl || 'https://api.anthropic.com/v1');
  }

  getProviderName(): string {
    return Provider.ANTHROPIC;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const url = `${this.baseUrl}/messages`;

    // Convert messages to Anthropic format
    const messages = request.messages.map((msg) => ({
      role: msg.role.toLowerCase() === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    const payload = {
      model: request.model || this.defaultModel,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature ?? 0.7,
      messages: messages,
      ...(request.tools && { tools: request.tools }),
    };

    const response = await this.makeRequest(url, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as any;
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json() as any;

    // Extract content from Anthropic response
    const contentBlock = data.content?.find((block: any) => block.type === 'text');
    const content = contentBlock?.text || '';

    // Extract tool calls if present
    const toolCalls = data.content
      ?.filter((block: any) => block.type === 'tool_use')
      ?.map((block: any) => ({
        id: block.id,
        type: 'function',
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input),
        },
      })) || undefined;

    return {
      content,
      toolCalls,
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens || 0,
        completionTokens: data.usage.output_tokens || 0,
        totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
      } : undefined,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      // Make a minimal test request
      const testRequest: CompletionRequest = {
        messages: [
          { role: 'user', content: 'test' },
        ],
        model: 'claude-3-haiku-20240307', // Use cheaper model for testing
        maxTokens: 5,
      };

      await this.complete(testRequest);
      return true;
    } catch (error: any) {
      // If it's an auth error, connection is invalid
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        return false;
      }
      // Other errors might be network issues, but connection format is valid
      throw error;
    }
  }
}

