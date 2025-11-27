import { BaseLLMProvider } from './LLMProvider';
import { CompletionRequest, CompletionResponse, Provider } from '@orchiai/shared';

export class GoogleProvider extends BaseLLMProvider {
  private defaultModel: string = 'gemini-2.5-flash';

  constructor(apiKey: string, baseUrl?: string) {
    // If custom endpoint is provided without API version, append v1beta
    let finalUrl = baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    
    // If the baseUrl doesn't end with a version (v1 or v1beta), add v1beta
    if (baseUrl && !baseUrl.includes('/v1beta') && !baseUrl.includes('/v1')) {
      finalUrl = baseUrl.replace(/\/$/, '') + '/v1beta';
    }
    
    super(apiKey, finalUrl);
  }

  getProviderName(): string {
    return Provider.GOOGLE;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    // Google uses different endpoint format: /v1beta/models/{model}:generateContent
    const model = request.model || this.defaultModel;
    const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;
    
    console.log('[GoogleProvider] Complete request:', { model, baseUrl: this.baseUrl, hasApiKey: !!this.apiKey });

    // Convert messages to Google format
    const contents = request.messages.map((msg) => ({
      role: msg.role.toLowerCase() === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const payload = {
      contents: contents,
      generationConfig: {
        temperature: request.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens,
      },
      ...(request.tools && { tools: request.tools }),
    };

    const response = await this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Status ${response.status}: ${response.statusText}`;
      
      try {
        const error = JSON.parse(errorText);
        errorMessage = error.error?.message || error.message || errorText;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(`Google API error: ${errorMessage}`);
    }

    const data = await response.json() as any;

    // Extract content from Google response
    const candidate = data.candidates?.[0];
    if (!candidate) {
      throw new Error('No candidates in Google response');
    }

    const contentParts = candidate.content?.parts || [];
    const content = contentParts
      .filter((part: any) => part.text)
      .map((part: any) => part.text)
      .join('\n') || '';

    // Extract tool calls if present (Google uses function calls)
    const toolCalls = contentParts
      ?.filter((part: any) => part.functionCall)
      ?.map((part: any) => ({
        id: part.functionCall?.name || '',
        type: 'function',
        function: {
          name: part.functionCall?.name,
          arguments: JSON.stringify(part.functionCall?.args || {}),
        },
      })) || undefined;

    return {
      content,
      toolCalls,
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount || 0,
        completionTokens: data.usageMetadata.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata.totalTokenCount || 0,
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
        model: 'gemini-2.5-flash',
        maxTokens: 5,
      };

      await this.complete(testRequest);
      return true;
    } catch (error: any) {
      // If it's an auth error, connection is invalid
      if (error.message?.includes('401') || error.message?.includes('Unauthorized') || error.message?.includes('API key')) {
        return false;
      }
      // Other errors might be network issues, but connection format is valid
      throw error;
    }
  }
}

