import { BaseLLMProvider } from './LLMProvider';
import { CompletionRequest, CompletionResponse, Provider } from '@orchiai/shared';

export class OpenAIProvider extends BaseLLMProvider {
  private defaultModel: string = 'gpt-4';

  constructor(apiKey: string, baseUrl?: string) {
    super(apiKey, baseUrl || 'https://api.openai.com/v1');
  }

  getProviderName(): string {
    return Provider.OPENAI;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const url = `${this.baseUrl}/chat/completions`;

    const model = request.model || this.defaultModel;
    
    // o1/o3/o4/gpt-5 models don't support temperature or max_tokens (reasoning models)
    const isReasoningModel = model.includes('o1') || 
                             model.includes('o3') || 
                             model.includes('o4') ||
                             model.includes('gpt-5');
    
    // Newer models (gpt-4o, gpt-5, etc.) use max_completion_tokens
    // Older models (gpt-3.5-turbo, gpt-4) use max_tokens
    const usesCompletionTokens = model.includes('gpt-4o') || 
                                 model.includes('gpt-5') || 
                                 model.includes('gpt-4-turbo');

    const payload: any = {
      model: model,
      messages: request.messages.map((msg) => ({
        role: msg.role.toLowerCase(),
        content: msg.content,
      })),
      ...(request.tools && { tools: request.tools }),
    };

    // Only add temperature for non-reasoning models
    if (!isReasoningModel) {
      payload.temperature = request.temperature ?? 0.7;
    }

    // Add token limits based on model type
    if (isReasoningModel) {
      payload.max_completion_tokens = request.maxTokens;
    } else if (usesCompletionTokens) {
      payload.max_completion_tokens = request.maxTokens;
    } else {
      payload.max_tokens = request.maxTokens;
    }

    const response = await this.makeRequest(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as any;
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json() as any;

    // Extract content and tool calls from OpenAI response
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error('No choices in OpenAI response');
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
      // Make a minimal test request
      const testRequest: CompletionRequest = {
        messages: [
          { role: 'user', content: 'test' },
        ],
        model: 'gpt-3.5-turbo', // Use cheaper model for testing
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

