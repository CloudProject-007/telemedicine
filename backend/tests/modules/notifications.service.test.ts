import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '@prisma/client';
import {
  getPreferences,
  notifyUser,
  updatePreferences,
} from '../../src/modules/notifications/notifications.service';
import { UnprocessableError } from '../../src/shared/errors/app-error';
import { PATIENT_ID } from '../helpers/fixtures';

const mocks = vi.hoisted(() => ({
  prisma: { user: { findUnique: vi.fn(), update: vi.fn() } },
  notifier: {
    sendEmail: vi.fn(),
    sendSms: vi.fn(),
    subscribeEmail: vi.fn(),
    unsubscribeEmail: vi.fn(),
    getEmailStatus: vi.fn(),
  },
}));

vi.mock('../../src/infrastructure/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('../../src/infrastructure/notifications', () => ({ getNotifier: () => mocks.notifier }));

const user = { id: PATIENT_ID, role: Role.PATIENT };
const message = { subject: 'Hello', body: 'Body', sms: 'Short' };

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: PATIENT_ID,
    email: 'asha@example.com',
    phone: null,
    notifyEmail: false,
    notifySms: false,
    snsEmailSubscriptionArn: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.notifier.sendEmail.mockResolvedValue(undefined);
  mocks.notifier.sendSms.mockResolvedValue(undefined);
  mocks.notifier.unsubscribeEmail.mockResolvedValue(undefined);
  mocks.prisma.user.update.mockResolvedValue({});
});

describe('notifyUser', () => {
  it('sends nothing when the person turned everything off', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(userRow());
    await notifyUser(PATIENT_ID, message);
    expect(mocks.notifier.sendEmail).not.toHaveBeenCalled();
    expect(mocks.notifier.sendSms).not.toHaveBeenCalled();
  });

  it('sends on each channel the person turned on', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(
      userRow({
        notifyEmail: true,
        snsEmailSubscriptionArn: 'arn:sub',
        notifySms: true,
        phone: '+919876543210',
      }),
    );
    await notifyUser(PATIENT_ID, message);
    expect(mocks.notifier.sendEmail).toHaveBeenCalledWith({
      userId: PATIENT_ID,
      message: { subject: 'Hello', body: 'Body' },
    });
    expect(mocks.notifier.sendSms).toHaveBeenCalledWith({ phone: '+919876543210', body: 'Short' });
  });

  it('does not text a person who has no phone number', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(userRow({ notifySms: true }));
    await notifyUser(PATIENT_ID, message);
    expect(mocks.notifier.sendSms).not.toHaveBeenCalled();
  });

  it('never throws, even when sending fails or the lookup fails', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(
      userRow({ notifyEmail: true, snsEmailSubscriptionArn: 'arn:sub' }),
    );
    mocks.notifier.sendEmail.mockRejectedValue(new Error('SNS is down'));
    await expect(notifyUser(PATIENT_ID, message)).resolves.toBeUndefined();

    mocks.prisma.user.findUnique.mockRejectedValue(new Error('database is down'));
    await expect(notifyUser(PATIENT_ID, message)).resolves.toBeUndefined();
  });
});

describe('updatePreferences', () => {
  it('subscribes the email address when email is turned on', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(userRow());
    mocks.notifier.subscribeEmail.mockResolvedValue('arn:new');

    await updatePreferences(user, { email: true });

    expect(mocks.notifier.subscribeEmail).toHaveBeenCalledWith({
      userId: PATIENT_ID,
      email: 'asha@example.com',
    });
    expect(mocks.prisma.user.update.mock.calls[0]?.[0].data).toMatchObject({
      notifyEmail: true,
      snsEmailSubscriptionArn: 'arn:new',
    });
  });

  it('subscribes again if the person removed themselves from the topic', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(
      userRow({ notifyEmail: true, snsEmailSubscriptionArn: 'arn:old' }),
    );
    mocks.notifier.getEmailStatus.mockResolvedValue('none');
    mocks.notifier.subscribeEmail.mockResolvedValue('arn:new');

    await updatePreferences(user, { email: true });

    expect(mocks.notifier.subscribeEmail).toHaveBeenCalled();
  });

  it('does not subscribe twice', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(
      userRow({ notifyEmail: true, snsEmailSubscriptionArn: 'arn:sub' }),
    );
    mocks.notifier.getEmailStatus.mockResolvedValue('confirmed');

    await updatePreferences(user, { email: true });

    expect(mocks.notifier.subscribeEmail).not.toHaveBeenCalled();
  });

  it('removes the subscription when email is turned off, even if AWS refuses', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(
      userRow({ notifyEmail: true, snsEmailSubscriptionArn: 'arn:sub' }),
    );
    mocks.notifier.unsubscribeEmail.mockRejectedValue(new Error('pending confirmation'));

    await updatePreferences(user, { email: false });

    expect(mocks.prisma.user.update.mock.calls[0]?.[0].data).toMatchObject({
      notifyEmail: false,
      snsEmailSubscriptionArn: null,
    });
  });

  it('needs a phone number in international format before texts can be turned on', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(userRow({ phone: '9876543210' }));
    await expect(updatePreferences(user, { sms: true })).rejects.toBeInstanceOf(UnprocessableError);
    expect(mocks.prisma.user.update).not.toHaveBeenCalled();
  });

  it('saves the phone number and turns texts on in one request', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(userRow());
    await updatePreferences(user, { sms: true, phone: '+919876543210' });
    expect(mocks.prisma.user.update.mock.calls[0]?.[0].data).toMatchObject({
      phone: '+919876543210',
      notifySms: true,
    });
  });
});

describe('getPreferences', () => {
  it('reports an email address that has not confirmed yet', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(
      userRow({ notifyEmail: true, snsEmailSubscriptionArn: 'arn:sub' }),
    );
    mocks.notifier.getEmailStatus.mockResolvedValue('pending');
    expect(await getPreferences(user)).toMatchObject({
      email: { enabled: true, status: 'pending' },
    });
  });

  it('reports email as off when the person removed the subscription themselves', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(
      userRow({ notifyEmail: true, snsEmailSubscriptionArn: 'arn:sub' }),
    );
    mocks.notifier.getEmailStatus.mockResolvedValue('none');
    expect(await getPreferences(user)).toMatchObject({ email: { enabled: false, status: 'off' } });
  });

  it('says so when the status cannot be read, instead of failing', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue(
      userRow({ notifyEmail: true, snsEmailSubscriptionArn: 'arn:sub' }),
    );
    mocks.notifier.getEmailStatus.mockRejectedValue(new Error('SNS is down'));
    expect(await getPreferences(user)).toMatchObject({ email: { status: 'unknown' } });
  });
});
