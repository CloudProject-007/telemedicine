import { Link } from 'react-router-dom';
import { ErrorAlert } from '@/components/ui/alert';
import { buttonStyles } from '@/components/ui/button-styles';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/errors';
import { usePlatformStats } from './admin-queries';

export function OverviewPage() {
  const { data, isPending, isError, error, refetch } = usePlatformStats();

  const figures = data
    ? [
        { label: 'Doctors on the platform', value: data.doctors },
        { label: 'Waiting for confirmation', value: data.byStatus.PENDING },
        { label: 'Confirmed', value: data.byStatus.CONFIRMED },
        { label: 'Completed', value: data.byStatus.COMPLETED },
        { label: 'Cancelled', value: data.byStatus.CANCELLED },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl">Overview</h1>
        <p className="text-ink-soft">
          A quick look at the doctors and appointments on the platform.
        </p>
      </div>

      {isPending && (
        <div aria-busy="true">
          <Skeleton className="h-40 w-full" />
        </div>
      )}
      {isError && (
        <ErrorAlert title="Could not load the overview" onRetry={() => void refetch()}>
          {getErrorMessage(error)}
        </ErrorAlert>
      )}

      {data && (
        <dl className="divide-y divide-line rounded-panel border border-line bg-surface">
          {figures.map(({ label, value }) => (
            <div key={label} className="flex items-baseline justify-between gap-4 px-5 py-4">
              <dt className="text-ink-soft">{label}</dt>
              <dd className="font-serif text-2xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-wrap gap-3">
        <Link to="/admin/doctors/new" className={buttonStyles()}>
          Add a doctor
        </Link>
        <Link to="/admin/appointments" className={buttonStyles({ variant: 'secondary' })}>
          View appointments
        </Link>
      </div>
    </div>
  );
}
