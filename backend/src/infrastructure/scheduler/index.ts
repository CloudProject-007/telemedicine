import { env } from '../../config/env';
import { logger } from '../logger';
import { EventBridgeScheduler } from './eventbridge.scheduler';
import { LogScheduler } from './log.scheduler';
import type { OneTimeScheduler } from './scheduler.types';

let instance: OneTimeScheduler | undefined;

export function getScheduler(): OneTimeScheduler {
  if (!instance) {
    if (env.SCHEDULER_ROLE_ARN && env.SQS_REMINDER_QUEUE_ARN) {
      instance = new EventBridgeScheduler({
        region: env.AWS_REGION,
        groupName: env.SCHEDULER_GROUP_NAME,
        targetArn: env.SQS_REMINDER_QUEUE_ARN,
        roleArn: env.SCHEDULER_ROLE_ARN,
      });
    } else {
      logger.warn('EventBridge Scheduler is not configured: reminders are logged, not scheduled');
      instance = new LogScheduler(logger);
    }
  }
  return instance;
}

export type { OneTimeScheduler } from './scheduler.types';
