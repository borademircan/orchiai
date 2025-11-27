import { BaseLLMProvider } from './LLMProvider';
import { CompletionRequest, CompletionResponse, Provider } from '@orchiai/shared';

/**
 * Custom LLM Provider for OpenAI-compatible APIs
 * Supports any endpoint that implements the OpenAI chat completions API format
 */
export class CustomProvider extends BaseLLMProvider {
  private defaultModel: string = 'gpt-3.5-turbo';

  constructor(apiKey: string, baseUrl: string) {
    if (!baseUrl) {
      throw new Error('CustomProvider requires a base URL');
    }
    super(apiKey, baseUrl);
  }

  getProviderName(): string {
    return Provider.CUSTOM;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // Ensure base URL ends with /chat/completions or append it
    const url = this.baseUrl!.endsWith('/chat/completions')
      ? this.baseUrl!
      : `${this.baseUrl}/chat/completions`;

    const payload = {
      model: request.model || this.defaultModel,
      messages: request.messages.map((msg) => ({
        role: msg.role.toLowerCase(),
        content: msg.content,
      })),
      temperature: request.temperature ?? 0.7,
      max_tokens: request.maxTokens,
      ...(request.tools && { tools: request.tools }),
    };

    const response = await this.makeRequest(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as any;
      throw new Error(`Custom Provider API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json() as any;

    // Extract content and tool calls from OpenAI-compatible response
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error('No choices in Custom Provider response');
    }

    const content = choice.message?.content || '';
    const toolCalls = choice.message?.tool_calls?.map((tc: any) => ({
      id: tc.id,
      type: tc.type,
      function: {
        name: tc.function?.name,
        arguments: tc.function?.arguments,
      },
    })) || undefined;

    return {
      content,
      toolCalls,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      } : undefined,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test with a minimal completion request
      const testRequest: CompletionRequest = {
        model: this.defaultModel,
        messages: [
          {
            role: 'user' as any,
            content: 'Hi',
          },
        ],
        maxTokens: 10,
      };

      await this.complete(testRequest);
      return true;
    } catch (error) {
      console.error('Custom provider connection test failed:', error);
      return false;
    }
  }
}
