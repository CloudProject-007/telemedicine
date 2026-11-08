import { Link, Outlet } from 'react-router-dom';
import { buttonStyles } from '@/components/ui/button-styles';
import { useAuth } from '@/features/auth/use-auth';
import { HOME_BY_ROLE } from '@/lib/roles';
import { Logo } from './logo';
import { SiteFooter } from './site-footer';

const navLink = 'rounded-control px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink';

/** Frame for public pages: header with section links, page content, footer. */
export function PublicShell() {
  const { status, user } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="border-b border-line bg-paper/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <nav aria-label="Sections" className="hidden items-center md:flex">
            <Link to="/#how-it-works" className={navLink}>
              How it works
            </Link>
            <Link to="/#specialties" className={navLink}>
              Specialties
            </Link>
            <Link to="/#faq" className={navLink}>
              Questions
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            {status === 'authenticated' ? (
              <Link
                to={user ? HOME_BY_ROLE[user.role] : '/login'}
                className={buttonStyles({ size: 'sm' })}
              >
                Go to my account
              </Link>
            ) : (
              <>
                <Link to="/login" className={buttonStyles({ variant: 'ghost', size: 'sm' })}>
                  Sign in
                </Link>
                <Link to="/register" className={buttonStyles({ size: 'sm' })}>
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
