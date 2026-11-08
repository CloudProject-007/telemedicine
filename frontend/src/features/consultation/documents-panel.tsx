import { DocumentUploader } from '@/features/documents/document-uploader';
import { DocumentsList } from '@/features/documents/documents-list';
import type { Role } from '@/types/api';

interface DocumentsPanelProps {
  appointmentId: string;
  patientId: string;
  role: Role;
}

/** Patients add reports for this visit; the doctor reads the patient's records. */
export function DocumentsPanel({ appointmentId, patientId, role }: DocumentsPanelProps) {
  const isDoctor = role === 'DOCTOR';
  return (
    <section aria-labelledby="documents-title" className="space-y-4 print:hidden">
      <h2 id="documents-title" className="text-2xl">
        {isDoctor ? "Patient's documents" : 'Your documents'}
      </h2>
      {!isDoctor && <DocumentUploader appointmentId={appointmentId} />}
      <DocumentsList
        {...(isDoctor ? { patientId } : {})}
        canDelete={!isDoctor}
        emptyHint={
          isDoctor
            ? 'The patient has not shared any documents.'
            : 'Upload a report so your doctor can see it during the visit.'
        }
      />
    </section>
  );
}
