import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'ok' | 'signal' | 'danger';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-ink/8 text-ink',
  ok: 'bg-ok-soft text-ok',
  signal: 'bg-signal-soft text-ink',
  danger: 'bg-danger-soft text-danger',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
