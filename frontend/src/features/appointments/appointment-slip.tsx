import { format } from 'date-fns';
import type { ReactNode } from 'react';
import { formatTimeRange } from '@/lib/format';
import type { Appointment } from '@/types/api';
import { StatusBadge } from './status-badge';

interface AppointmentSlipProps {
  appointment: Appointment;
  action?: ReactNode;
  /** Whose name leads the slip: patients see the doctor, doctors see the patient. */
  party?: 'doctor' | 'patient';
}

/** An appointment drawn as a prescription slip: date on the stub, details beside it. */
export function AppointmentSlip({ appointment, action, party = 'doctor' }: AppointmentSlipProps) {
  const start = new Date(appointment.scheduledStart);
  const cancelled = appointment.status === 'CANCELLED';

  return (
    <li className="slip">
      <div className="slip-stub flex flex-col items-center justify-center px-2 py-5 text-center">
        <span className="text-sm text-ink-soft">{format(start, 'MMM')}</span>
        <span className="font-serif text-3xl leading-none font-semibold">{format(start, 'd')}</span>
        <span className="mt-1 text-sm text-ink-soft">{format(start, 'EEE')}</span>
      </div>
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className={cancelled ? 'text-ink-soft line-through' : 'font-medium'}>
            {formatTimeRange(appointment.scheduledStart, appointment.scheduledEnd)}
          </p>
          <p className="font-serif text-xl font-semibold">
            {party === 'patient' ? appointment.patient.name : appointment.doctor.name}
          </p>
          {party === 'doctor' && appointment.doctor.specialty && (
            <p className="text-sm text-ink-soft">{appointment.doctor.specialty}</p>
          )}
          {appointment.reason && (
            <p className="text-sm text-ink-soft">Reason: {appointment.reason}</p>
          )}
          {cancelled && appointment.cancelledReason && (
            <p className="text-sm text-ink-soft">Cancelled: {appointment.cancelledReason}</p>
          )}
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <StatusBadge status={appointment.status} />
          {action}
        </div>
      </div>
    </li>
  );
}
