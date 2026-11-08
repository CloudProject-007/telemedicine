import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { applyServerErrors, getErrorMessage } from '@/lib/errors';
import { HOME_BY_ROLE } from '@/lib/roles';
import { AuthLayout } from './auth-layout';
import { loginSchema, type LoginValues } from './schemas';
import { useAuth } from './use-auth';

/** Only follow same-site paths, so a crafted link cannot send someone to another website. */
function safeReturnPath(state: unknown, fallback: string): string {
  const from = (state as { from?: { pathname?: string; search?: string } } | null)?.from;
  const pathname = from?.pathname;
  return pathname?.startsWith('/') && !pathname.startsWith('//')
    ? `${pathname}${from?.search ?? ''}`
    : fallback;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await login(values);
      navigate(safeReturnPath(location.state, HOME_BY_ROLE[user.role]), { replace: true });
    } catch (error) {
      if (!applyServerErrors(error, setError, ['email', 'password'])) {
        setFormError(getErrorMessage(error));
      }
    }
  });

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back. Sign in to book and manage your appointments."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-action underline underline-offset-2">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <ErrorAlert title="Could not sign you in">{formError}</ErrorAlert>}
        <TextField
          label="Email address"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
