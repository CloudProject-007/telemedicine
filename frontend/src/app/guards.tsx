import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/features/auth/use-auth';
import { HOME_BY_ROLE } from '@/lib/roles';
import type { Role } from '@/types/api';

function FullPageSpinner() {
  return (
    <div role="status" className="grid min-h-dvh place-items-center">
      <Spinner className="size-8 text-ink-soft" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

/** Pages that need a signed-in person. Sends everyone else to sign in, then back here. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Sign-in and sign-up pages: pointless once signed in. */
export function GuestOnly() {
  const { status, user } = useAuth();

  if (status === 'loading') return <FullPageSpinner />;
  if (user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  return <Outlet />;
}

/** Wraps pages for some roles. Anyone else is sent to their own home instead of a dead end. */
export function RoleOnly({ roles }: { roles: readonly Role[] }) {
  const { user } = useAuth();

  if (user && !roles.includes(user.role)) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  return <Outlet />;
}
