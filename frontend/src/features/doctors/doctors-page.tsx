import { Search, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { SelectField, TextField } from '@/components/ui/text-field';
import { getErrorMessage } from '@/lib/errors';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { DoctorCard } from './doctor-card';
import { useDoctors, useSpecialties } from './doctor-queries';

function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function DoctorsPage() {
  // Filters live in the URL, so a search can be shared and the back button restores it.
  const [params, setParams] = useSearchParams();
  const specialty = params.get('specialty') ?? '';
  const page = parsePage(params.get('page'));

  const [text, setText] = useState(params.get('q') ?? '');
  const q = useDebouncedValue(text.trim(), 350);

  const specialties = useSpecialties();
  const doctors = useDoctors({
    q: q || undefined,
    specialty: specialty || undefined,
    page,
  });

  const updateParams = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };

  const onSearchChange = (value: string) => {
    setText(value);
    updateParams({ q: value.trim(), page: '' });
  };

  const result = doctors.data;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl">Find a doctor</h1>
        <p className="text-ink-soft">Pick a doctor, choose a time and book in under a minute.</p>
      </div>

      <form
        role="search"
        onSubmit={(event) => event.preventDefault()}
        className="grid gap-4 sm:grid-cols-[1fr_16rem]"
      >
        <TextField
          label="Doctor name or condition"
          type="search"
          value={text}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="For example, Sharma or skin rash"
        />
        <SelectField
          label="Specialty"
          value={specialty}
          onChange={(event) => updateParams({ specialty: event.target.value, page: '' })}
        >
          <option value="">All specialties</option>
          {specialties.data?.map((item) => (
            <option key={item.specialty} value={item.specialty}>
              {item.specialty} ({item.doctors})
            </option>
          ))}
        </SelectField>
      </form>

      {doctors.isError && (
        <ErrorAlert title="Could not load doctors" onRetry={() => void doctors.refetch()}>
          {getErrorMessage(doctors.error)}
        </ErrorAlert>
      )}

      {doctors.isPending && (
        <ul aria-busy="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index}>
              <Skeleton className="h-40 w-full" />
            </li>
          ))}
        </ul>
      )}

      {result && result.items.length === 0 && (
        <EmptyState
          icon={Search}
          title="No doctors match your search"
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setText('');
                setParams({}, { replace: true });
              }}
            >
              Clear search
            </Button>
          }
        >
          Try a different name or choose all specialties.
        </EmptyState>
      )}

      {result && result.items.length > 0 && (
        <>
          <p className="sr-only" role="status">
            {result.meta.total} doctors found
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </ul>
          <Pagination
            meta={result.meta}
            onPageChange={(next) => updateParams({ page: next > 1 ? String(next) : '' })}
          />
        </>
      )}

      {!doctors.isPending && !result && !doctors.isError && (
        <EmptyState icon={Stethoscope} title="No doctors yet" />
      )}
    </div>
  );
}
