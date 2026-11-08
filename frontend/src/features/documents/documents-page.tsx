import { DocumentUploader } from './document-uploader';
import { DocumentsList } from './documents-list';

export function DocumentsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl">My records</h1>
        <p className="max-w-prose text-ink-soft">
          Keep reports and scans here. Doctors you have a confirmed visit with can open them.
        </p>
      </div>
      <DocumentUploader />
      <DocumentsList
        canDelete
        emptyHint="Upload a lab report or a scan and it will show up here."
      />
    </div>
  );
}
