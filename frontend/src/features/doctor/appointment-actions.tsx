import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useSetAppointmentStatus } from '@/features/appointments/appointment-queries';
import { ConsultationLink } from '@/features/consultation/consultation-link';
import { getErrorMessage } from '@/lib/errors';
import type { Appointment } from '@/types/api';

interface AppointmentActionsProps {
  appointment: Appointment;
  onCancel: (appointment: Appointment) => void;
  now?: Date;
}

/** The buttons a doctor can use on one appointment, depending on its status and time. */
export function AppointmentActions({
  appointment,
  onCancel,
  now = new Date(),
}: AppointmentActionsProps) {
  const setStatus = useSetAppointmentStatus();
  const started = new Date(appointment.scheduledStart) <= now;

  const run = (status: 'CONFIRMED' | 'COMPLETED', message: string) =>
    setStatus.mutate(
      { id: appointment.id, status },
      {
        onSuccess: () => toast.success(message),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );

  switch (appointment.status) {
    case 'PENDING':
      return (
        <div className="flex gap-2">
          <Button
            size="sm"
            loading={setStatus.isPending}
            onClick={() => run('CONFIRMED', 'Appointment confirmed')}
          >
            Confirm
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onCancel(appointment)}>
            Decline
          </Button>
        </div>
      );
    case 'CONFIRMED':
      return (
        <div className="flex gap-2">
          <ConsultationLink appointment={appointment} />
          {started && (
            <Button
              size="sm"
              loading={setStatus.isPending}
              onClick={() => run('COMPLETED', 'Marked as completed')}
            >
              Mark completed
            </Button>
          )}
          {!started && (
            <Button variant="secondary" size="sm" onClick={() => onCancel(appointment)}>
              Cancel
            </Button>
          )}
        </div>
      );
    default:
      return <ConsultationLink appointment={appointment} />;
  }
}
