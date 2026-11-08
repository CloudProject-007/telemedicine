import { CalendarX } from 'lucide-react';
import { useState } from 'react';
import { ErrorAlert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { SelectField } from '@/components/ui/text-field';
import { useAppointmentSearch } from '@/features/appointments/appointment-queries';
import { StatusBadge } from '@/features/appointments/status-badge';
import { getErrorMessage } from '@/lib/errors';
import { formatFullDate, formatTimeRange } from '@/lib/format';
import type { AppointmentStatus } from '@/types/api';

const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: 'PENDING', label: 'Waiting for confirmation' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PAGE_SIZE = 15;

export function AppointmentsAdminPage() {
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [page, setPage] = useState(1);
  const appointments = useAppointmentSearch({
    status: status || undefined,
    page,
    limit: PAGE_SIZE,
    order: 'desc',
  });

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl">Appointments</h1>
        <p className="text-ink-soft">Every appointment on the platform, newest first.</p>
      </div>

      <div className="max-w-xs">
        <SelectField
          label="Show"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as AppointmentStatus | '');
            setPage(1);
          }}
        >
          <option value="">All appointments</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </div>

      {appointments.isPending && (
        <div aria-busy="true">
          <Skeleton className="h-48 w-full" />
        </div>
      )}
      {appointments.isError && (
        <ErrorAlert title="Could not load appointments" onRetry={() => void appointments.refetch()}>
          {getErrorMessage(appointments.error)}
        </ErrorAlert>
      )}

      {appointments.data && appointments.data.items.length === 0 && (
        <EmptyState icon={CalendarX} title="No appointments match">
          Choose a different status to see more.
        </EmptyState>
      )}

      {appointments.data && appointments.data.items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-panel border border-line bg-surface">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">Appointments</caption>
              <thead className="border-b border-line text-ink-soft">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    When
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Patient
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Doctor
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {appointments.data.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{formatFullDate(item.scheduledStart)}</div>
                      <div className="text-ink-soft">
                        {formatTimeRange(item.scheduledStart, item.scheduledEnd)}
                      </div>
                    </td>
                    <td className="px-4 py-3">{item.patient.name}</td>
                    <td className="px-4 py-3">
                      <div>{item.doctor.name}</div>
                      {item.doctor.specialty && (
                        <div className="text-ink-soft">{item.doctor.specialty}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={appointments.data.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
