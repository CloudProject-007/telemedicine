import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

/** An empty list is a prompt to act, so it always says what to do next. */
export function EmptyState({ icon: Icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-panel border border-dashed border-ink/25 bg-surface/60 p-8">
      <Icon aria-hidden="true" className="size-7 text-ink-soft" />
      <div className="space-y-1">
        <h2 className="text-xl">{title}</h2>
        {children && <p className="max-w-prose text-ink-soft">{children}</p>}
      </div>
      {action}
    </div>
  );
}
