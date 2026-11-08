import type { Prisma } from '@prisma/client';
import { logger } from '../../infrastructure/logger';
import { getNotifier } from '../../infrastructure/notifications';
import { prisma } from '../../infrastructure/prisma';
import { NotFoundError, UnprocessableError } from '../../shared/errors/app-error';
import type { AuthUser } from '../../shared/types/auth';
import type { UserMessage } from './notification-messages';
import { E164_PHONE, type UpdatePreferencesInput } from './notifications.schemas';

export interface PreferencesDto {
  phone: string | null;
  email: {
    enabled: boolean;
    /** `pending` until the person clicks the link in the confirmation email AWS sends. */
    status: 'off' | 'pending' | 'confirmed' | 'unknown';
  };
  sms: { enabled: boolean };
}

export async function getPreferences(authUser: AuthUser): Promise<PreferencesDto> {
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { phone: true, notifyEmail: true, notifySms: true, snsEmailSubscriptionArn: true },
  });
  if (!user) {
    throw new NotFoundError('User');
  }

  let status: PreferencesDto['email']['status'] = 'off';
  if (user.notifyEmail && user.snsEmailSubscriptionArn) {
    try {
      const subscription = await getNotifier().getEmailStatus(user.snsEmailSubscriptionArn);
      status = subscription === 'none' ? 'off' : subscription;
    } catch (error) {
      logger.warn({ err: error }, 'Could not read the email subscription status');
      status = 'unknown';
    }
  }

  return {
    phone: user.phone,
    email: { enabled: status !== 'off', status },
    sms: { enabled: user.notifySms },
  };
}

export async function updatePreferences(
  authUser: AuthUser,
  input: UpdatePreferencesInput,
): Promise<PreferencesDto> {
  const user = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (!user) {
    throw new NotFoundError('User');
  }
  const notifier = getNotifier();

  const phone = input.phone === undefined ? user.phone : input.phone || null;
  const wantsSms = input.sms ?? user.notifySms;
  if (wantsSms && !(phone && E164_PHONE.test(phone))) {
    throw new UnprocessableError(
      'Add your phone number in international format, for example +919876543210, to get text messages',
    );
  }

  const data: Prisma.UserUpdateInput = {};
  if (input.phone !== undefined) data.phone = phone;
  if (input.sms !== undefined) data.notifySms = input.sms;

  if (input.email === true) {
    const existing = user.snsEmailSubscriptionArn;
    const stillSubscribed = existing ? (await notifier.getEmailStatus(existing)) !== 'none' : false;
    if (!stillSubscribed) {
      data.snsEmailSubscriptionArn = await notifier.subscribeEmail({
        userId: user.id,
        email: user.email,
      });
    }
    data.notifyEmail = true;
  } else if (input.email === false) {
    if (user.snsEmailSubscriptionArn) {
      try {
        await notifier.unsubscribeEmail(user.snsEmailSubscriptionArn);
      } catch (error) {
        // A subscription that was never confirmed cannot be removed. AWS drops it after 48 hours.
        logger.warn({ err: error }, 'Could not remove the email subscription');
      }
    }
    data.notifyEmail = false;
    data.snsEmailSubscriptionArn = null;
  }

  await prisma.user.update({ where: { id: user.id }, data });
  return getPreferences(authUser);
}

/**
 * Sends a message to one person on the channels they turned on. Never throws: a failed
 * notification must not undo or fail the thing that caused it, such as saving a prescription.
 */
export async function notifyUser(userId: string, message: UserMessage): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { notifyEmail: true, notifySms: true, phone: true, snsEmailSubscriptionArn: true },
    });
    if (!user) return;

    const notifier = getNotifier();
    const jobs: Promise<void>[] = [];
    if (user.notifyEmail && user.snsEmailSubscriptionArn) {
      jobs.push(
        notifier.sendEmail({ userId, message: { subject: message.subject, body: message.body } }),
      );
    }
    if (user.notifySms && user.phone) {
      jobs.push(notifier.sendSms({ phone: user.phone, body: message.sms }));
    }

    const results = await Promise.allSettled(jobs);
    for (const result of results) {
      if (result.status === 'rejected') {
        logger.warn({ err: result.reason, userId }, 'A notification could not be sent');
      }
    }
  } catch (error) {
    logger.warn({ err: error, userId }, 'Could not notify the user');
  }
}
