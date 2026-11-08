import {
  GetSubscriptionAttributesCommand,
  PublishCommand,
  SNSClient,
  SubscribeCommand,
  UnsubscribeCommand,
} from '@aws-sdk/client-sns';
import type { EmailSubscriptionStatus, EmailMessage, Notifier } from './notifier.types';

const MAX_SUBJECT_LENGTH = 100;

/** SNS rejects subjects with line breaks or over 100 characters. */
export function toSnsSubject(subject: string): string {
  return subject.replace(/\s+/g, ' ').trim().slice(0, MAX_SUBJECT_LENGTH);
}

export interface SnsNotifierOptions {
  topicArn: string;
  region: string;
}

/**
 * Email goes through one SNS topic. Each person's address is subscribed with a filter on their
 * user id, so a message published for one person is delivered only to that person. SMS is sent
 * straight to the phone number and does not use the topic.
 */
export class SnsNotifier implements Notifier {
  private readonly client: SNSClient;
  private readonly topicArn: string;

  constructor(options: SnsNotifierOptions) {
    this.topicArn = options.topicArn;
    // Credentials come from the default provider chain (IAM role on EC2, env vars locally).
    this.client = new SNSClient({ region: options.region });
  }

  async sendEmail({ userId, message }: { userId: string; message: EmailMessage }): Promise<void> {
    await this.client.send(
      new PublishCommand({
        TopicArn: this.topicArn,
        Subject: toSnsSubject(message.subject),
        Message: message.body,
        MessageAttributes: { userId: { DataType: 'String', StringValue: userId } },
      }),
    );
  }

  async sendSms({ phone, body }: { phone: string; body: string }): Promise<void> {
    await this.client.send(
      new PublishCommand({
        PhoneNumber: phone,
        Message: body,
        MessageAttributes: {
          // Transactional messages are prioritised for delivery over promotional ones.
          'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' },
        },
      }),
    );
  }

  async subscribeEmail({ userId, email }: { userId: string; email: string }): Promise<string> {
    const result = await this.client.send(
      new SubscribeCommand({
        TopicArn: this.topicArn,
        Protocol: 'email',
        Endpoint: email,
        Attributes: { FilterPolicy: JSON.stringify({ userId: [userId] }) },
        ReturnSubscriptionArn: true, // a real id even while the address has not confirmed yet
      }),
    );
    if (!result.SubscriptionArn) throw new Error('SNS did not return a subscription id');
    return result.SubscriptionArn;
  }

  async unsubscribeEmail(subscriptionArn: string): Promise<void> {
    await this.client.send(new UnsubscribeCommand({ SubscriptionArn: subscriptionArn }));
  }

  async getEmailStatus(subscriptionArn: string): Promise<EmailSubscriptionStatus> {
    try {
      const result = await this.client.send(
        new GetSubscriptionAttributesCommand({ SubscriptionArn: subscriptionArn }),
      );
      return result.Attributes?.['PendingConfirmation'] === 'true' ? 'pending' : 'confirmed';
    } catch (error) {
      // The person removed themselves with the link at the bottom of an email.
      if (error instanceof Error && error.name === 'NotFoundException') return 'none';
      throw error;
    }
  }
}
