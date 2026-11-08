import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorAlert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/errors';
import { formatRupees } from '@/lib/format';
import type { Slot } from '@/types/api';
import { BookingDialog } from './booking-dialog';
import { DoctorAvatar } from './doctor-avatar';
import { useDoctor } from './doctor-queries';
import { SlotPicker } from './slot-picker';

export function DoctorDetailPage() {
  const { id = '' } = useParams();
  const { data: doctor, isPending, isError, error, refetch } = useDoctor(id);
  const [slot, setSlot] = useState<Slot | null>(null);

  const back = (
    <Link
      to="/doctors"
      className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      All doctors
    </Link>
  );

  if (isPending)
    return (
      <div aria-busy="true">
        <Skeleton className="h-64 w-full" />
      </div>
    );

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="space-y-4">
        {back}
        <ErrorAlert
          title={notFound ? 'This doctor was not found' : 'Could not load this doctor'}
          {...(notFound ? {} : { onRetry: () => void refetch() })}
        >
          {getErrorMessage(error)}
        </ErrorAlert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {back}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <DoctorAvatar name={doctor.name} className="size-20 text-3xl" />
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl">{doctor.name}</h1>
          <p className="text-ink-soft">
            {doctor.specialty}
            {doctor.qualification && <> · {doctor.qualification}</>}
          </p>
          <p className="text-sm text-ink-soft">
            {doctor.experienceYears} years of experience · {formatRupees(doctor.consultationFee)}{' '}
            per consultation
            {doctor.languages.length > 0 && <> · Speaks {doctor.languages.join(', ')}</>}
          </p>
        </div>
      </header>

      {doctor.bio && <p className="max-w-prose text-ink-soft">{doctor.bio}</p>}

      <section aria-labelledby="times" className="space-y-4">
        <h2 id="times" className="text-2xl">
          Choose a time
        </h2>
        <SlotPicker doctorId={doctor.id} onSelect={setSlot} />
      </section>

      <BookingDialog doctor={doctor} slot={slot} onClose={() => setSlot(null)} />
    </div>
  );
}
