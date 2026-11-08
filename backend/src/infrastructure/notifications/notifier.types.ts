export interface EmailMessage {
  /** One line, 100 characters at most (an SNS limit). */
  subject: string;
  body: string;
}

/** `none` means the address is not subscribed, or the person removed it from the email's own link. */
export type EmailSubscriptionStatus = 'none' | 'pending' | 'confirmed';

/**
 * Port for sending messages to people. The application depends on this interface only, so
 * Amazon SNS can be replaced (or faked in tests) without touching business logic.
 */
export interface Notifier {
  /** Sends to the person's confirmed email subscription, and to nobody else. */
  sendEmail(params: { userId: string; message: EmailMessage }): Promise<void>;
  /** `phone` must be in international format, for example +919876543210. */
  sendSms(params: { phone: string; body: string }): Promise<void>;
  /** Asks the address to confirm. Returns the subscription id to keep. */
  subscribeEmail(params: { userId: string; email: string }): Promise<string>;
  unsubscribeEmail(subscriptionArn: string): Promise<void>;
  getEmailStatus(subscriptionArn: string): Promise<EmailSubscriptionStatus>;
}
