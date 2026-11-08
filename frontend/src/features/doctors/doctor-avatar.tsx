import { cn } from '@/lib/cn';
import { getInitials } from '@/lib/format';

export function DoctorAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-action/12 font-serif text-lg font-semibold text-action-strong',
        className,
      )}
    >
      {getInitials(name)}
    </span>
  );
}
