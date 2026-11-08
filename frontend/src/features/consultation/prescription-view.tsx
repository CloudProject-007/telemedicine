import { format } from 'date-fns';
import { Download, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/errors';
import { formatFullDate } from '@/lib/format';
import { useOpenPrescriptionPdf } from './consultation-queries';
import type { Prescription } from '@/types/consultation';

interface PrescriptionViewProps {
  prescription: Prescription;
  doctorName: string;
  patientName: string;
  /** Doctors get an edit button, patients do not. */
  onEdit?: () => void;
}

/** The prescription as the patient keeps it: readable on screen and when printed. */
export function PrescriptionView({
  prescription,
  doctorName,
  patientName,
  onEdit,
}: PrescriptionViewProps) {
  const openPdf = useOpenPrescriptionPdf(prescription.appointmentId);

  return (
    <article
      aria-label="Prescription"
      className="space-y-5 rounded-panel border border-line bg-surface p-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-line pb-4">
        <div>
          <p className="font-serif text-xl font-semibold">{doctorName}</p>
          <p className="text-sm text-ink-soft">
            For {patientName}, {format(new Date(prescription.updatedAt), 'd MMM yyyy')}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          {onEdit && (
            <Button variant="secondary" size="sm" onClick={onEdit}>
              Edit
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            loading={openPdf.isPending}
            onClick={() =>
              openPdf.mutate(undefined, { onError: (cause) => toast.error(getErrorMessage(cause)) })
            }
          >
            <Download aria-hidden="true" className="size-4" />
            Download PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer aria-hidden="true" className="size-4" />
            Print
          </Button>
        </div>
      </header>

      {prescription.diagnosis && (
        <section>
          <h3 className="font-sans text-sm font-semibold">Diagnosis</h3>
          <p className="text-ink-soft">{prescription.diagnosis}</p>
        </section>
      )}

      <section>
        <h3 className="font-sans text-sm font-semibold">Medicines</h3>
        <ul className="mt-2 divide-y divide-line">
          {prescription.medications.map((medication, index) => (
            <li key={`${medication.name}-${index}`} className="py-3">
              <p className="font-medium">{medication.name}</p>
              <p className="text-sm text-ink-soft">
                {medication.dosage}, {medication.frequency}, for {medication.durationDays}{' '}
                {medication.durationDays === 1 ? 'day' : 'days'}
              </p>
              {medication.instructions && (
                <p className="text-sm text-ink-soft">{medication.instructions}</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-sans text-sm font-semibold">Notes</h3>
        <p className="whitespace-pre-wrap text-ink-soft">{prescription.notes}</p>
      </section>

      {prescription.followUpDate && (
        <p className="text-sm">
          <span className="font-semibold">Follow-up:</span>{' '}
          {formatFullDate(prescription.followUpDate)}
        </p>
      )}
    </article>
  );
}
