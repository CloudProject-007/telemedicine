import { FileText } from 'lucide-react';
import { useState } from 'react';
import { ErrorAlert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/errors';
import type { Role } from '@/types/api';
import { usePrescription } from './consultation-queries';
import { PrescriptionForm } from './prescription-form';
import { PrescriptionView } from './prescription-view';

interface PrescriptionPanelProps {
  appointmentId: string;
  role: Role;
  doctorName: string;
  patientName: string;
}

export function PrescriptionPanel({
  appointmentId,
  role,
  doctorName,
  patientName,
}: PrescriptionPanelProps) {
  const isDoctor = role === 'DOCTOR';
  const prescription = usePrescription(appointmentId, { poll: !isDoctor });
  const [editing, setEditing] = useState(false);

  const saved = prescription.data ?? null;

  return (
    <section aria-labelledby="prescription-title" className="space-y-4">
      <h2 id="prescription-title" className="text-2xl">
        Prescription
      </h2>

      {prescription.isPending && <Skeleton className="h-40 w-full" />}
      {prescription.isError && (
        <ErrorAlert
          title="Could not load the prescription"
          onRetry={() => void prescription.refetch()}
        >
          {getErrorMessage(prescription.error)}
        </ErrorAlert>
      )}

      {prescription.isSuccess && isDoctor && (editing || !saved) && (
        <PrescriptionForm
          appointmentId={appointmentId}
          existing={saved}
          onDone={() => setEditing(false)}
        />
      )}

      {prescription.isSuccess && saved && !(isDoctor && editing) && (
        <PrescriptionView
          prescription={saved}
          doctorName={doctorName}
          patientName={patientName}
          {...(isDoctor ? { onEdit: () => setEditing(true) } : {})}
        />
      )}

      {prescription.isSuccess && !saved && !isDoctor && (
        <EmptyState icon={FileText} title="No prescription yet">
          Your doctor will add it here during or after the visit. This page checks for it every few
          seconds.
        </EmptyState>
      )}
    </section>
  );
}
