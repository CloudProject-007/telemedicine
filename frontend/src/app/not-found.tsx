import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout/logo';
import { buttonStyles } from '@/components/ui/button-styles';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4 py-6">
      <Logo />
      <main className="flex flex-1 flex-col items-start justify-center gap-4 pb-24">
        <h1 className="text-4xl">This page does not exist</h1>
        <p className="text-ink-soft">
          The link may be old, or the address may have a typing mistake.
        </p>
        <Link to="/" className={buttonStyles()}>
          Go to the home page
        </Link>
      </main>
    </div>
  );
}
