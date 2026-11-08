import { Download, FileText, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { formatFileSize } from '@/lib/documents';
import { getErrorMessage } from '@/lib/errors';
import { formatFullDate } from '@/lib/format';
import { useDeleteDocument, useDocuments, useOpenDocument } from './document-queries';

interface DocumentsListProps {
  /** Doctors pass the patient whose records they are viewing. */
  patientId?: string;
  /** Only patients can delete, and only their own files. */
  canDelete: boolean;
  emptyHint: string;
}

export function DocumentsList({ patientId, canDelete, emptyHint }: DocumentsListProps) {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch } = useDocuments({ page, patientId });
  const open = useOpenDocument();
  const remove = useDeleteDocument();

  const onOpen = (id: string) =>
    open.mutate(id, { onError: (cause) => toast.error(getErrorMessage(cause)) });

  const onDelete = (id: string) =>
    remove.mutate(id, {
      onSuccess: () => toast.success('Document deleted'),
      onError: (cause) => toast.error(getErrorMessage(cause)),
    });

  if (isPending) {
    return (
      <div aria-busy="true" className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorAlert title="Could not load the documents" onRetry={() => void refetch()}>
        {getErrorMessage(error)}
      </ErrorAlert>
    );
  }

  if (data.items.length === 0) {
    return (
      <EmptyState icon={FileText} title="No documents yet">
        {emptyHint}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-line rounded-panel border border-line bg-surface">
        {data.items.map((document) => (
          <li key={document.id} className="flex flex-wrap items-center gap-3 p-4">
            <FileText aria-hidden="true" className="size-5 shrink-0 text-ink-soft" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{document.fileName}</p>
              <p className="text-sm text-ink-soft">
                {formatFileSize(document.sizeBytes)}, added {formatFullDate(document.createdAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                loading={open.isPending && open.variables === document.id}
                onClick={() => onOpen(document.id)}
                aria-label={`Download ${document.fileName}`}
              >
                <Download aria-hidden="true" className="size-4" />
                Download
              </Button>
              {canDelete && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={remove.isPending && remove.variables === document.id}
                  onClick={() => onDelete(document.id)}
                  aria-label={`Delete ${document.fileName}`}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Delete
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <Pagination meta={data.meta} onPageChange={setPage} />
    </div>
  );
}
