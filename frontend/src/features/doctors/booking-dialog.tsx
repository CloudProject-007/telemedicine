import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useBookAppointment } from '@/features/appointments/appointment-queries';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { TextAreaField } from '@/components/ui/text-field';
import { ApiError } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/errors';
import { formatFullDate, formatRupees, formatTimeRange } from '@/lib/format';
import type { Doctor, Slot } from '@/types/api';

interface BookingDialogProps {
  doctor: Doctor;
  slot: Slot | null;
  onClose: () => void;
}

export function BookingDialog({ doctor, slot, onClose }: BookingDialogProps) {
  const [reason, setReason] = useState('');
  const navigate = useNavigate();
  const book = useBookAppointment(doctor.id);

  const close = () => {
    setReason('');
    book.reset();
    onClose();
  };

  const confirm = () => {
    if (!slot) return;
    book.mutate(
      { slotId: slot.id, ...(reason.trim() ? { reason: reason.trim() } : {}) },
      {
        onSuccess: () => {
          toast.success('Appointment booked');
          close();
          navigate('/appointments');
        },
      },
    );
  };

  const taken = book.error instanceof ApiError && book.error.status === 409;

  return (
    <Dialog
      open={slot !== null}
      onOpenChange={(open) => !open && close()}
      title="Confirm your appointment"
      description={
        slot
          ? `${doctor.name}, ${formatFullDate(slot.startTime)}, ${formatTimeRange(slot.startTime, slot.endTime)}. Fee: ${formatRupees(doctor.consultationFee)}.`
          : ''
      }
    >
      <div className="space-y-4">
        {book.isError && (
          <ErrorAlert title={taken ? 'Someone just booked this time' : 'Could not book'}>
            {taken ? 'Close this window and choose another time.' : getErrorMessage(book.error)}
          </ErrorAlert>
        )}
        <TextAreaField
          label="What would you like to discuss? (optional)"
          value={reason}
          maxLength={500}
          onChange={(event) => setReason(event.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={close}>
            Back
          </Button>
          <Button loading={book.isPending} onClick={confirm} disabled={taken}>
            Book appointment
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
