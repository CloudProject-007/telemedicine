import { Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorAlert } from '@/components/ui/alert';
import { buttonStyles } from '@/components/ui/button-styles';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { TextField } from '@/components/ui/text-field';
import { useDoctors } from '@/features/doctors/doctor-queries';
import { getErrorMessage } from '@/lib/errors';
import { formatRupees } from '@/lib/format';
import { useDebouncedValue } from '@/lib/use-debounced-value';

export function DoctorsAdminPage() {
  const [text, setText] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(text.trim(), 350);
  const doctors = useDoctors({ q: q || undefined, page });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl">Doctors</h1>
          <p className="text-ink-soft">Everyone patients can book right now.</p>
        </div>
        <Link to="/admin/doctors/new" className={buttonStyles()}>
          Add a doctor
        </Link>
      </div>

      <div className="max-w-sm">
        <TextField
          label="Search by name or specialty"
          type="search"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {doctors.isPending && (
        <div aria-busy="true">
          <Skeleton className="h-48 w-full" />
        </div>
      )}
      {doctors.isError && (
        <ErrorAlert title="Could not load doctors" onRetry={() => void doctors.refetch()}>
          {getErrorMessage(doctors.error)}
        </ErrorAlert>
      )}

      {doctors.data && doctors.data.items.length === 0 && (
        <EmptyState icon={Stethoscope} title="No doctors found">
          Try a different search, or add a doctor.
        </EmptyState>
      )}

      {doctors.data && doctors.data.items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-panel border border-line bg-surface">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <caption className="sr-only">Doctors</caption>
              <thead className="border-b border-line text-ink-soft">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Specialty
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Experience
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Fee
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {doctors.data.items.map((doctor) => (
                  <tr key={doctor.id}>
                    <th scope="row" className="px-4 py-3 font-medium">
                      {doctor.name}
                    </th>
                    <td className="px-4 py-3">{doctor.specialty}</td>
                    <td className="px-4 py-3">{doctor.experienceYears} years</td>
                    <td className="px-4 py-3 text-right">{formatRupees(doctor.consultationFee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={doctors.data.meta} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
