export type EmailStatus = 'off' | 'pending' | 'confirmed' | 'unknown';

export interface NotificationPreferences {
  phone: string | null;
  email: { enabled: boolean; status: EmailStatus };
  sms: { enabled: boolean };
}

export interface NotificationPreferencesInput {
  email?: boolean;
  sms?: boolean;
  /** An empty string removes the number. */
  phone?: string;
}
