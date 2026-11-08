import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/use-auth';
import { useDoctor } from '@/features/doctors/doctor-queries';
import { ProfileFields, type BindField } from '@/features/doctors/profile-fields';
import {
  EMPTY_PROFILE,
  profileSchema,
  toProfileInput,
  toProfileValues,
  type ProfileValues,
} from '@/features/doctors/profile-schema';
import { applyServerErrors, getErrorMessage } from '@/lib/errors';
import { useUpdateProfile } from './doctor-queries';

export function ProfilePage() {
  const { user } = useAuth();
  const doctorId = user?.id ?? '';
  const doctor = useDoctor(doctorId);
  const update = useUpdateProfile(doctorId);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: EMPTY_PROFILE,
  });

  // Fill the form once the profile has loaded (and again after a save, to clear "unsaved changes").
  useEffect(() => {
    if (doctor.data) reset(toProfileValues(doctor.data));
  }, [doctor.data, reset]);

  const bind: BindField = (name) => ({ ...register(name), error: errors[name]?.message });

  const onSubmit = handleSubmit((values) =>
    update.mutateAsync(toProfileInput(values)).then(
      () => void toast.success('Profile saved'),
      (error: unknown) => {
        if (
          !applyServerErrors(error, setError, Object.keys(EMPTY_PROFILE) as (keyof ProfileValues)[])
        ) {
          toast.error(getErrorMessage(error));
        }
      },
    ),
  );

  return (
    <div className="max-w-2xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl">Your profile</h1>
        <p className="text-ink-soft">This is what patients see before they book you.</p>
      </div>

      {doctor.isPending && (
        <div aria-busy="true">
          <Skeleton className="h-72 w-full" />
        </div>
      )}
      {doctor.isError && (
        <ErrorAlert title="Could not load your profile" onRetry={() => void doctor.refetch()}>
          {getErrorMessage(doctor.error)}
        </ErrorAlert>
      )}

      {doctor.data && (
        <form
          onSubmit={onSubmit}
          noValidate
          className="space-y-5 rounded-panel border border-line bg-surface p-6"
        >
          <ProfileFields bind={bind} />
          <Button type="submit" loading={update.isPending} disabled={!isDirty}>
            Save changes
          </Button>
        </form>
      )}
    </div>
  );
}
