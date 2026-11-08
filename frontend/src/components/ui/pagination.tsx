import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '@/types/api';
import { Button } from './button';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

/** Previous and next with the current position. Renders nothing for a single page. */
export function Pagination({ meta, onPageChange }: PaginationProps) {
  if (meta.totalPages <= 1) return null;

  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-4">
      <Button
        variant="secondary"
        disabled={meta.page <= 1}
        onClick={() => onPageChange(meta.page - 1)}
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        Previous
      </Button>
      <p className="text-sm text-ink-soft">
        Page {meta.page} of {meta.totalPages}
      </p>
      <Button
        variant="secondary"
        disabled={meta.page >= meta.totalPages}
        onClick={() => onPageChange(meta.page + 1)}
      >
        Next
        <ChevronRight aria-hidden="true" className="size-4" />
      </Button>
    </nav>
  );
}
