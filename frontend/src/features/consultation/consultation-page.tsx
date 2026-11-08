import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ErrorAlert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/features/appointments/status-badge';
import { useAuth } from '@/features/auth/use-auth';
import { ApiError } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/errors';
import { formatFullDate, formatTimeRange } from '@/lib/format';
import { HOME_BY_ROLE } from '@/lib/roles';
import type { Appointment, Role } from '@/types/api';
import { canUseRoom } from './call-availability';
import { CallPanel } from './call-panel';
import { ChatPanel } from './chat-panel';
import { useAppointment } from './consultation-queries';
import { DocumentsPanel } from './documents-panel';
import { PrescriptionPanel } from './prescription-panel';
import { RealtimeProvider } from './realtime-provider';

export function ConsultationPage() {
  const { appointmentId = '' } = useParams();
  const { user } = useAuth();
  const { data: appointment, isPending, isError, error, refetch } = useAppointment(appointmentId);

  if (!user) return null;
  const backTo = user.role === 'DOCTOR' ? HOME_BY_ROLE.DOCTOR : '/appointments';

  const back = (
    <Link
      to={backTo}
      className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink print:hidden"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Back to appointments
    </Link>
  );

  if (isPending) {
    return (
      <div aria-busy="true">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="space-y-4">
        {back}
        <ErrorAlert
          title={notFound ? 'This appointment was not found' : 'Could not load this appointment'}
          {...(notFound ? {} : { onRetry: () => void refetch() })}
        >
          {getErrorMessage(error)}
        </ErrorAlert>
      </div>
    );
  }

  const isDoctor = user.role === 'DOCTOR';
  const otherName = isDoctor ? appointment.patient.name : appointment.doctor.name;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        {back}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl sm:text-4xl">Visit with {otherName}</h1>
          <StatusBadge status={appointment.status} />
        </div>
        <p className="text-ink-soft">
          {formatFullDate(appointment.scheduledStart)},{' '}
          {formatTimeRange(appointment.scheduledStart, appointment.scheduledEnd)}
        </p>
      </div>

      {canUseRoom(appointment.status) ? (
        <RealtimeProvider>
          <Room appointment={appointment} selfId={user.id} role={user.role} otherName={otherName} />
        </RealtimeProvider>
      ) : (
        <ErrorAlert title="This visit is not open">
          {appointment.status === 'PENDING'
            ? 'The video call, chat and prescription open once the doctor confirms the appointment.'
            : 'This appointment was cancelled, so the video call and chat are closed.'}
        </ErrorAlert>
      )}
    </div>
  );
}

interface RoomProps {
  appointment: Appointment;
  selfId: string;
  role: Role;
  otherName: string;
}

function Room({ appointment, selfId, role, otherName }: RoomProps) {
  return (
    <>
      <div className="print:hidden">
        <CallPanel appointment={appointment} selfId={selfId} otherName={otherName} />
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="print:hidden">
          <ChatPanel appointmentId={appointment.id} selfId={selfId} otherName={otherName} />
        </div>
        <PrescriptionPanel
          appointmentId={appointment.id}
          role={role}
          doctorName={appointment.doctor.name}
          patientName={appointment.patient.name}
        />
      </div>
      <DocumentsPanel
        appointmentId={appointment.id}
        patientId={appointment.patient.id}
        role={role}
      />
    </>
  );
}
