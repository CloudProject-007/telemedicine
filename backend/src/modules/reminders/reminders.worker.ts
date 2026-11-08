import { env } from '../../config/env';
import { logger } from '../../infrastructure/logger';
import { startSqsConsumer, type SqsConsumer } from '../../infrastructure/queue/sqs-consumer';
import { dispatchReminder } from './reminders.service';
import { reminderPayloadSchema } from './reminders.rules';

/** Starts reading the reminder queue. Returns null when no queue is configured. */
export function startReminderWorker(): SqsConsumer | null {
  if (!env.SQS_REMINDER_QUEUE_URL || !env.RUN_REMINDER_WORKER) return null;

  return startSqsConsumer({
    queueUrl: env.SQS_REMINDER_QUEUE_URL,
    region: env.AWS_REGION,
    logger,
    handler: async (body) => {
      let json: unknown;
      try {
        json = JSON.parse(body);
      } catch {
        logger.warn('Dropping a reminder message that is not JSON');
        return; // retrying cannot fix a malformed message, so let it be deleted
      }

      const payload = reminderPayloadSchema.safeParse(json);
      if (!payload.success) {
        logger.warn({ issues: payload.error.issues }, 'Dropping an invalid reminder message');
        return;
      }

      const result = await dispatchReminder(payload.data);
      logger.info({ ...payload.data, result }, 'Reminder handled');
    },
  });
}
