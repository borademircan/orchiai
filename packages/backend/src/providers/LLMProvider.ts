import { CompletionRequest, CompletionResponse } from '@orchiai/shared';

/**
 * Unified LLM Provider Interface
 * All provider implementations must conform to this interface
 */
export interface LLMProvider {
  /**
   * Get the provider name
   */
  getProviderName(): string;

  /**
   * Complete a chat completion request
   * @param request - The completion request
   * @returns Promise resolving to completion response
   */
  complete(request: CompletionRequest): Promise<CompletionResponse>;

  /**
   * Test the connection to the provider
   * @returns Promise resolving to true if connection is valid
   */
  testConnection(): Promise<boolean>;
}

/**
 * Base class for LLM providers with common functionality
 */
export abstract class BaseLLMProvider implements LLMProvider {
  protected apiKey: string;
  protected baseUrl?: string;
  protected timeout: number;

  constructor(apiKey: string, baseUrl?: string, timeout: number = 120000) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  abstract getProviderName(): string;
  abstract complete(request: CompletionRequest): Promise<CompletionResponse>;
  abstract testConnection(): Promise<boolean>;

  /**
   * Make HTTP request with error handling
   */
  protected async makeRequest(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }
}

