import { Link } from 'react-router-dom';
import { APP_NAME } from '@/config/constants';

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-2.5 rounded-control">
      <svg aria-hidden="true" viewBox="0 0 32 32" className="size-8">
        <rect width="32" height="32" rx="8" fill="var(--color-ink)" />
        <path d="M13 7h6v6h6v6h-6v6h-6v-6H7v-6h6z" fill="var(--color-paper)" />
      </svg>
      <span className="font-serif text-xl font-semibold tracking-tight">{APP_NAME}</span>
    </Link>
  );
}
