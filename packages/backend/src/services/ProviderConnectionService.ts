import { prisma } from '@orchiai/database';
import { BaseService } from './BaseService';
import {
  CreateProviderConnectionDTO,
  UpdateProviderConnectionDTO,
  ProviderConnection,
  Provider,
} from '@orchiai/shared';
import { AppError } from '../middleware/errorHandler';
import { encrypt, decrypt, generateEncryptionKey } from '../utils/encryption';

export class ProviderConnectionService extends BaseService {
  constructor() {
    super('ProviderConnectionService');
  }

  /**
   * Create a new provider connection
   * API keys are encrypted before storage
   */
  async createConnection(
    data: CreateProviderConnectionDTO
  ): Promise<ProviderConnection> {
    this.logger.info({ name: data.name, type: data.type }, 'Creating new provider connection');

    // Check if connection with same name already exists
    const existing = await prisma.providerConnection.findFirst({
      where: { name: data.name },
    });

    if (existing) {
      throw new AppError(
        409,
        'Provider connection with this name already exists',
        'PROVIDER_CONNECTION_ALREADY_EXISTS'
      );
    }

    // Prepare metadata - use credentials if provided, otherwise use metadata
    let credentials: Record<string, any> = data.credentials || data.metadata || {};
    
    // For backward compatibility: if apiKey is provided, store it separately
    let encryptedApiKey = '';
    let encryptionKey = '';
    
    if (data.apiKey) {
      encryptionKey = generateEncryptionKey();
      encryptedApiKey = encrypt(data.apiKey, encryptionKey);
    } else if (credentials.apiKey) {
      // If apiKey is in credentials/metadata, encrypt it
      encryptionKey = generateEncryptionKey();
      encryptedApiKey = encrypt(credentials.apiKey, encryptionKey);
      // Remove apiKey from metadata to avoid duplication
      const { apiKey: _, ...restCredentials } = credentials;
      credentials = restCredentials;
    } else {
      // Generate encryption key even if no apiKey (for future use)
      encryptionKey = generateEncryptionKey();
      encryptedApiKey = 'N/A'; // Placeholder
    }

    const connection = await prisma.providerConnection.create({
      data: {
        name: data.name,
        type: data.type || null,
        apiKey: encryptedApiKey,
        encryptionKey: encryptionKey,
        endpoint: data.endpoint || credentials.endpoint || null,
        metadata: Object.keys(credentials).length > 0 ? credentials : {},
      },
    });

    this.logger.info({ connectionId: connection.id }, 'Provider connection created successfully');

    // Return connection without exposing encryption key in response
    return {
      id: connection.id,
      name: connection.name,
      type: connection.type || undefined,
      apiKey: '[ENCRYPTED]', // Never return actual API key
      encryptionKey: '[REDACTED]', // Never return encryption key
      endpoint: connection.endpoint || undefined,
      metadata: connection.metadata as Record<string, any> | undefined,
    } as ProviderConnection;
  }

  /**
   * Get a single provider connection by ID
   * API key is never returned in response
   */
  async getConnection(id: string): Promise<ProviderConnection> {
    this.logger.info({ connectionId: id }, 'Fetching provider connection');

    const connection = await prisma.providerConnection.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            models: true,
          },
        },
      },
    });

    if (!connection) {
      throw new AppError(
        404,
        'Provider connection not found',
        'PROVIDER_CONNECTION_NOT_FOUND'
      );
    }

    return {
      id: connection.id,
      name: connection.name,
      type: connection.type || undefined,
      apiKey: '[ENCRYPTED]',
      encryptionKey: '[REDACTED]',
      endpoint: connection.endpoint || undefined,
      metadata: connection.metadata as Record<string, any> | undefined,
    } as ProviderConnection;
  }

  /**
   * List provider connections with optional filtering
   */
  async listConnections(params: {
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    this.logger.info('Listing provider connections');

    const { type, search, page = 1, limit = 50 } = params;

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [connections, total] = await Promise.all([
      prisma.providerConnection.findMany({
        where,
        include: {
          _count: {
            select: {
              models: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.providerConnection.count({ where }),
    ]);

    // Sanitize connections (never return API keys)
    const sanitizedConnections = connections.map((conn: any) => ({
      id: conn.id,
      name: conn.name,
      type: conn.type || undefined,
      apiKey: '[ENCRYPTED]',
      encryptionKey: '[REDACTED]',
      endpoint: conn.endpoint || undefined,
      metadata: conn.metadata,
      _count: conn._count,
    }));

    return {
      data: sanitizedConnections as unknown as ProviderConnection[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a provider connection
   * If apiKey is provided, it will be re-encrypted
   */
  async updateConnection(
    id: string,
    data: UpdateProviderConnectionDTO
  ): Promise<ProviderConnection> {
    this.logger.info({ connectionId: id }, 'Updating provider connection');

    const existing = await prisma.providerConnection.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError(
        404,
        'Provider connection not found',
        'PROVIDER_CONNECTION_NOT_FOUND'
      );
    }

    // Check for duplicate name if name is being updated
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.providerConnection.findFirst({
        where: {
          name: data.name,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new AppError(
          409,
          'Provider connection with this name already exists',
          'PROVIDER_CONNECTION_ALREADY_EXISTS'
        );
      }
    }

    const updateData: any = {};

    if (data.name) {
      updateData.name = data.name;
    }

    if (data.metadata !== undefined) {
      updateData.metadata = data.metadata;
    }

    if (data.type !== undefined) {
      updateData.type = data.type || null;
    }

    if (data.endpoint !== undefined) {
      updateData.endpoint = data.endpoint || null;
    }

    // If API key is being updated, re-encrypt it
    if (data.apiKey) {
      const encryptionKey = generateEncryptionKey();
      const encryptedApiKey = encrypt(data.apiKey, encryptionKey);
      updateData.apiKey = encryptedApiKey;
      updateData.encryptionKey = encryptionKey;
    }

    const connection = await prisma.providerConnection.update({
      where: { id },
      data: updateData,
    });

    this.logger.info({ connectionId: connection.id }, 'Provider connection updated successfully');

    return {
      id: connection.id,
      name: connection.name,
      type: connection.type || undefined,
      apiKey: '[ENCRYPTED]',
      encryptionKey: '[REDACTED]',
      endpoint: connection.endpoint || undefined,
      metadata: connection.metadata as Record<string, any> | undefined,
    } as ProviderConnection;
  }

  /**
   * Delete a provider connection
   * Prevents deletion if models are using it
   */
  async deleteConnection(id: string): Promise<void> {
    this.logger.info({ connectionId: id }, 'Deleting provider connection');

    const connection = await prisma.providerConnection.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            models: true,
          },
        },
      },
    });

    if (!connection) {
      throw new AppError(
        404,
        'Provider connection not found',
        'PROVIDER_CONNECTION_NOT_FOUND'
      );
    }

    if (connection._count.models > 0) {
      throw new AppError(
        409,
        `Cannot delete provider connection: ${connection._count.models} model(s) are using it`,
        'PROVIDER_CONNECTION_IN_USE'
      );
    }

    await prisma.providerConnection.delete({
      where: { id },
    });

    this.logger.info({ connectionId: id }, 'Provider connection deleted successfully');
  }

  /**
   * Get connections by provider
   */
  async getConnectionsByType(type: string): Promise<ProviderConnection[]> {
    this.logger.info({ type }, 'Fetching connections by type');

    const connections = await prisma.providerConnection.findMany({
      where: { type },
      orderBy: { name: 'asc' },
    });

    return connections.map((conn: any) => ({
      id: conn.id,
      name: conn.name,
      type: conn.type || undefined,
      apiKey: '[ENCRYPTED]',
      encryptionKey: '[REDACTED]',
      endpoint: conn.endpoint || undefined,
      metadata: conn.metadata as Record<string, any> | undefined,
    })) as ProviderConnection[];
  }

  /**
   * Get decrypted API key for internal use (e.g., making API calls)
   * This should only be used internally, never exposed via API
   */
  async getDecryptedApiKey(connectionId: string): Promise<string> {
    const connection = await prisma.providerConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new AppError(
        404,
        'Provider connection not found',
        'PROVIDER_CONNECTION_NOT_FOUND'
      );
    }

    return decrypt(connection.apiKey, connection.encryptionKey);
  }

  /**
   * Test a provider connection with given credentials
   * Used before saving to verify API key validity
   */
  async testConnection(
    type: string | undefined,
    apiKey: string,
    endpoint?: string
  ): Promise<{ success: boolean; message: string }> {
    this.logger.info({ type, endpoint }, 'Testing provider connection');

    try {
      // Auto-detect LLM provider from endpoint URL if type is not specified or is 'apiKey'
      let detectedType = type;
      if ((!type || type === 'apiKey') && endpoint) {
        if (endpoint.includes('openai.com')) {
          detectedType = 'OPENAI';
        } else if (endpoint.includes('anthropic.com')) {
          detectedType = 'ANTHROPIC';
        } else if (endpoint.includes('googleapis.com') || endpoint.includes('generativelanguage.googleapis.com')) {
          detectedType = 'GOOGLE';
        }
      }

      // For LLM providers, use ProviderFactory
      if (detectedType && ['OPENAI', 'ANTHROPIC', 'GOOGLE', 'CUSTOM'].includes(detectedType.toUpperCase())) {
        const { ProviderFactory } = await import('../providers/ProviderFactory');
        const { Provider } = await import('@orchiai/shared');

        // Map type to Provider enum for LLM connections
        const providerMap: Record<string, any> = {
          'OPENAI': Provider.OPENAI,
          'ANTHROPIC': Provider.ANTHROPIC,
          'GOOGLE': Provider.GOOGLE,
          'CUSTOM': Provider.CUSTOM,
        };

        const provider = providerMap[detectedType.toUpperCase()];
        if (provider) {
          const isValid = await ProviderFactory.testConnection(
            provider,
            apiKey,
            endpoint
          );

          if (isValid) {
            this.logger.info({ type: detectedType }, 'Provider connection test successful');
            return {
              success: true,
              message: 'Connection test successful',
            };
          } else {
            this.logger.warn({ type: detectedType }, 'Provider connection test failed');
            return {
              success: false,
              message: 'Connection test failed: Invalid API key or credentials',
            };
          }
        }
      }

      // For generic connections, just verify endpoint is reachable if provided
      if (endpoint) {
        try {
          const response = await fetch(endpoint, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000),
          });
          return {
            success: response.ok,
            message: response.ok
              ? 'Endpoint is reachable'
              : `Endpoint returned status ${response.status}`,
          };
        } catch (error: any) {
          return {
            success: false,
            message: `Connection test error: ${error.message || 'Unknown error'}`,
          };
        }
      }

      // If no endpoint and not an LLM provider, just verify API key is provided
      return {
        success: true,
        message: 'Connection credentials saved (no test performed)',
      };
    } catch (error: any) {
      this.logger.error({ type, error }, 'Provider connection test error');
      return {
        success: false,
        message: `Connection test error: ${error.message || 'Unknown error'}`,
      };
    }
  }
}

export default new ProviderConnectionService();

