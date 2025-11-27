import { prisma } from '@orchiai/database';
import { BaseService } from './BaseService';
import {
  CreateMemoryDTO,
  UpdateMemoryDTO,
  MemoryItem,
  MemoryType,
} from '@orchiai/shared';
import { AppError } from '../middleware/errorHandler';
import memorySummarizer from './MemorySummarizer';

export class MemoryService extends BaseService {
  constructor() {
    super('MemoryService');
  }

  /**
   * Create a new memory item
   */
  async createMemory(data: CreateMemoryDTO): Promise<MemoryItem> {
    this.logger.info({ agentId: data.agentId, type: data.type }, 'Creating new memory item');

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: data.agentId },
    });

    if (!agent) {
      throw new AppError(404, 'Agent not found', 'AGENT_NOT_FOUND');
    }

    // Parse expiresAt if provided as string
    const expiresAt = data.expiresAt
      ? typeof data.expiresAt === 'string'
        ? new Date(data.expiresAt)
        : data.expiresAt
      : undefined;

    const memory = await prisma.memoryItem.create({
      data: {
        agentId: data.agentId,
        type: data.type,
        content: data.content,
        metadata: data.metadata,
        expiresAt,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.info({ memoryId: memory.id }, 'Memory item created successfully');
    return memory as unknown as MemoryItem;
  }

  /**
   * Get a single memory item by ID
   */
  async getMemory(id: string): Promise<MemoryItem> {
    this.logger.info({ memoryId: id }, 'Fetching memory item');

    const memory = await prisma.memoryItem.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!memory) {
      throw new AppError(404, 'Memory item not found', 'MEMORY_NOT_FOUND');
    }

    return memory as unknown as MemoryItem;
  }

  /**
   * List memory items with optional filtering
   */
  async listMemories(params: {
    agentId?: string;
    type?: MemoryType;
    includeExpired?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    this.logger.info('Listing memory items');

    const {
      agentId,
      type,
      includeExpired = false,
      search,
      page = 1,
      limit = 50,
    } = params;

    const where: any = {};

    if (agentId) {
      where.agentId = agentId;
    }

    if (type) {
      where.type = type;
    }

    if (!includeExpired) {
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ];
    }

    if (search) {
      where.content = { contains: search, mode: 'insensitive' };
    }

    const [memories, total] = await Promise.all([
      prisma.memoryItem.findMany({
        where,
        include: {
          agent: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.memoryItem.count({ where }),
    ]);

    return {
      data: memories as unknown as MemoryItem[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a memory item
   */
  async updateMemory(id: string, data: UpdateMemoryDTO): Promise<MemoryItem> {
    this.logger.info({ memoryId: id }, 'Updating memory item');

    // Check if memory exists
    await this.getMemory(id);

    // Parse expiresAt if provided
    let expiresAt = data.expiresAt;
    if (expiresAt !== undefined) {
      if (expiresAt === null) {
        expiresAt = null;
      } else {
        expiresAt = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
      }
    }

    const memory = await prisma.memoryItem.update({
      where: { id },
      data: {
        content: data.content,
        metadata: data.metadata,
        expiresAt: expiresAt !== undefined ? expiresAt : undefined,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.info({ memoryId: id }, 'Memory item updated successfully');
    return memory as unknown as MemoryItem;
  }

  /**
   * Delete a memory item
   */
  async deleteMemory(id: string): Promise<void> {
    this.logger.info({ memoryId: id }, 'Deleting memory item');

    await this.getMemory(id);

    await prisma.memoryItem.delete({
      where: { id },
    });

    this.logger.info({ memoryId: id }, 'Memory item deleted successfully');
  }

  /**
   * Get memory items by agent
   */
  async getMemoriesByAgent(agentId: string, includeExpired: boolean = false): Promise<MemoryItem[]> {
    this.logger.info({ agentId }, 'Fetching memory items for agent');

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new AppError(404, 'Agent not found', 'AGENT_NOT_FOUND');
    }

    const where: any = { agentId };

    if (!includeExpired) {
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ];
    }

    const memories = await prisma.memoryItem.findMany({
      where,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return memories as unknown as MemoryItem[];
  }

  /**
   * Get memory items by type
   */
  async getMemoriesByType(type: MemoryType, includeExpired: boolean = false): Promise<MemoryItem[]> {
    this.logger.info({ type }, 'Fetching memory items by type');

    const where: any = { type };

    if (!includeExpired) {
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ];
    }

    const memories = await prisma.memoryItem.findMany({
      where,
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return memories as unknown as MemoryItem[];
  }

  /**
   * Get expired memory items
   */
  async getExpiredMemories(): Promise<MemoryItem[]> {
    this.logger.info('Fetching expired memory items');

    const memories = await prisma.memoryItem.findMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { expiresAt: 'desc' },
    });

    return memories as unknown as MemoryItem[];
  }

  /**
   * Delete expired memory items
   */
  async deleteExpiredMemories(): Promise<number> {
    this.logger.info('Deleting expired memory items');

    const result = await prisma.memoryItem.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });

    this.logger.info({ count: result.count }, 'Expired memory items deleted');
    return result.count;
  }

  /**
   * Get active (non-expired) memory items for an agent
   */
  async getActiveMemoriesByAgent(agentId: string): Promise<MemoryItem[]> {
    this.logger.info({ agentId }, 'Fetching active memory items for agent');

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new AppError(404, 'Agent not found', 'AGENT_NOT_FOUND');
    }

    const memories = await prisma.memoryItem.findMany({
      where: {
        agentId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return memories as unknown as MemoryItem[];
  }

  /**
   * Check if memory should be summarized for an agent
   */
  async shouldSummarize(agentId: string, threshold: number): Promise<boolean> {
    return memorySummarizer.shouldSummarize(agentId, threshold);
  }

  /**
   * Summarize memories for an agent
   */
  async summarizeMemory(agentId: string): Promise<string> {
    return memorySummarizer.summarizeMemory(agentId);
  }

  /**
   * Get memory context (includes summaries if available)
   */
  async getMemoryContext(agentId: string, limit: number = 10): Promise<string> {
    return memorySummarizer.getMemoryContext(agentId, limit);
  }

  /**
   * Approve pending memory (for ASK_USER strategy)
   */
  async approveMemory(agentId: string, content: string): Promise<MemoryItem> {
    this.logger.info({ agentId }, 'Approving memory for ASK_USER strategy');

    return this.createMemory({
      agentId,
      type: MemoryType.SHORT_TERM,
      content,
      metadata: {
        approved: true,
        approvedAt: new Date().toISOString(),
      },
    });
  }
}

export default new MemoryService();

