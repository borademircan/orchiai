import { Agent, AgentConsult, Prisma } from '@orchiai/database';
import {
  CreateAgentDTO,
  UpdateAgentDTO,
  CreateConsultRuleDTO,
  WhenCondition,
  RuntimeInput,
  RuntimeOutput,
} from '@orchiai/shared';
import { BaseService } from './BaseService';
import { AppError } from '../middleware/errorHandler';
import agentRuntime from './AgentRuntime';

export class AgentService extends BaseService {
  constructor() {
    super('AgentService');
  }

  // ============================================
  // AGENT CRUD
  // ============================================

  async createAgent(data: CreateAgentDTO): Promise<Agent> {
    this.logInfo('Creating new agent', { name: data.name });

    // Check if agent with same name already exists
    const existing = await this.prisma.agent.findFirst({
      where: { name: data.name },
    });

    if (existing) {
      throw new AppError(409, 'Agent with this name already exists', 'AGENT_ALREADY_EXISTS');
    }

    try {
      const agent = await this.prisma.agent.create({
        data: {
          name: data.name,
          instructions: data.instructions,
          modelId: data.modelId,
          memoryStrategy: data.memoryStrategy || 'MANUAL_ONLY',
          memoryThreshold: data.memoryThreshold || 100,
          askBeforeSaving: data.askBeforeSaving || false,
        },
        include: {
          model: true,
          consultRules: {
            include: {
              consultedAgent: true,
            },
          },
          tools: {
            include: {
              tool: true,
            },
          },
        },
      });

      this.logInfo('Agent created successfully', { agentId: agent.id });
      return agent;
    } catch (error) {
      this.logError('Failed to create agent', error, { name: data.name });
      throw error;
    }
  }

  async getAgent(id: string): Promise<Agent> {
    this.logInfo('Fetching agent', { agentId: id });

    const agent = await this.prisma.agent.findUnique({
      where: { id },
      include: {
        model: true,
        consultRules: {
          include: {
            consultedAgent: {
              select: {
                id: true,
                name: true,
                instructions: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        tools: {
          include: {
            tool: true,
          },
        },
      },
    });

    if (!agent) {
      throw new AppError(404, 'Agent not found', 'AGENT_NOT_FOUND');
    }

    return agent;
  }

  async listAgents(filters?: {
    isActive?: boolean;
    modelId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    this.logInfo('Listing agents', filters);

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.AgentWhereInput = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.modelId) {
      where.modelId = filters.modelId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { instructions: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [agents, total] = await Promise.all([
      this.prisma.agent.findMany({
        where,
        include: {
          model: true,
          _count: {
            select: {
              consultRules: true,
              tools: true,
              triggers: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.agent.count({ where }),
    ]);

    return {
      agents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateAgent(id: string, data: UpdateAgentDTO): Promise<Agent> {
    this.logInfo('Updating agent', { agentId: id });

    // Verify agent exists
    await this.getAgent(id);

    // If updating name, check for duplicates
    if (data.name) {
      const existing = await this.prisma.agent.findFirst({
        where: {
          name: data.name,
          id: { not: id },
        },
      });

      if (existing) {
        throw new AppError(409, 'Agent with this name already exists', 'AGENT_ALREADY_EXISTS');
      }
    }

    try {
      const agent = await this.prisma.agent.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.instructions && { instructions: data.instructions }),
          ...(data.modelId !== undefined && { modelId: data.modelId }),
          ...(data.memoryStrategy && { memoryStrategy: data.memoryStrategy }),
          ...(data.memoryThreshold !== undefined && {
            memoryThreshold: data.memoryThreshold,
          }),
          ...(data.askBeforeSaving !== undefined && {
            askBeforeSaving: data.askBeforeSaving,
          }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
        include: {
          model: true,
          consultRules: {
            include: {
              consultedAgent: true,
            },
          },
          tools: {
            include: {
              tool: true,
            },
          },
        },
      });

      this.logInfo('Agent updated successfully', { agentId: id });
      return agent;
    } catch (error) {
      this.logError('Failed to update agent', error, { agentId: id });
      throw error;
    }
  }

  async deleteAgent(id: string): Promise<void> {
    this.logInfo('Deleting agent', { agentId: id });

    // Verify agent exists
    await this.getAgent(id);

    try {
      await this.prisma.agent.delete({
        where: { id },
      });

      this.logInfo('Agent deleted successfully', { agentId: id });
    } catch (error) {
      this.logError('Failed to delete agent', error, { agentId: id });
      throw error;
    }
  }

  async activateAgent(id: string): Promise<Agent> {
    return this.updateAgent(id, { isActive: true });
  }

  async deactivateAgent(id: string): Promise<Agent> {
    return this.updateAgent(id, { isActive: false });
  }

  // ============================================
  // CONSULT RULES
  // ============================================

  async addConsultRule(
    agentId: string,
    data: CreateConsultRuleDTO
  ): Promise<AgentConsult> {
    this.logInfo('Adding consult rule', { agentId, consultedAgentId: data.consultedAgentId });

    // Verify both agents exist
    await this.getAgent(agentId);
    await this.getAgent(data.consultedAgentId);

    // Prevent self-consultation
    if (agentId === data.consultedAgentId) {
      throw new AppError(
        400,
        'Agent cannot consult itself',
        'SELF_CONSULTATION_NOT_ALLOWED'
      );
    }

    try {
      const consultRule = await this.prisma.agentConsult.create({
        data: {
          agentId,
          consultedAgentId: data.consultedAgentId,
          whenCondition: data.whenCondition,
          conditionalRule: data.conditionalRule,
          purpose: data.purpose,
          order: data.order,
        },
        include: {
          consultedAgent: true,
        },
      });

      this.logInfo('Consult rule added successfully', {
        consultRuleId: consultRule.id,
      });

      return consultRule;
    } catch (error) {
      this.logError('Failed to add consult rule', error, { agentId });
      throw error;
    }
  }

  async getConsultRules(agentId: string): Promise<AgentConsult[]> {
    this.logInfo('Fetching consult rules', { agentId });

    // Verify agent exists
    await this.getAgent(agentId);

    const rules = await this.prisma.agentConsult.findMany({
      where: { agentId },
      include: {
        consultedAgent: {
          select: {
            id: true,
            name: true,
            instructions: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    return rules;
  }

  async updateConsultRule(
    id: string,
    data: Partial<CreateConsultRuleDTO>
  ): Promise<AgentConsult> {
    this.logInfo('Updating consult rule', { consultRuleId: id });

    try {
      const rule = await this.prisma.agentConsult.update({
        where: { id },
        data: {
          ...(data.whenCondition && { whenCondition: data.whenCondition }),
          ...(data.conditionalRule !== undefined && {
            conditionalRule: data.conditionalRule,
          }),
          ...(data.purpose && { purpose: data.purpose }),
          ...(data.order !== undefined && { order: data.order }),
        },
        include: {
          consultedAgent: true,
        },
      });

      this.logInfo('Consult rule updated successfully', { consultRuleId: id });
      return rule;
    } catch (error) {
      this.logError('Failed to update consult rule', error, { consultRuleId: id });
      throw error;
    }
  }

  async removeConsultRule(id: string): Promise<void> {
    this.logInfo('Removing consult rule', { consultRuleId: id });

    try {
      await this.prisma.agentConsult.delete({
        where: { id },
      });

      this.logInfo('Consult rule removed successfully', { consultRuleId: id });
    } catch (error) {
      this.logError('Failed to remove consult rule', error, { consultRuleId: id });
      throw error;
    }
  }

  async reorderConsultRules(agentId: string, ruleIds: string[]): Promise<void> {
    this.logInfo('Reordering consult rules', { agentId, count: ruleIds.length });

    try {
      // Update each rule's order based on array index
      await Promise.all(
        ruleIds.map((ruleId, index) =>
          this.prisma.agentConsult.update({
            where: { id: ruleId },
            data: { order: index },
          })
        )
      );

      this.logInfo('Consult rules reordered successfully', { agentId });
    } catch (error) {
      this.logError('Failed to reorder consult rules', error, { agentId });
      throw error;
    }
  }

  // ============================================
  // TOOL MANAGEMENT
  // ============================================

  async attachTool(agentId: string, toolId: string): Promise<void> {
    this.logInfo('Attaching tool to agent', { agentId, toolId });

    // Verify agent exists
    await this.getAgent(agentId);

    // Verify tool exists
    const tool = await this.prisma.tool.findUnique({ where: { id: toolId } });
    if (!tool) {
      throw new AppError(404, 'Tool not found', 'TOOL_NOT_FOUND');
    }

    try {
      await this.prisma.agentTool.create({
        data: {
          agentId,
          toolId,
        },
      });

      this.logInfo('Tool attached successfully', { agentId, toolId });
    } catch (error) {
      // Check if already attached
      if ((error as any).code === 'P2002') {
        throw new AppError(
          409,
          'Tool already attached to this agent',
          'TOOL_ALREADY_ATTACHED'
        );
      }
      this.logError('Failed to attach tool', error, { agentId, toolId });
      throw error;
    }
  }

  async detachTool(agentId: string, toolId: string): Promise<void> {
    this.logInfo('Detaching tool from agent', { agentId, toolId });

    try {
      await this.prisma.agentTool.delete({
        where: {
          agentId_toolId: {
            agentId,
            toolId,
          },
        },
      });

      this.logInfo('Tool detached successfully', { agentId, toolId });
    } catch (error) {
      this.logError('Failed to detach tool', error, { agentId, toolId });
      throw error;
    }
  }

  async getAgentTools(agentId: string) {
    this.logInfo('Fetching agent tools', { agentId });

    const tools = await this.prisma.agentTool.findMany({
      where: { agentId },
      include: {
        tool: true,
      },
    });

    return tools.map((at: any) => at.tool);
  }

  // ============================================
  // AGENT CLONING
  // ============================================

  async cloneAgent(id: string, newName: string): Promise<Agent> {
    this.logInfo('Cloning agent', { agentId: id, newName });

    const original = await this.getAgent(id);

    try {
      // Create new agent with same configuration
      const cloned = await this.prisma.agent.create({
        data: {
          name: newName,
          instructions: original.instructions,
          modelId: original.modelId,
          memoryStrategy: original.memoryStrategy,
          memoryThreshold: original.memoryThreshold,
          askBeforeSaving: original.askBeforeSaving,
          isActive: false, // Start inactive
        },
      });

      // Clone consult rules
      const consultRules = await this.getConsultRules(id);
      await Promise.all(
        consultRules.map((rule) =>
          this.prisma.agentConsult.create({
            data: {
              agentId: cloned.id,
              consultedAgentId: rule.consultedAgentId,
              whenCondition: rule.whenCondition,
              conditionalRule: rule.conditionalRule,
              purpose: rule.purpose,
              order: rule.order,
            },
          })
        )
      );

      // Clone tool attachments
      const tools = await this.getAgentTools(id);
      await Promise.all(
        tools.map((tool: any) =>
          this.prisma.agentTool.create({
            data: {
              agentId: cloned.id,
              toolId: tool.id,
            },
          })
        )
      );

      this.logInfo('Agent cloned successfully', {
        originalId: id,
        clonedId: cloned.id,
      });

      return this.getAgent(cloned.id);
    } catch (error) {
      this.logError('Failed to clone agent', error, { agentId: id });
      throw error;
    }
  }

  /**
   * Execute an agent
   */
  async executeAgent(input: RuntimeInput): Promise<RuntimeOutput> {
    this.logInfo('Executing agent', { entryAgentId: input.entryAgentId });

    // Verify agent exists and is active
    const agent = await this.prisma.agent.findUnique({
      where: { id: input.entryAgentId },
    });

    if (!agent) {
      throw new AppError(404, 'Agent not found', 'AGENT_NOT_FOUND');
    }

    if (!agent.isActive) {
      throw new AppError(400, 'Agent is not active', 'AGENT_NOT_ACTIVE');
    }

    // Execute via AgentRuntime
    return agentRuntime.execute(input);
  }

  /**
   * Execute an agent with streaming progress updates
   */
  async executeAgentStream(
    input: RuntimeInput,
    onEvent: (event: any) => void
  ): Promise<void> {
    this.logInfo('Executing agent with streaming', { entryAgentId: input.entryAgentId });

    // Verify agent exists and is active
    const agent = await this.prisma.agent.findUnique({
      where: { id: input.entryAgentId },
    });

    if (!agent) {
      throw new AppError(404, 'Agent not found', 'AGENT_NOT_FOUND');
    }

    if (!agent.isActive) {
      throw new AppError(400, 'Agent is not active', 'AGENT_NOT_ACTIVE');
    }

    // Execute via AgentRuntime with streaming
    return agentRuntime.executeStream(input, onEvent);
  }

  /**
   * FRONTEND-DRIVEN ORCHESTRATION METHODS
   */

  /**
   * Plan which agents to consult
   */
  async planConsultations(input: RuntimeInput) {
    this.logInfo('Planning consultations', { entryAgentId: input.entryAgentId });
    return agentRuntime.planConsultations(input);
  }

  /**
   * Execute a single consultation
   */
  async executeConsultation(params: {
    agentId: string;
    question: string;
    context: Record<string, any>;
    sessionId?: string;
  }) {
    this.logInfo('Executing consultation', { agentId: params.agentId });
    return agentRuntime.executeConsultation(params);
  }

  /**
   * Synthesize final response from consultations
   */
  async synthesizeFinalResponse(params: {
    agentId: string;
    userMessage: string;
    consultations: Array<{
      agentName: string;
      purpose: string;
      response: string;
    }>;
    context: Record<string, any>;
    sessionId?: string;
  }) {
    this.logInfo('Synthesizing final response', { agentId: params.agentId });
    return agentRuntime.synthesizeFinalResponse(params);
  }

  /**
   * Handle conversational message with @mentions and orchestrator guidance
   */
  async handleConversationalMessage(params: {
    message: string;
    sessionId: string;
    agentId: string;
    conversationHistory: Array<{
      role: string;
      content: string;
      metadata?: Record<string, any>;
    }>;
    autoMode: boolean;
    orchestrationMode?: 'FLOW' | 'QA';
  }) {
    this.logInfo('Handling conversational message', {
      agentId: params.agentId,
      autoMode: params.autoMode,
      orchestrationMode: params.orchestrationMode,
      hasAt: params.message.includes('@')
    });
    return agentRuntime.handleConversationalMessage(params);
  }

  /**
   * Handle conversational message with streaming support (SSE)
   */
  async handleConversationalMessageStream(
    params: {
      message: string;
      sessionId: string;
      agentId: string;
      conversationHistory: Array<{
        role: string;
        content: string;
        metadata?: Record<string, any>;
      }>;
      autoMode: boolean;
      orchestrationMode?: 'FLOW' | 'QA';
    },
    onEvent: (event: any) => void
  ) {
    this.logInfo('Handling conversational message with streaming', {
      agentId: params.agentId,
      autoMode: params.autoMode,
      orchestrationMode: params.orchestrationMode,
      hasAt: params.message.includes('@')
    });
    return agentRuntime.handleConversationalMessageStream(params, onEvent);
  }
}

export default AgentService;
