import type { ReactNode } from 'react';
import { Logo } from '@/components/layout/logo';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="skip-link">
        Skip to form
      </a>
      <header className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
        <Logo />
      </header>
      <main id="main" className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-16 sm:px-6">
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        <p className="mt-2 text-ink-soft">{subtitle}</p>
        <div className="mt-8 rounded-panel border border-line bg-surface p-6">{children}</div>
        <p className="mt-6 text-sm text-ink-soft">{footer}</p>
      </main>
    </div>
  );
}
