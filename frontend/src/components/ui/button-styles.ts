import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-control font-medium whitespace-nowrap ' +
  'transition-colors disabled:pointer-events-none disabled:opacity-55 cursor-pointer';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-action text-white hover:bg-action-strong',
  secondary: 'border border-ink/30 bg-surface text-ink hover:border-ink/60',
  ghost: 'text-ink hover:bg-ink/6',
  danger: 'bg-danger text-white hover:bg-danger/90',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-[0.95rem]',
  lg: 'h-12 px-6 text-base',
};

/** Class names for anything that should look like a button, including router links. */
export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(base, variants[variant], sizes[size], className);
}
