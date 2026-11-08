import { format } from 'date-fns';
import { CalendarPlus, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { ErrorAlert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { SelectField, TextField } from '@/components/ui/text-field';
import { useAuth } from '@/features/auth/use-auth';
import { getErrorMessage } from '@/lib/errors';
import { formatFullDate, formatTimeRange } from '@/lib/format';
import { planSlots, SLOT_LENGTHS } from '@/lib/slot-generator';
import { groupSlotsByDay } from '@/lib/slots';
import { useCreateSlots, useDeleteSlot, useMySlots } from './doctor-queries';

export function SlotsPage() {
  const { user } = useAuth();
  const doctorId = user?.id ?? '';

  const slots = useMySlots(doctorId);
  const createSlots = useCreateSlots(doctorId);
  const deleteSlot = useDeleteSlot(doctorId);

  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [from, setFrom] = useState('09:00');
  const [to, setTo] = useState('13:00');
  const [minutes, setMinutes] = useState<number>(30);
  const [formError, setFormError] = useState<string | null>(null);

  const days = useMemo(
    () => groupSlotsByDay(slots.data ?? [], { includeBooked: true }),
    [slots.data],
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const plan = planSlots({ date, from, to, minutes });
    if (!plan.ok) {
      setFormError(plan.message);
      return;
    }
    createSlots.mutate(plan.slots, {
      onSuccess: (created) => toast.success(`Added ${created.length} open times`),
      onError: (error) => setFormError(getErrorMessage(error)),
    });
  };

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl">Open times</h1>
        <p className="text-ink-soft">
          Add a block of time and it is cut into equal slots that patients can book.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        noValidate
        className="space-y-5 rounded-panel border border-line bg-surface p-6"
      >
        <h2 className="text-2xl">Add open times</h2>
        {formError && <ErrorAlert title="Could not add open times">{formError}</ErrorAlert>}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <TextField
            label="Day"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <TextField
            label="From"
            type="time"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <TextField label="Until" type="time" value={to} onChange={(e) => setTo(e.target.value)} />
          <SelectField
            label="Each visit lasts"
            value={String(minutes)}
            onChange={(e) => setMinutes(Number(e.target.value))}
          >
            {SLOT_LENGTHS.map((length) => (
              <option key={length} value={length}>
                {length} minutes
              </option>
            ))}
          </SelectField>
        </div>
        <Button type="submit" loading={createSlots.isPending}>
          Add open times
        </Button>
      </form>

      <section aria-labelledby="mine" className="space-y-6">
        <h2 id="mine" className="text-2xl">
          Your next 30 days
        </h2>

        {slots.isPending && (
          <div aria-busy="true">
            <Skeleton className="h-40 w-full" />
          </div>
        )}
        {slots.isError && (
          <ErrorAlert title="Could not load your open times" onRetry={() => void slots.refetch()}>
            {getErrorMessage(slots.error)}
          </ErrorAlert>
        )}
        {slots.data && days.length === 0 && (
          <EmptyState icon={CalendarPlus} title="You have no open times">
            Use the form above to add your first block.
          </EmptyState>
        )}

        {days.map((day) => (
          <section key={day.key} aria-label={formatFullDate(day.date)} className="space-y-2">
            <h3 className="font-sans text-base font-semibold">{formatFullDate(day.date)}</h3>
            <ul className="divide-y divide-line rounded-panel border border-line bg-surface">
              {day.slots.map((slot) => (
                <li key={slot.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <span>{formatTimeRange(slot.startTime, slot.endTime)}</span>
                  {slot.isBooked ? (
                    <Badge tone="ok">Booked</Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${formatTimeRange(slot.startTime, slot.endTime)}`}
                      onClick={() =>
                        deleteSlot.mutate(slot.id, {
                          onError: (error) => toast.error(getErrorMessage(error)),
                        })
                      }
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                      Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </section>
    </div>
  );
}
