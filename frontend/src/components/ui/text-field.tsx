import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

const controlStyles =
  'block w-full rounded-control border border-ink/30 bg-surface px-3 text-ink ' +
  'placeholder:text-ink-soft/70 hover:border-ink/50 aria-invalid:border-danger ' +
  'aria-invalid:bg-danger-soft/40 disabled:opacity-60';

interface FieldFrameProps {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
  children: ReactNode;
}

/** Label, control, hint and error message, wired together with the right ARIA ids. */
function FieldFrame({ id, label, hint, error, children }: FieldFrameProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, hint: ReactNode, error: string | undefined): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

interface SharedFieldProps {
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
}

export function TextField({
  label,
  hint,
  error,
  id: idProp,
  className,
  ...props
}: SharedFieldProps & ComponentProps<'input'>) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(controlStyles, 'h-11', className)}
        {...props}
      />
    </FieldFrame>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  id: idProp,
  className,
  ...props
}: SharedFieldProps & ComponentProps<'textarea'>) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(controlStyles, 'min-h-24 py-2.5', className)}
        {...props}
      />
    </FieldFrame>
  );
}

export function SelectField({
  label,
  hint,
  error,
  id: idProp,
  className,
  children,
  ...props
}: SharedFieldProps & ComponentProps<'select'>) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <FieldFrame id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={cn(controlStyles, 'h-11 cursor-pointer', className)}
        {...props}
      >
        {children}
      </select>
    </FieldFrame>
  );
}
