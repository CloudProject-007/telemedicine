import type { Logger } from '../logger';
import type { EmailMessage, EmailSubscriptionStatus, Notifier } from './notifier.types';

/**
 * Used when no SNS topic is configured (local development, tests). Nothing is sent: the message
 * is written to the log, so the flow can still be followed. Subscriptions confirm instantly.
 */
export class ConsoleNotifier implements Notifier {
  constructor(private readonly logger: Logger) {}

  sendEmail({ userId, message }: { userId: string; message: EmailMessage }): Promise<void> {
    this.logger.info({ userId, subject: message.subject, body: message.body }, '[notify] email');
    return Promise.resolve();
  }

  sendSms({ phone, body }: { phone: string; body: string }): Promise<void> {
    this.logger.info({ phone, body }, '[notify] sms');
    return Promise.resolve();
  }

  subscribeEmail({ userId }: { userId: string; email: string }): Promise<string> {
    return Promise.resolve(`local:${userId}`);
  }

  unsubscribeEmail(): Promise<void> {
    return Promise.resolve();
  }

  getEmailStatus(): Promise<EmailSubscriptionStatus> {
    return Promise.resolve('confirmed');
  }
}
