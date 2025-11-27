import { prisma } from '@orchiai/database';
import { BaseService } from './BaseService';
import {
  CreateToolDTO,
  UpdateToolDTO,
  Tool,
  ToolType,
} from '@orchiai/shared';
import { AppError } from '../middleware/errorHandler';
import toolExecutionEngine, { ToolExecutionResult } from './ToolExecutionEngine';

export class ToolService extends BaseService {
  constructor() {
    super('ToolService');
  }

  /**
   * Create a new tool
   */
  async createTool(data: CreateToolDTO): Promise<Tool> {
    this.logger.info({ name: data.name }, 'Creating new tool');

    // Check if tool with same name already exists
    const existing = await prisma.tool.findFirst({
      where: { name: data.name },
    });

    if (existing) {
      throw new AppError(409, 'Tool with this name already exists', 'TOOL_ALREADY_EXISTS');
    }

    const tool = await prisma.tool.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        endpoint: data.endpoint,
        method: data.method || 'POST',
        schema: data.schema,
        connectionId: data.connectionId,
        isActive: data.isActive ?? true,
      },
    });

    this.logger.info({ toolId: tool.id }, 'Tool created successfully');
    return tool as Tool;
  }

  /**
   * Get a single tool by ID
   */
  async getTool(id: string): Promise<Tool> {
    this.logger.info({ toolId: id }, 'Fetching tool');

    const tool = await prisma.tool.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            agents: true,
          },
        },
      },
    });

    if (!tool) {
      throw new AppError(404, 'Tool not found', 'TOOL_NOT_FOUND');
    }

    return tool as unknown as Tool;
  }

  /**
   * List tools with optional filtering
   */
  async listTools(params: {
    type?: ToolType;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    this.logger.info('Listing tools');

    const {
      type,
      isActive,
      search,
      page = 1,
      limit = 50,
    } = params;

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tools, total] = await Promise.all([
      prisma.tool.findMany({
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
      prisma.tool.count({ where }),
    ]);

    return {
      data: tools as unknown as Tool[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a tool
   */
  async updateTool(id: string, data: UpdateToolDTO): Promise<Tool> {
    this.logger.info({ toolId: id }, 'Updating tool');

    // Check if tool exists
    await this.getTool(id);

    // If updating name, check for duplicates
    if (data.name) {
      const existing = await prisma.tool.findFirst({
        where: {
          name: data.name,
          id: { not: id },
        },
      });

      if (existing) {
        throw new AppError(409, 'Tool with this name already exists', 'TOOL_ALREADY_EXISTS');
      }
    }

    const tool = await prisma.tool.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        endpoint: data.endpoint,
        method: data.method,
        schema: data.schema,
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

    this.logger.info({ toolId: id }, 'Tool updated successfully');
    return tool as unknown as Tool;
  }

  /**
   * Delete a tool
   */
  async deleteTool(id: string): Promise<void> {
    this.logger.info({ toolId: id }, 'Deleting tool');

    const tool = await this.getTool(id);

    // Check if any agents are using this tool
    const agentCount = await prisma.agentTool.count({
      where: { toolId: id },
    });

    if (agentCount > 0) {
      throw new AppError(
        400,
        `Cannot delete tool. ${agentCount} agent(s) are using this tool`,
        'TOOL_IN_USE'
      );
    }

    await prisma.tool.delete({
      where: { id },
    });

    this.logger.info({ toolId: id }, 'Tool deleted successfully');
  }

  /**
   * Activate a tool
   */
  async activateTool(id: string): Promise<Tool> {
    this.logger.info({ toolId: id }, 'Activating tool');
    return this.updateTool(id, { isActive: true });
  }

  /**
   * Deactivate a tool
   */
  async deactivateTool(id: string): Promise<Tool> {
    this.logger.info({ toolId: id }, 'Deactivating tool');
    return this.updateTool(id, { isActive: false });
  }

  /**
   * Get tools by type
   */
  async getToolsByType(type: ToolType): Promise<Tool[]> {
    this.logger.info({ type }, 'Fetching tools by type');

    const tools = await prisma.tool.findMany({
      where: { type },
      include: {
        _count: {
          select: {
            agents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tools as unknown as Tool[];
  }

  /**
   * Get active tools only
   */
  async getActiveTools(): Promise<Tool[]> {
    this.logger.info('Fetching active tools');

    const tools = await prisma.tool.findMany({
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

    return tools as unknown as Tool[];
  }

  /**
   * Execute a tool with given parameters
   */
  async executeTool(
    toolId: string,
    parameters: Record<string, any>
  ): Promise<ToolExecutionResult> {
    this.logger.info({ toolId }, 'Executing tool');

    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
    });

    if (!tool) {
      throw new AppError(404, 'Tool not found', 'TOOL_NOT_FOUND');
    }

    return toolExecutionEngine.executeTool(tool as Tool & { isActive?: boolean }, parameters);
  }

  /**
   * Test tool connection
   * Verifies that the tool endpoint is accessible
   */
  async testConnection(toolId: string): Promise<{ success: boolean; message: string }> {
    this.logger.info({ toolId }, 'Testing tool connection');

    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
    });

    if (!tool) {
      throw new AppError(404, 'Tool not found', 'TOOL_NOT_FOUND');
    }

    return toolExecutionEngine.testConnection(tool as Tool & { isActive?: boolean });
  }
}

export default new ToolService();
