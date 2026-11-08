import { env } from '../../config/env';
import { logger } from '../logger';
import { ConsoleNotifier } from './console.notifier';
import type { Notifier } from './notifier.types';
import { SnsNotifier } from './sns.notifier';

let instance: Notifier | undefined;

export function getNotifier(): Notifier {
  if (!instance) {
    if (env.SNS_TOPIC_ARN) {
      instance = new SnsNotifier({ topicArn: env.SNS_TOPIC_ARN, region: env.AWS_REGION });
    } else {
      logger.warn('SNS_TOPIC_ARN is not set: notifications are logged, not sent');
      instance = new ConsoleNotifier(logger);
    }
  }
  return instance;
}

export type { EmailMessage, EmailSubscriptionStatus, Notifier } from './notifier.types';
