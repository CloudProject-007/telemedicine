import { LogOut } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/use-auth';
import { cn } from '@/lib/cn';
import { HOME_BY_ROLE, NAV_BY_ROLE } from '@/lib/roles';
import { Logo } from './logo';

const navLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-control px-3 py-2 text-sm font-medium',
    isActive ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-ink/6 hover:text-ink',
  );

/** Frame for signed-in pages. */
export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="skip-link print:hidden">
        Skip to content
      </a>
      <header className="border-b border-line bg-surface print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Logo to={user ? HOME_BY_ROLE[user.role] : '/'} />
            <nav aria-label="Main" className="flex items-center gap-1">
              {(user ? NAV_BY_ROLE[user.role] : []).map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end ?? false} className={navLink}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-soft sm:inline">{user?.name}</span>
            <Button variant="secondary" size="sm" onClick={() => void logout()}>
              <LogOut aria-hidden="true" className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
