import type { UseFormRegisterReturn } from 'react-hook-form';
import { TextAreaField, TextField } from '@/components/ui/text-field';
import type { ProfileValues } from './profile-schema';

export type FieldBinding = UseFormRegisterReturn & { error: string | undefined };

/** Lets any form that contains the profile fields (the doctor's own, or the admin's) share this markup. */
export type BindField = (name: keyof ProfileValues) => FieldBinding;

export function ProfileFields({ bind }: { bind: BindField }) {
  return (
    <>
      <TextField label="Specialty" {...bind('specialty')} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Years of experience" inputMode="numeric" {...bind('experienceYears')} />
        <TextField label="Consultation fee (₹)" inputMode="numeric" {...bind('consultationFee')} />
      </div>
      <TextField
        label="Qualifications (optional)"
        hint="For example, MBBS, MD (Medicine)"
        {...bind('qualification')}
      />
      <TextField
        label="Languages (optional)"
        hint="Separate with commas, for example English, Hindi"
        {...bind('languages')}
      />
      <TextAreaField
        label="About the doctor (optional)"
        hint="Patients see this on your page."
        {...bind('bio')}
      />
    </>
  );
}
