import cron from 'node-cron';
import { prisma } from '@orchiai/database';
import { TriggerType } from '@orchiai/shared';
import triggerExecutionHandler from './TriggerExecutionHandler';
import logger from '../config/logger';

/**
 * Scheduled Trigger Manager
 * Manages cron-based scheduled trigger execution
 */
export class ScheduledTriggerManager {
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Start the scheduled trigger manager
   * Loads all enabled scheduled triggers and schedules them
   */
  async start(): Promise<void> {
    logger.info('Starting scheduled trigger manager');

    // Load all enabled scheduled triggers
    const triggers = await prisma.trigger.findMany({
      where: {
        type: TriggerType.SCHEDULED,
        isEnabled: true,
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

    // Schedule each trigger
    for (const trigger of triggers) {
      await this.scheduleTrigger(trigger.id, trigger.config as any);
    }

    logger.info({ count: triggers.length }, 'Scheduled triggers loaded');
  }

  /**
   * Stop the scheduled trigger manager
   * Stops all cron jobs
   */
  stop(): void {
    logger.info('Stopping scheduled trigger manager');

    for (const [triggerId, job] of this.cronJobs.entries()) {
      job.stop();
      logger.info({ triggerId }, 'Stopped scheduled trigger');
    }

    this.cronJobs.clear();
  }

  /**
   * Schedule a trigger
   */
  async scheduleTrigger(triggerId: string, config: { cronExpression?: string }): Promise<void> {
    // Stop existing job if any
    this.unscheduleTrigger(triggerId);

    if (!config.cronExpression) {
      logger.warn({ triggerId }, 'Scheduled trigger missing cronExpression');
      return;
    }

    // Validate cron expression
    if (!cron.validate(config.cronExpression)) {
      logger.error({ triggerId, cronExpression: config.cronExpression }, 'Invalid cron expression');
      return;
    }

    // Create cron job
    const job = cron.schedule(
      config.cronExpression,
      async () => {
        try {
          logger.info({ triggerId }, 'Executing scheduled trigger');
          await triggerExecutionHandler.executeScheduledTrigger(triggerId);
        } catch (error: any) {
          logger.error({ triggerId, error: error.message }, 'Error executing scheduled trigger');
        }
      },
      {
        scheduled: true,
        timezone: 'UTC', // Can be made configurable
      }
    );

    this.cronJobs.set(triggerId, job);
    logger.info({ triggerId, cronExpression: config.cronExpression }, 'Scheduled trigger registered');
  }

  /**
   * Unschedule a trigger
   */
  unscheduleTrigger(triggerId: string): void {
    const job = this.cronJobs.get(triggerId);
    if (job) {
      job.stop();
      this.cronJobs.delete(triggerId);
      logger.info({ triggerId }, 'Unscheduled trigger');
    }
  }

  /**
   * Reload all scheduled triggers
   * Useful when triggers are enabled/disabled or updated
   */
  async reload(): Promise<void> {
    logger.info('Reloading scheduled triggers');
    this.stop();
    await this.start();
  }
}

export default new ScheduledTriggerManager();

