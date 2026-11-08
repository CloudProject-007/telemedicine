import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './button';

interface ErrorAlertProps {
  title: string;
  children?: ReactNode;
  onRetry?: () => void;
}

/** A failed load or action: says what happened and, when possible, offers the way forward. */
export function ErrorAlert({ title, children, onRetry }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-panel border border-danger/30 bg-danger-soft p-4 text-ink"
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-danger" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium">{title}</p>
        {children && <p className="text-sm text-ink-soft">{children}</p>}
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2">
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
