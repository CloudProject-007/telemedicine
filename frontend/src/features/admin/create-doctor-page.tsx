import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { ProfileFields, type BindField } from '@/features/doctors/profile-fields';
import { EMPTY_PROFILE } from '@/features/doctors/profile-schema';
import { ApiError } from '@/lib/api/client';
import { applyServerErrors, getErrorMessage } from '@/lib/errors';
import { useCreateDoctor } from './admin-queries';
import {
  createDoctorSchema,
  toCreateDoctorInput,
  type CreateDoctorValues,
} from './create-doctor-schema';

const FIELDS = [
  'name',
  'email',
  'phone',
  'password',
  ...Object.keys(EMPTY_PROFILE),
] as (keyof CreateDoctorValues)[];

export function CreateDoctorPage() {
  const navigate = useNavigate();
  const createDoctor = useCreateDoctor();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateDoctorValues>({
    resolver: zodResolver(createDoctorSchema),
    defaultValues: { name: '', email: '', phone: '', password: '', ...EMPTY_PROFILE },
  });

  const bind: BindField = (name) => ({ ...register(name), error: errors[name]?.message });
  const bindAccount = (name: 'name' | 'email' | 'phone' | 'password') => ({
    ...register(name),
    error: errors[name]?.message,
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    createDoctor.mutate(toCreateDoctorInput(values), {
      onSuccess: (doctor) => {
        toast.success(`${doctor.name} was added`);
        navigate('/admin/doctors');
      },
      onError: (error) => {
        if (error instanceof ApiError && error.status === 409) {
          setError('email', {
            type: 'server',
            message: 'An account with this email already exists',
          });
        } else if (!applyServerErrors(error, setError, FIELDS)) {
          setFormError(getErrorMessage(error));
        }
      },
    });
  });

  return (
    <div className="max-w-2xl space-y-8">
      <div className="space-y-2">
        <Link to="/admin/doctors" className="text-sm text-ink-soft hover:text-ink">
          Back to doctors
        </Link>
        <h1 className="text-3xl sm:text-4xl">Add a doctor</h1>
        <p className="text-ink-soft">
          This creates the doctor&rsquo;s account. Share the email and password with them so they
          can sign in.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        noValidate
        className="space-y-5 rounded-panel border border-line bg-surface p-6"
      >
        {formError && <ErrorAlert title="Could not add the doctor">{formError}</ErrorAlert>}

        <fieldset className="space-y-5">
          <legend className="mb-1 font-serif text-xl font-semibold">Account</legend>
          <TextField label="Full name" autoComplete="off" {...bindAccount('name')} />
          <TextField
            label="Email address"
            type="email"
            autoComplete="off"
            {...bindAccount('email')}
          />
          <TextField
            label="Phone number (optional)"
            type="tel"
            autoComplete="off"
            {...bindAccount('phone')}
          />
          <TextField
            label="Temporary password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters, with a letter and a number."
            {...bindAccount('password')}
          />
        </fieldset>

        <fieldset className="space-y-5">
          <legend className="mb-1 font-serif text-xl font-semibold">Profile</legend>
          <ProfileFields bind={bind} />
        </fieldset>

        <Button type="submit" size="lg" loading={createDoctor.isPending}>
          Add doctor
        </Button>
      </form>
    </div>
  );
}
