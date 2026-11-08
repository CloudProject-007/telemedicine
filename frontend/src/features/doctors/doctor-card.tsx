import { Link } from 'react-router-dom';
import { formatRupees } from '@/lib/format';
import type { Doctor } from '@/types/api';
import { DoctorAvatar } from './doctor-avatar';

export function DoctorCard({ doctor }: { doctor: Doctor }) {
  return (
    <li>
      <Link
        to={`/doctors/${doctor.id}`}
        className="flex h-full flex-col gap-4 rounded-panel border border-line bg-surface p-5 transition-colors hover:border-ink/40"
      >
        <div className="flex items-center gap-3">
          <DoctorAvatar name={doctor.name} />
          <div className="min-w-0">
            <h2 className="truncate font-serif text-xl font-semibold">{doctor.name}</h2>
            <p className="text-sm text-ink-soft">{doctor.specialty}</p>
          </div>
        </div>
        <p className="text-sm text-ink-soft">
          {doctor.experienceYears} years of experience
          {doctor.languages.length > 0 && <> · Speaks {doctor.languages.join(', ')}</>}
        </p>
        <p className="mt-auto text-sm">
          <span className="font-semibold">{formatRupees(doctor.consultationFee)}</span>{' '}
          <span className="text-ink-soft">per consultation</span>
        </p>
      </Link>
    </li>
  );
}
