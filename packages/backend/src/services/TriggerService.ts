import { prisma } from '@orchiai/database';
import { BaseService } from './BaseService';
import {
  CreateTriggerDTO,
  UpdateTriggerDTO,
  Trigger,
  TriggerType,
} from '@orchiai/shared';
import { AppError } from '../middleware/errorHandler';
import triggerExecutionHandler from './TriggerExecutionHandler';
import scheduledTriggerManager from './ScheduledTriggerManager';

export class TriggerService extends BaseService {
  constructor() {
    super('TriggerService');
  }

  /**
   * Create a new trigger
   */
  async createTrigger(data: CreateTriggerDTO): Promise<Trigger> {
    this.logger.info({ name: data.name, agentId: data.agentId }, 'Creating new trigger');

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: data.agentId },
    });

    if (!agent) {
      throw new AppError(404, 'Agent not found', 'AGENT_NOT_FOUND');
    }

    // Check if trigger with same name already exists for this agent
    const existing = await prisma.trigger.findFirst({
      where: {
        name: data.name,
        agentId: data.agentId,
      },
    });

    if (existing) {
      throw new AppError(
        409,
        'Trigger with this name already exists for this agent',
        'TRIGGER_ALREADY_EXISTS'
      );
    }

    const trigger = await prisma.trigger.create({
      data: {
        name: data.name,
        type: data.type,
        agentId: data.agentId,
        config: data.config,
        secretToken: data.secretToken,
        isEnabled: data.isEnabled ?? true,
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

    this.logger.info({ triggerId: trigger.id }, 'Trigger created successfully');

    // Schedule trigger if it's a scheduled trigger and enabled
    if (trigger.type === TriggerType.SCHEDULED && trigger.isEnabled) {
      await scheduledTriggerManager.scheduleTrigger(trigger.id, trigger.config as any);
    }

    return trigger as unknown as Trigger;
  }

  /**
   * Get a single trigger by ID
   */
  async getTrigger(id: string): Promise<Trigger> {
    this.logger.info({ triggerId: id }, 'Fetching trigger');

    const trigger = await prisma.trigger.findUnique({
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

    if (!trigger) {
      throw new AppError(404, 'Trigger not found', 'TRIGGER_NOT_FOUND');
    }

    return trigger as unknown as Trigger;
  }

  /**
   * List triggers with optional filtering
   */
  async listTriggers(params: {
    type?: TriggerType;
    agentId?: string;
    isEnabled?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    this.logger.info('Listing triggers');

    const {
      type,
      agentId,
      isEnabled,
      search,
      page = 1,
      limit = 50,
    } = params;

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (agentId) {
      where.agentId = agentId;
    }

    if (isEnabled !== undefined) {
      where.isEnabled = isEnabled;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [triggers, total] = await Promise.all([
      prisma.trigger.findMany({
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
      prisma.trigger.count({ where }),
    ]);

    return {
      data: triggers as unknown as Trigger[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update a trigger
   */
  async updateTrigger(id: string, data: UpdateTriggerDTO): Promise<Trigger> {
    this.logger.info({ triggerId: id }, 'Updating trigger');

    // Check if trigger exists
    const existingTrigger = await this.getTrigger(id);

    // If updating name, check for duplicates within the same agent
    if (data.name) {
      const duplicate = await prisma.trigger.findFirst({
        where: {
          name: data.name,
          agentId: existingTrigger.agentId,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new AppError(
          409,
          'Trigger with this name already exists for this agent',
          'TRIGGER_ALREADY_EXISTS'
        );
      }
    }

    const trigger = await prisma.trigger.update({
      where: { id },
      data: {
        name: data.name,
        config: data.config,
        isEnabled: data.isEnabled,
        secretToken: data.secretToken,
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

    this.logger.info({ triggerId: id }, 'Trigger updated successfully');

    // Reload scheduled triggers if this is a scheduled trigger and config or enabled status changed
    if (trigger.type === TriggerType.SCHEDULED && (data.config !== undefined || data.isEnabled !== undefined)) {
      await scheduledTriggerManager.reload();
    }

    return trigger as unknown as Trigger;
  }

  /**
   * Delete a trigger
   */
  async deleteTrigger(id: string): Promise<void> {
    this.logger.info({ triggerId: id }, 'Deleting trigger');

    const trigger = await this.getTrigger(id);

    await prisma.trigger.delete({
      where: { id },
    });

    // Unschedule if it was a scheduled trigger
    if (trigger.type === TriggerType.SCHEDULED) {
      scheduledTriggerManager.unscheduleTrigger(id);
    }

    this.logger.info({ triggerId: id }, 'Trigger deleted successfully');
  }

  /**
   * Enable a trigger
   */
  async enableTrigger(id: string): Promise<Trigger> {
    this.logger.info({ triggerId: id }, 'Enabling trigger');
    const trigger = await this.updateTrigger(id, { isEnabled: true });

    // Reload scheduled triggers if this is a scheduled trigger
    if (trigger.type === TriggerType.SCHEDULED) {
      await scheduledTriggerManager.reload();
    }

    return trigger;
  }

  /**
   * Disable a trigger
   */
  async disableTrigger(id: string): Promise<Trigger> {
    this.logger.info({ triggerId: id }, 'Disabling trigger');
    const trigger = await this.updateTrigger(id, { isEnabled: false });

    // Reload scheduled triggers if this is a scheduled trigger
    if (trigger.type === TriggerType.SCHEDULED) {
      await scheduledTriggerManager.reload();
    }

    return trigger;
  }

  /**
   * Get triggers by type
   */
  async getTriggersByType(type: TriggerType): Promise<Trigger[]> {
    this.logger.info({ type }, 'Fetching triggers by type');

    const triggers = await prisma.trigger.findMany({
      where: { type },
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

    return triggers as unknown as Trigger[];
  }

  /**
   * Get enabled triggers only
   */
  async getEnabledTriggers(): Promise<Trigger[]> {
    this.logger.info('Fetching enabled triggers');

    const triggers = await prisma.trigger.findMany({
      where: { isEnabled: true },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return triggers as unknown as Trigger[];
  }

  /**
   * Get triggers for a specific agent
   */
  async getTriggersByAgent(agentId: string): Promise<Trigger[]> {
    this.logger.info({ agentId }, 'Fetching triggers for agent');

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new AppError(404, 'Agent not found', 'AGENT_NOT_FOUND');
    }

    const triggers = await prisma.trigger.findMany({
      where: { agentId },
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

    return triggers as unknown as Trigger[];
  }

  /**
   * Handle chat trigger execution
   */
  async handleChatTrigger(
    triggerId: string,
    message: string,
    sessionId?: string,
    userId?: string
  ) {
    return triggerExecutionHandler.handleChatTrigger(triggerId, message, sessionId, userId);
  }

  /**
   * Handle webhook trigger execution
   */
  async handleWebhookTrigger(triggerId: string, payload: any, signature?: string) {
    return triggerExecutionHandler.handleWebhookTrigger(triggerId, payload, signature);
  }

  /**
   * Execute scheduled trigger
   */
  async executeScheduledTrigger(triggerId: string) {
    return triggerExecutionHandler.executeScheduledTrigger(triggerId);
  }

  /**
   * Validate trigger configuration
   */
  async validateTrigger(triggerId: string) {
    return triggerExecutionHandler.validateTrigger(triggerId);
  }
}

export default new TriggerService();

