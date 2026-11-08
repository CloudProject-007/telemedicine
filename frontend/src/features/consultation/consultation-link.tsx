import { MessageSquareText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonStyles } from '@/components/ui/button-styles';
import type { Appointment } from '@/types/api';
import { canUseRoom } from './call-availability';

/** The way into the room. Only shown once an appointment is confirmed or completed. */
export function ConsultationLink({ appointment }: { appointment: Appointment }) {
  if (!canUseRoom(appointment.status)) return null;

  return (
    <Link
      to={`/consultations/${appointment.id}`}
      className={buttonStyles({
        variant: appointment.status === 'CONFIRMED' ? 'primary' : 'secondary',
        size: 'sm',
      })}
    >
      <MessageSquareText aria-hidden="true" className="size-4" />
      {appointment.status === 'CONFIRMED' ? 'Open visit' : 'View visit'}
    </Link>
  );
}
