import { CalendarX } from 'lucide-react';
import { useMemo } from 'react';
import { ErrorAlert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/errors';
import { formatFullDate, formatTime } from '@/lib/format';
import { groupSlotsByDay } from '@/lib/slots';
import type { Slot } from '@/types/api';
import { useDoctorSlots } from './doctor-queries';

export function SlotPicker({
  doctorId,
  onSelect,
}: {
  doctorId: string;
  onSelect: (slot: Slot) => void;
}) {
  const { data, isPending, isError, error, refetch } = useDoctorSlots(doctorId);
  const days = useMemo(() => groupSlotsByDay(data ?? []), [data]);

  if (isPending)
    return (
      <div aria-busy="true">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  if (isError) {
    return (
      <ErrorAlert title="Could not load available times" onRetry={() => void refetch()}>
        {getErrorMessage(error)}
      </ErrorAlert>
    );
  }
  if (days.length === 0) {
    return (
      <EmptyState icon={CalendarX} title="No open times in the next two weeks">
        Check again soon, or choose another doctor.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      {days.map((day) => (
        <section key={day.key} aria-label={formatFullDate(day.date)} className="space-y-2">
          <h3 className="font-sans text-base font-semibold">{formatFullDate(day.date)}</h3>
          <ul className="flex flex-wrap gap-2">
            {day.slots.map((slot) => (
              <li key={slot.id}>
                <button
                  type="button"
                  onClick={() => onSelect(slot)}
                  className="h-10 cursor-pointer rounded-control border border-ink/30 bg-surface px-3 text-sm font-medium hover:border-action hover:text-action-strong"
                >
                  {formatTime(slot.startTime)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
