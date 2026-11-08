import { Link } from 'react-router-dom';
import { APP_NAME, EMERGENCY_NUMBER } from '@/config/constants';
import { Logo } from './logo';

const linkStyles = 'text-ink-soft hover:text-ink hover:underline underline-offset-2';

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-ink-soft">
            See a doctor by video or chat, get your prescription online and keep your reports in one
            private place.
          </p>
        </div>

        <nav aria-label="Patients" className="space-y-3 text-sm">
          <p className="font-medium">For patients</p>
          <ul className="space-y-2">
            <li>
              <Link to="/doctors" className={linkStyles}>
                Find a doctor
              </Link>
            </li>
            <li>
              <Link to="/appointments" className={linkStyles}>
                My appointments
              </Link>
            </li>
            <li>
              <Link to="/#faq" className={linkStyles}>
                Questions and answers
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Account" className="space-y-3 text-sm">
          <p className="font-medium">Account</p>
          <ul className="space-y-2">
            <li>
              <Link to="/login" className={linkStyles}>
                Sign in
              </Link>
            </li>
            <li>
              <Link to="/register" className={linkStyles}>
                Create an account
              </Link>
            </li>
          </ul>
        </nav>

        <div className="space-y-3 rounded-panel border border-signal/50 bg-signal-soft p-4 text-sm">
          <p className="font-medium">Not for emergencies</p>
          <p className="text-ink-soft">
            If someone is in danger or having a medical emergency, call {EMERGENCY_NUMBER} or go to
            the nearest hospital.
          </p>
        </div>
      </div>

      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-ink-soft sm:px-6">
          © {new Date().getFullYear()} {APP_NAME}. Built as a cloud computing course project.
        </p>
      </div>
    </footer>
  );
}
