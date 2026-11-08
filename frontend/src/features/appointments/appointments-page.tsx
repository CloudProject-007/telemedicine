import { CalendarX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { buttonStyles } from '@/components/ui/button-styles';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { canCancel, groupAppointments } from '@/lib/appointments';
import { getErrorMessage } from '@/lib/errors';
import type { Appointment } from '@/types/api';
import { useAppointments } from './appointment-queries';
import { AppointmentSlip } from './appointment-slip';
import { ConsultationLink } from '@/features/consultation/consultation-link';
import { CancelDialog } from './cancel-dialog';

export function AppointmentsPage() {
  const { data, isPending, isError, error, refetch } = useAppointments();
  const [toCancel, setToCancel] = useState<Appointment | null>(null);
  const groups = useMemo(() => (data ? groupAppointments(data.items) : null), [data]);

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl">My appointments</h1>
        <p className="text-ink-soft">Your upcoming visits and your history.</p>
      </div>

      {isPending && (
        <div aria-busy="true" className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}

      {isError && (
        <ErrorAlert title="Could not load your appointments" onRetry={() => void refetch()}>
          {getErrorMessage(error)}
        </ErrorAlert>
      )}

      {data && data.items.length === 0 && (
        <EmptyState
          icon={CalendarX}
          title="You have no appointments yet"
          action={
            <Link to="/doctors" className={buttonStyles()}>
              Find a doctor
            </Link>
          }
        >
          Choose a doctor and pick a time that suits you.
        </EmptyState>
      )}

      {groups && groups.upcoming.length > 0 && (
        <section aria-labelledby="upcoming" className="space-y-4">
          <h2 id="upcoming" className="text-2xl">
            Upcoming
          </h2>
          <ul className="space-y-5">
            {groups.upcoming.map((item) => (
              <AppointmentSlip
                key={item.id}
                appointment={item}
                action={
                  <div className="flex gap-2">
                    <ConsultationLink appointment={item} />
                    {canCancel(item) && (
                      <Button variant="secondary" size="sm" onClick={() => setToCancel(item)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                }
              />
            ))}
          </ul>
        </section>
      )}

      {groups && groups.past.length > 0 && (
        <section aria-labelledby="past" className="space-y-4">
          <h2 id="past" className="text-2xl">
            Past
          </h2>
          <ul className="space-y-5">
            {groups.past.map((item) => (
              <AppointmentSlip
                key={item.id}
                appointment={item}
                action={<ConsultationLink appointment={item} />}
              />
            ))}
          </ul>
        </section>
      )}

      <CancelDialog appointment={toCancel} onClose={() => setToCancel(null)} />
    </div>
  );
}
