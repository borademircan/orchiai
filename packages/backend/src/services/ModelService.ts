import { prisma } from '@orchiai/database';
import { BaseService } from './BaseService';
import {
  CreateModelDTO,
  UpdateModelDTO,
  ModelProfile,
  Provider,
} from '@orchiai/shared';
import { AppError } from '../middleware/errorHandler';
import { ProviderFactory } from '../providers/ProviderFactory';
import providerConnectionService from './ProviderConnectionService';

export class ModelService extends BaseService {
  constructor() {
    super('ModelService');
  }

  /**
   * Create a new model profile
   */
  async createModel(data: CreateModelDTO): Promise<ModelProfile> {
    this.logger.info({ name: data.name }, 'Creating new model');

    // Check if model with same name already exists
    const existing = await prisma.modelProfile.findFirst({
      where: { name: data.name },
    });

    if (existing) {
      throw new AppError(409, 'Model with this name already exists', 'MODEL_ALREADY_EXISTS');
    }

    const model = await prisma.modelProfile.create({
      data: {
        name: data.name,
        provider: data.provider,
        modelId: data.modelId,
        endpoint: data.endpoint,
        temperature: data.temperature ?? 0.7,
        maxTokens: data.maxTokens || 4000,
        connectionId: data.connectionId,
        isActive: data.isActive ?? true,
      },
    });

    this.logger.info({ modelId: model.id }, 'Model created successfully');
    return model as ModelProfile;
  }

  /**
   * Get a single model by ID
   */
  async getModel(id: string): Promise<ModelProfile> {
    this.logger.info({ modelId: id }, 'Fetching model');

    const model = await prisma.modelProfile.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            agents: true,
          },
        },
      },
    });

    if (!model) {
      throw new AppError(404, 'Model not found', 'MODEL_NOT_FOUND');
    }

    return model as unknown as ModelProfile;
  }

  /**
   * List models with optional filtering
   */
  async listModels(params: {
    provider?: Provider;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    this.logger.info('Listing models');

    const {
      provider,
      isActive,
      search,
      page = 1,
      limit = 50,
    } = params;

    const where: any = {};

    if (provider) {
      where.provider = provider;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { modelId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [models, total] = await Promise.all([
      prisma.modelProfile.findMany({
        where,
        include: {
          _count: {
            select: {
              agents: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.modelProfile.count({ where }),
    ]);

    return {
      data: models as unknown as ModelProfile[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a model
   */
  async updateModel(id: string, data: UpdateModelDTO): Promise<ModelProfile> {
    this.logger.info({ modelId: id }, 'Updating model');

    // Check if model exists
    await this.getModel(id);

    // If updating name, check for duplicates
    if (data.name) {
      const existing = await prisma.modelProfile.findFirst({
        where: {
          name: data.name,
          id: { not: id },
        },
      });

      if (existing) {
        throw new AppError(409, 'Model with this name already exists', 'MODEL_ALREADY_EXISTS');
      }
    }

    const model = await prisma.modelProfile.update({
      where: { id },
      data: {
        name: data.name,
        endpoint: data.endpoint,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        isActive: data.isActive,
      },
      include: {
        _count: {
          select: {
            agents: true,
          },
        },
      },
    });

    this.logger.info({ modelId: id }, 'Model updated successfully');
    return model as unknown as ModelProfile;
  }

  /**
   * Delete a model
   */
  async deleteModel(id: string): Promise<void> {
    this.logger.info({ modelId: id }, 'Deleting model');

    const model = await this.getModel(id);

    // Check if any agents are using this model
    const agentCount = await prisma.agent.count({
      where: { modelId: id },
    });

    if (agentCount > 0) {
      throw new AppError(
        400,
        `Cannot delete model. ${agentCount} agent(s) are using this model`,
        'MODEL_IN_USE'
      );
    }

    await prisma.modelProfile.delete({
      where: { id },
    });

    this.logger.info({ modelId: id }, 'Model deleted successfully');
  }

  /**
   * Activate a model
   */
  async activateModel(id: string): Promise<ModelProfile> {
    this.logger.info({ modelId: id }, 'Activating model');
    return this.updateModel(id, { isActive: true });
  }

  /**
   * Deactivate a model
   */
  async deactivateModel(id: string): Promise<ModelProfile> {
    this.logger.info({ modelId: id }, 'Deactivating model');
    return this.updateModel(id, { isActive: false });
  }

  /**
   * Get models by provider
   */
  async getModelsByProvider(provider: Provider): Promise<ModelProfile[]> {
    this.logger.info({ provider }, 'Fetching models by provider');

    const models = await prisma.modelProfile.findMany({
      where: { provider },
      include: {
        _count: {
          select: {
            agents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return models as unknown as ModelProfile[];
  }

  /**
   * Get active models only
   */
  async getActiveModels(): Promise<ModelProfile[]> {
    this.logger.info('Fetching active models');

    const models = await prisma.modelProfile.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            agents: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return models as unknown as ModelProfile[];
  }

  /**
   * Clone a model profile
   */
  async cloneModel(id: string, newName: string): Promise<ModelProfile> {
    this.logger.info({ modelId: id, newName }, 'Cloning model');

    const original = await this.getModel(id);

    // Check if new name already exists
    const existing = await prisma.modelProfile.findFirst({
      where: { name: newName },
    });

    if (existing) {
      throw new AppError(409, 'Model with this name already exists', 'MODEL_ALREADY_EXISTS');
    }

    const cloned = await prisma.modelProfile.create({
      data: {
        name: newName,
        provider: original.provider,
        modelId: original.modelId,
        endpoint: original.endpoint,
        temperature: original.temperature,
        maxTokens: original.maxTokens,
        connectionId: original.connectionId,
        isActive: false, // Clones start inactive
      },
    });

    this.logger.info({ modelId: cloned.id }, 'Model cloned successfully');
    return cloned as ModelProfile;
  }

  /**
   * Test model connection
   * Verifies that the model can connect to its provider
   */
  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    this.logger.info({ modelId: id }, 'Testing model connection');

    const model = await prisma.modelProfile.findUnique({
      where: { id },
      include: {
        connection: true,
      },
    });

    if (!model) {
      throw new AppError(404, 'Model not found', 'MODEL_NOT_FOUND');
    }

    if (!model.connection) {
      throw new AppError(
        400,
        'Model does not have a provider connection configured',
        'NO_CONNECTION_CONFIGURED'
      );
    }

    try {
      // Get decrypted API key
      const apiKey = await providerConnectionService.getDecryptedApiKey(
        model.connection.id
      );

      // Test the connection
      const isValid = await ProviderFactory.testConnection(
        model.provider,
        apiKey,
        model.endpoint || undefined
      );

      if (isValid) {
        this.logger.info({ modelId: id }, 'Model connection test successful');
        return {
          success: true,
          message: 'Connection test successful',
        };
      } else {
        this.logger.warn({ modelId: id }, 'Model connection test failed');
        return {
          success: false,
          message: 'Connection test failed: Invalid API key or credentials',
        };
      }
    } catch (error: any) {
      this.logger.error({ modelId: id, error }, 'Model connection test error');
      return {
        success: false,
        message: `Connection test error: ${error.message || 'Unknown error'}`,
      };
    }
  }
}

export default new ModelService();
