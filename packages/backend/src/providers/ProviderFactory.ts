import { Provider } from '@orchiai/shared';
import { LLMProvider } from './LLMProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { AnthropicProvider } from './AnthropicProvider';
import { GoogleProvider } from './GoogleProvider';
import { CustomProvider } from './CustomProvider';
import providerConnectionService from '../services/ProviderConnectionService';

/**
 * Factory for creating LLM provider instances
 */
export class ProviderFactory {
  /**
   * Create an LLM provider instance from a connection ID and provider type
   * @param connectionId - The ProviderConnection ID
   * @param provider - The provider type (OPENAI, ANTHROPIC, etc.)
   * @returns Promise resolving to LLMProvider instance
   */
  static async createFromConnection(connectionId: string, provider: Provider): Promise<LLMProvider> {
    // Get the connection
    const connection = await providerConnectionService.getConnection(connectionId);

    // Get decrypted API key
    const apiKey = await providerConnectionService.getDecryptedApiKey(connectionId);

    // Use endpoint from connection if available (especially for CUSTOM provider)
    return this.create(provider, apiKey, connection.endpoint);
  }

  /**
   * Create an LLM provider instance
   * @param provider - The provider type
   * @param apiKey - The API key
   * @param baseUrl - Optional custom base URL
   * @returns LLMProvider instance
   */
  static create(provider: Provider, apiKey: string, baseUrl?: string): LLMProvider {
    switch (provider) {
      case Provider.OPENAI:
        return new OpenAIProvider(apiKey, baseUrl);
      
      case Provider.ANTHROPIC:
        return new AnthropicProvider(apiKey, baseUrl);
      
      case Provider.GOOGLE:
        return new GoogleProvider(apiKey, baseUrl);
      
      case Provider.CUSTOM:
        if (!baseUrl) {
          throw new Error('Custom provider requires an endpoint URL');
        }
        return new CustomProvider(apiKey, baseUrl);
      
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Test a provider connection
   * @param provider - The provider type
   * @param apiKey - The API key to test
   * @param baseUrl - Optional custom base URL
   * @returns Promise resolving to true if connection is valid
   */
  static async testConnection(
    provider: Provider,
    apiKey: string,
    baseUrl?: string
  ): Promise<boolean> {
    const providerInstance = this.create(provider, apiKey, baseUrl);
    return providerInstance.testConnection();
  }
}

