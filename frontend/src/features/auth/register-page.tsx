import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { ApiError } from '@/lib/api/client';
import { applyServerErrors, getErrorMessage } from '@/lib/errors';
import { AuthLayout } from './auth-layout';
import { registerSchema, type RegisterValues } from './schemas';
import { useAuth } from './use-auth';

export function RegisterPage() {
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', phone: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signUp({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone || undefined,
      });
      navigate('/doctors', { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setError('email', { type: 'server', message: 'An account with this email already exists' });
      } else if (!applyServerErrors(error, setError, ['name', 'email', 'phone', 'password'])) {
        setFormError(getErrorMessage(error));
      }
    }
  });

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It takes a minute. You can book your first appointment right after."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-action underline underline-offset-2">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <ErrorAlert title="Could not create your account">{formError}</ErrorAlert>}
        <TextField
          label="Full name"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          label="Email address"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Phone number (optional)"
          type="tel"
          autoComplete="tel"
          hint="Your doctor can use it if the call drops."
          error={errors.phone?.message}
          {...register('phone')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters, with a letter and a number."
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
