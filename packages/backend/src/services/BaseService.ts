import { prisma } from '@orchiai/database';
import logger from '../config/logger';

export abstract class BaseService {
  protected prisma = prisma;
  protected logger = logger;

  constructor(protected serviceName: string) {
    this.logger = logger.child({ service: serviceName });
  }

  protected logInfo(message: string, data?: any) {
    this.logger.info({ ...data }, message);
  }

  protected logError(message: string, error: any, data?: any) {
    this.logger.error({ ...data, error }, message);
  }

  protected logWarn(message: string, data?: any) {
    this.logger.warn({ ...data }, message);
  }
}

export default BaseService;
