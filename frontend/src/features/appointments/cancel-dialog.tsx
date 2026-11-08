import { useState } from 'react';
import { toast } from 'sonner';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { TextAreaField } from '@/components/ui/text-field';
import { getErrorMessage } from '@/lib/errors';
import { formatFullDate, formatTime } from '@/lib/format';
import type { Appointment } from '@/types/api';
import { useCancelAppointment } from './appointment-queries';

interface CancelDialogProps {
  appointment: Appointment | null;
  onClose: () => void;
  /** Who is cancelling: a patient names the doctor, a doctor names the patient. */
  party?: 'doctor' | 'patient';
}

export function CancelDialog({ appointment, onClose, party = 'doctor' }: CancelDialogProps) {
  const [reason, setReason] = useState('');
  const cancel = useCancelAppointment();

  const close = () => {
    setReason('');
    cancel.reset();
    onClose();
  };

  const confirm = () => {
    if (!appointment) return;
    cancel.mutate(
      { id: appointment.id, ...(reason.trim() ? { reason: reason.trim() } : {}) },
      {
        onSuccess: () => {
          toast.success('Appointment cancelled');
          close();
        },
      },
    );
  };

  return (
    <Dialog
      open={appointment !== null}
      onOpenChange={(open) => !open && close()}
      title="Cancel this appointment?"
      description={
        appointment
          ? `${party === 'patient' ? appointment.patient.name : appointment.doctor.name}, ${formatFullDate(appointment.scheduledStart)} at ${formatTime(appointment.scheduledStart)}. The time will open up again.`
          : ''
      }
    >
      <div className="space-y-4">
        {cancel.isError && (
          <ErrorAlert title="Could not cancel">{getErrorMessage(cancel.error)}</ErrorAlert>
        )}
        <TextAreaField
          label="Reason (optional)"
          value={reason}
          maxLength={500}
          onChange={(event) => setReason(event.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Keep appointment
          </Button>
          <Button variant="danger" loading={cancel.isPending} onClick={confirm}>
            Cancel appointment
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
