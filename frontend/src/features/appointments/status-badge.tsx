import { Badge, type BadgeTone } from '@/components/ui/badge';
import type { AppointmentStatus } from '@/types/api';

const LABELS: Record<AppointmentStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: 'Waiting for confirmation', tone: 'signal' },
  CONFIRMED: { label: 'Confirmed', tone: 'ok' },
  COMPLETED: { label: 'Completed', tone: 'neutral' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, tone } = LABELS[status];
  return <Badge tone={tone}>{label}</Badge>;
}
