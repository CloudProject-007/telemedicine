import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TextField } from '@/components/ui/text-field';
import { applyServerErrors, getErrorMessage } from '@/lib/errors';
import type { EmailStatus, NotificationPreferences } from '@/types/notifications';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from './notification-queries';
import {
  notificationSchema,
  toNotificationInput,
  toNotificationValues,
  type NotificationValues,
} from './notification-schema';

const EMAIL_STATUS_TEXT: Record<EmailStatus, string | null> = {
  off: null,
  pending:
    'Check your inbox for an email from Amazon and select "Confirm subscription". Until you do, no emails are sent.',
  confirmed: 'Your email address is confirmed.',
  unknown: 'We could not check the status of your email address just now.',
};

export function NotificationSettingsPage() {
  const { data, isPending, isError, error, refetch } = useNotificationPreferences();

  return (
    <div className="max-w-xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl">Reminders</h1>
        <p className="text-ink-soft">
          Choose how we tell you about confirmed visits, reminders and prescriptions. Messages never
          include medical details.
        </p>
      </div>

      {isPending && (
        <div aria-busy="true" className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
      {isError && (
        <ErrorAlert title="Could not load your settings" onRetry={() => void refetch()}>
          {getErrorMessage(error)}
        </ErrorAlert>
      )}
      {data && <SettingsForm preferences={data} />}
    </div>
  );
}

function SettingsForm({ preferences }: { preferences: NotificationPreferences }) {
  const update = useUpdateNotificationPreferences();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<NotificationValues>({
    resolver: zodResolver(notificationSchema),
    defaultValues: toNotificationValues(preferences),
  });

  // After a save (or a status change on the server) the form shows what is stored.
  useEffect(() => reset(toNotificationValues(preferences)), [preferences, reset]);

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    update.mutate(toNotificationInput(values), {
      onSuccess: () => toast.success('Settings saved'),
      onError: (cause) => {
        if (!applyServerErrors(cause, setError, ['phone'])) setFormError(getErrorMessage(cause));
      },
    });
  });

  const statusText = EMAIL_STATUS_TEXT[preferences.email.status];

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {formError && <ErrorAlert title="Could not save your settings">{formError}</ErrorAlert>}

      <fieldset className="space-y-3 rounded-panel border border-line bg-surface p-5">
        <legend className="px-1 font-medium">Email</legend>
        <label className="flex items-center gap-3">
          <input type="checkbox" className="size-5 accent-action" {...register('email')} />
          <span>Send me emails</span>
        </label>
        {statusText && (
          <p className="text-sm text-ink-soft" role="status">
            {statusText}
          </p>
        )}
      </fieldset>

      <fieldset className="space-y-4 rounded-panel border border-line bg-surface p-5">
        <legend className="px-1 font-medium">Text messages</legend>
        <label className="flex items-center gap-3">
          <input type="checkbox" className="size-5 accent-action" {...register('sms')} />
          <span>Send me text messages</span>
        </label>
        <TextField
          label="Mobile number"
          type="tel"
          autoComplete="tel"
          placeholder="+919876543210"
          hint="Include the country code."
          error={errors.phone?.message}
          {...register('phone')}
        />
      </fieldset>

      <Button type="submit" size="lg" loading={update.isPending} disabled={!isDirty}>
        Save settings
      </Button>
    </form>
  );
}
