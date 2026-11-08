import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Always required: screen readers announce it with the title. */
  description: string;
  children: ReactNode;
}

/** Modal dialog on Radix: focus is trapped, Escape closes, focus returns to the trigger. */
export function Dialog({ open, onOpenChange, title, description, children }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-ink/45" />
        <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-panel border border-line bg-surface p-6 shadow-xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogPrimitive.Title className="font-serif text-2xl font-semibold">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm text-ink-soft">
                {description}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="Close"
              className="-mt-1 -mr-1 inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-control text-ink-soft hover:bg-ink/6"
            >
              <X aria-hidden="true" className="size-5" />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
