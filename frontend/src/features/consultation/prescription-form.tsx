import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ErrorAlert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextAreaField, TextField } from '@/components/ui/text-field';
import { getErrorMessage } from '@/lib/errors';
import type { Prescription } from '@/types/consultation';
import { useSavePrescription } from './consultation-queries';
import {
  EMPTY_MEDICATION,
  EMPTY_PRESCRIPTION,
  prescriptionSchema,
  toPrescriptionInput,
  toPrescriptionValues,
  type PrescriptionValues,
} from './prescription-schema';

interface PrescriptionFormProps {
  appointmentId: string;
  /** Set when editing a prescription that was already saved. */
  existing: Prescription | null;
  onDone: () => void;
}

export function PrescriptionForm({ appointmentId, existing, onDone }: PrescriptionFormProps) {
  const save = useSavePrescription(appointmentId);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PrescriptionValues>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: existing ? toPrescriptionValues(existing) : EMPTY_PRESCRIPTION,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'medications' });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    save.mutate(toPrescriptionInput(values), {
      onSuccess: () => {
        toast.success('Prescription saved');
        onDone();
      },
      onError: (error) => setFormError(getErrorMessage(error)),
    });
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-5 rounded-panel border border-line bg-surface p-6"
    >
      {formError && <ErrorAlert title="Could not save the prescription">{formError}</ErrorAlert>}

      <TextField
        label="Diagnosis (optional)"
        error={errors.diagnosis?.message}
        {...register('diagnosis')}
      />

      <fieldset className="space-y-4">
        <legend className="font-serif text-xl font-semibold">Medicines</legend>
        {fields.map((field, index) => {
          const fieldErrors = errors.medications?.[index];
          return (
            <div key={field.id} className="space-y-4 rounded-control border border-line p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">Medicine {index + 1}</p>
                {fields.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove medicine ${index + 1}`}
                    onClick={() => remove(index)}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                    Remove
                  </Button>
                )}
              </div>
              <TextField
                label="Name"
                error={fieldErrors?.name?.message}
                {...register(`medications.${index}.name`)}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <TextField
                  label="Dosage"
                  placeholder="500 mg"
                  error={fieldErrors?.dosage?.message}
                  {...register(`medications.${index}.dosage`)}
                />
                <TextField
                  label="How often"
                  placeholder="Twice a day"
                  error={fieldErrors?.frequency?.message}
                  {...register(`medications.${index}.frequency`)}
                />
                <TextField
                  label="For how many days"
                  inputMode="numeric"
                  error={fieldErrors?.durationDays?.message}
                  {...register(`medications.${index}.durationDays`)}
                />
              </div>
              <TextField
                label="Instructions (optional)"
                placeholder="After food"
                error={fieldErrors?.instructions?.message}
                {...register(`medications.${index}.instructions`)}
              />
            </div>
          );
        })}
        {errors.medications?.message && (
          <p role="alert" className="text-sm font-medium text-danger">
            {errors.medications.message}
          </p>
        )}
        {fields.length < 20 && (
          <Button variant="secondary" size="sm" onClick={() => append(EMPTY_MEDICATION)}>
            <Plus aria-hidden="true" className="size-4" />
            Add another medicine
          </Button>
        )}
      </fieldset>

      <TextAreaField
        label="Notes for the patient"
        hint="Advice, tests to get, and when to come back."
        error={errors.notes?.message}
        {...register('notes')}
      />
      <TextField
        label="Follow-up date (optional)"
        type="date"
        error={errors.followUpDate?.message}
        {...register('followUpDate')}
      />

      <div className="flex gap-2">
        <Button type="submit" loading={save.isPending}>
          Save prescription
        </Button>
        {existing && (
          <Button variant="secondary" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
