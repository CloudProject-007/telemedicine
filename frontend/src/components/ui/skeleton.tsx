import { cn } from '@/lib/cn';

/** Placeholder block while data loads. Pulses only when the person has not asked for less motion. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('rounded-control bg-ink/8 motion-safe:animate-pulse', className)}
    />
  );
}
