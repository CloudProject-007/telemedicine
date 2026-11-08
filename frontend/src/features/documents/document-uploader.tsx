import { Upload } from 'lucide-react';
import { useId, useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DOCUMENT_ACCEPT,
  MAX_DOCUMENT_BYTES,
  formatFileSize,
  validateDocumentFile,
} from '@/lib/documents';
import { getErrorMessage } from '@/lib/errors';
import { useUploadDocument } from './document-queries';

interface DocumentUploaderProps {
  /** Attach the file to this appointment so the doctor sees it with the visit. */
  appointmentId?: string;
}

export function DocumentUploader({ appointmentId }: DocumentUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const upload = useUploadDocument(appointmentId);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // lets the same file be chosen again after a failure
    if (!file) return;

    const invalid = validateDocumentFile(file);
    setProblem(invalid);
    if (invalid) return;

    upload.mutate(file, {
      onSuccess: () => toast.success('Document uploaded'),
      onError: (error) => setProblem(getErrorMessage(error)),
    });
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={DOCUMENT_ACCEPT}
        className="sr-only"
        onChange={onChange}
        aria-describedby={`${inputId}-hint`}
      />
      <Button loading={upload.isPending} onClick={() => inputRef.current?.click()}>
        <Upload aria-hidden="true" className="size-4" />
        {upload.isPending ? 'Uploading' : 'Upload a document'}
      </Button>
      <p id={`${inputId}-hint`} className="text-sm text-ink-soft">
        PDF, JPG, PNG or WebP, up to {formatFileSize(MAX_DOCUMENT_BYTES)}.
      </p>
      {problem && (
        <p role="alert" className="text-sm font-medium text-danger">
          {problem}
        </p>
      )}
    </div>
  );
}
