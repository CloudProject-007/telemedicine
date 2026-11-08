import { CalendarCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ErrorAlert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppointments } from '@/features/appointments/appointment-queries';
import { AppointmentSlip } from '@/features/appointments/appointment-slip';
import { CancelDialog } from '@/features/appointments/cancel-dialog';
import { groupAppointments } from '@/lib/appointments';
import { getErrorMessage } from '@/lib/errors';
import type { Appointment } from '@/types/api';
import { AppointmentActions } from './appointment-actions';

export function SchedulePage() {
  const { data, isPending, isError, error, refetch } = useAppointments();
  const [toCancel, setToCancel] = useState<Appointment | null>(null);

  const groups = useMemo(() => {
    if (!data) return null;
    const { upcoming, past } = groupAppointments(data.items);
    return {
      waiting: upcoming.filter((item) => item.status === 'PENDING'),
      confirmed: upcoming.filter((item) => item.status === 'CONFIRMED'),
      past,
    };
  }, [data]);

  const renderList = (items: Appointment[]) => (
    <ul className="space-y-5">
      {items.map((item) => (
        <AppointmentSlip
          key={item.id}
          appointment={item}
          party="patient"
          action={<AppointmentActions appointment={item} onCancel={setToCancel} />}
        />
      ))}
    </ul>
  );

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl">Your schedule</h1>
        <p className="text-ink-soft">Confirm new requests and close visits when they are done.</p>
      </div>

      {isPending && (
        <div aria-busy="true" className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}

      {isError && (
        <ErrorAlert title="Could not load your schedule" onRetry={() => void refetch()}>
          {getErrorMessage(error)}
        </ErrorAlert>
      )}

      {data && data.items.length === 0 && (
        <EmptyState icon={CalendarCheck} title="No appointments yet">
          Add open times so patients can book you.
        </EmptyState>
      )}

      {groups && groups.waiting.length > 0 && (
        <section aria-labelledby="waiting" className="space-y-4">
          <h2 id="waiting" className="text-2xl">
            Waiting for your answer
          </h2>
          {renderList(groups.waiting)}
        </section>
      )}

      {groups && groups.confirmed.length > 0 && (
        <section aria-labelledby="confirmed" className="space-y-4">
          <h2 id="confirmed" className="text-2xl">
            Confirmed
          </h2>
          {renderList(groups.confirmed)}
        </section>
      )}

      {groups && groups.past.length > 0 && (
        <section aria-labelledby="past" className="space-y-4">
          <h2 id="past" className="text-2xl">
            Past
          </h2>
          {renderList(groups.past)}
        </section>
      )}

      <CancelDialog appointment={toCancel} onClose={() => setToCancel(null)} party="patient" />
    </div>
  );
}
