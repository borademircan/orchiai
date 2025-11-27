import { prisma } from '@orchiai/database';
import { Trigger, TriggerType, RuntimeInput } from '@orchiai/shared';
import { AppError } from '../middleware/errorHandler';
import logger from '../config/logger';
import crypto from 'crypto';
import agentRuntime from './AgentRuntime';

export interface TriggerExecutionResult {
  success: boolean;
  response?: any;
  error?: string;
  executionTimeMs: number;
}

/**
 * Trigger Execution Handler
 * Handles execution of different trigger types (CHAT, WEBHOOK, SCHEDULED)
 * 
 * Note: This will integrate with AgentRuntime once it's implemented
 */
export class TriggerExecutionHandler {
  /**
   * Handle chat trigger execution
   * @param triggerId - The trigger ID
   * @param message - The user message
   * @param sessionId - Optional session ID
   * @param userId - Optional user ID
   */
  async handleChatTrigger(
    triggerId: string,
    message: string,
    sessionId?: string,
    userId?: string
  ): Promise<TriggerExecutionResult> {
    const startTime = Date.now();
    logger.info({ triggerId, sessionId }, 'Handling chat trigger');

    const trigger = await prisma.trigger.findUnique({
      where: { id: triggerId },
      include: { agent: true },
    });

    if (!trigger) {
      throw new AppError(404, 'Trigger not found', 'TRIGGER_NOT_FOUND');
    }

    if (!trigger.isEnabled) {
      throw new AppError(400, 'Trigger is not enabled', 'TRIGGER_NOT_ENABLED');
    }

    if (trigger.type !== TriggerType.CHAT) {
      throw new AppError(400, 'Trigger is not a chat trigger', 'INVALID_TRIGGER_TYPE');
    }

    // Execute agent via AgentRuntime
    const runtimeInput: RuntimeInput = {
      entryAgentId: trigger.agentId,
      userMessage: message,
      sessionId,
      metadata: {
        triggerId,
        triggerType: TriggerType.CHAT,
      },
    };

    try {
      const runtimeOutput = await agentRuntime.execute(runtimeInput);
      const executionTime = Date.now() - startTime;

      logger.info(
        { triggerId, agentId: trigger.agentId, executionTime },
        'Chat trigger handled successfully'
      );

      return {
        success: true,
        response: {
          message: runtimeOutput.finalResponse,
          agentId: trigger.agentId,
          agentName: trigger.agent.name,
          toolCalls: runtimeOutput.toolCalls,
          consultsExecuted: runtimeOutput.consultsExecuted,
          memoryUpdates: runtimeOutput.memoryUpdates,
          debugInfo: runtimeOutput.debugInfo,
        },
        executionTimeMs: executionTime,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      logger.error(
        { triggerId, agentId: trigger.agentId, error: error.message, executionTime },
        'Chat trigger execution failed'
      );

      return {
        success: false,
        error: error.message || 'Agent execution failed',
        executionTimeMs: executionTime,
      };
    }
  }

  /**
   * Handle webhook trigger execution
   * @param triggerId - The trigger ID
   * @param payload - The webhook payload
   * @param signature - Optional signature for validation
   */
  async handleWebhookTrigger(
    triggerId: string,
    payload: any,
    signature?: string
  ): Promise<TriggerExecutionResult> {
    const startTime = Date.now();
    logger.info({ triggerId }, 'Handling webhook trigger');

    const trigger = await prisma.trigger.findUnique({
      where: { id: triggerId },
      include: { agent: true },
    });

    if (!trigger) {
      throw new AppError(404, 'Trigger not found', 'TRIGGER_NOT_FOUND');
    }

    if (!trigger.isEnabled) {
      throw new AppError(400, 'Trigger is not enabled', 'TRIGGER_NOT_ENABLED');
    }

    if (trigger.type !== TriggerType.WEBHOOK) {
      throw new AppError(400, 'Trigger is not a webhook trigger', 'INVALID_TRIGGER_TYPE');
    }

    // Validate signature if secretToken is configured
    if (trigger.secretToken) {
      if (!signature) {
        throw new AppError(401, 'Webhook signature required', 'MISSING_SIGNATURE');
      }

      const isValid = this.validateWebhookSignature(
        JSON.stringify(payload),
        signature,
        trigger.secretToken
      );

      if (!isValid) {
        throw new AppError(401, 'Invalid webhook signature', 'INVALID_SIGNATURE');
      }
    }

    // Execute agent via AgentRuntime
    // Convert payload to user message (can be customized based on config)
    const userMessage = typeof payload === 'string' 
      ? payload 
      : JSON.stringify(payload);

    const runtimeInput: RuntimeInput = {
      entryAgentId: trigger.agentId,
      userMessage,
      context: typeof payload === 'object' ? payload : {},
      metadata: {
        triggerId,
        triggerType: TriggerType.WEBHOOK,
        payload,
      },
    };

    try {
      const runtimeOutput = await agentRuntime.execute(runtimeInput);
      const executionTime = Date.now() - startTime;

      logger.info(
        { triggerId, agentId: trigger.agentId, executionTime },
        'Webhook trigger handled successfully'
      );

      return {
        success: true,
        response: {
          message: runtimeOutput.finalResponse,
          agentId: trigger.agentId,
          agentName: trigger.agent.name,
          toolCalls: runtimeOutput.toolCalls,
          consultsExecuted: runtimeOutput.consultsExecuted,
          memoryUpdates: runtimeOutput.memoryUpdates,
          debugInfo: runtimeOutput.debugInfo,
        },
        executionTimeMs: executionTime,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      logger.error(
        { triggerId, agentId: trigger.agentId, error: error.message, executionTime },
        'Webhook trigger execution failed'
      );

      return {
        success: false,
        error: error.message || 'Agent execution failed',
        executionTimeMs: executionTime,
      };
    }
  }

  /**
   * Execute scheduled trigger
   * @param triggerId - The trigger ID
   */
  async executeScheduledTrigger(triggerId: string): Promise<TriggerExecutionResult> {
    const startTime = Date.now();
    logger.info({ triggerId }, 'Executing scheduled trigger');

    const trigger = await prisma.trigger.findUnique({
      where: { id: triggerId },
      include: { agent: true },
    });

    if (!trigger) {
      throw new AppError(404, 'Trigger not found', 'TRIGGER_NOT_FOUND');
    }

    if (!trigger.isEnabled) {
      throw new AppError(400, 'Trigger is not enabled', 'TRIGGER_NOT_ENABLED');
    }

    if (trigger.type !== TriggerType.SCHEDULED) {
      throw new AppError(400, 'Trigger is not a scheduled trigger', 'INVALID_TRIGGER_TYPE');
    }

    // Execute agent via AgentRuntime
    // Scheduled triggers typically use a default message or config-based message
    const config = trigger.config as Record<string, any>;
    const userMessage = config.message || 'Execute scheduled task';

    const runtimeInput: RuntimeInput = {
      entryAgentId: trigger.agentId,
      userMessage,
      context: config.context || {},
      metadata: {
        triggerId,
        triggerType: TriggerType.SCHEDULED,
        scheduledAt: new Date().toISOString(),
      },
    };

    try {
      const runtimeOutput = await agentRuntime.execute(runtimeInput);
      const executionTime = Date.now() - startTime;

      logger.info(
        { triggerId, agentId: trigger.agentId, executionTime },
        'Scheduled trigger executed successfully'
      );

      return {
        success: true,
        response: {
          message: runtimeOutput.finalResponse,
          agentId: trigger.agentId,
          agentName: trigger.agent.name,
          toolCalls: runtimeOutput.toolCalls,
          consultsExecuted: runtimeOutput.consultsExecuted,
          memoryUpdates: runtimeOutput.memoryUpdates,
          debugInfo: runtimeOutput.debugInfo,
          executedAt: new Date().toISOString(),
        },
        executionTimeMs: executionTime,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      logger.error(
        { triggerId, agentId: trigger.agentId, error: error.message, executionTime },
        'Scheduled trigger execution failed'
      );

      return {
        success: false,
        error: error.message || 'Agent execution failed',
        executionTimeMs: executionTime,
      };
    }
  }

  /**
   * Validate webhook signature
   * Uses HMAC-SHA256 to validate the signature
   */
  private validateWebhookSignature(
    payload: string,
    signature: string,
    secretToken: string
  ): boolean {
    try {
      // Common signature formats:
      // 1. sha256=hex(hmac-sha256(payload, secret))
      // 2. hex(hmac-sha256(payload, secret))
      
      const hmac = crypto.createHmac('sha256', secretToken);
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');

      // Check if signature includes algorithm prefix
      if (signature.startsWith('sha256=')) {
        return crypto.timingSafeEqual(
          Buffer.from(signature.substring(7)),
          Buffer.from(expectedSignature)
        );
      }

      // Direct hex comparison
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error({ error }, 'Error validating webhook signature');
      return false;
    }
  }

  /**
   * Validate trigger configuration
   * Checks if trigger config is valid for its type
   */
  async validateTrigger(triggerId: string): Promise<{ valid: boolean; errors: string[] }> {
    const trigger = await prisma.trigger.findUnique({
      where: { id: triggerId },
    });

    if (!trigger) {
      throw new AppError(404, 'Trigger not found', 'TRIGGER_NOT_FOUND');
    }

    const errors: string[] = [];
    const config = trigger.config as Record<string, any>;

    switch (trigger.type) {
      case TriggerType.CHAT:
        if (!config.route || typeof config.route !== 'string') {
          errors.push('Chat trigger requires a route in config');
        }
        break;

      case TriggerType.WEBHOOK:
        // Webhook triggers don't require specific config, but can have optional fields
        break;

      case TriggerType.SCHEDULED:
        if (!config.cronExpression || typeof config.cronExpression !== 'string') {
          errors.push('Scheduled trigger requires a cronExpression in config');
        } else {
          // Basic cron validation (5 or 6 fields)
          const cronParts = config.cronExpression.trim().split(/\s+/);
          if (cronParts.length < 5 || cronParts.length > 6) {
            errors.push('Invalid cron expression format (expected 5 or 6 fields)');
          }
        }
        break;

      default:
        errors.push(`Unknown trigger type: ${trigger.type}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default new TriggerExecutionHandler();

