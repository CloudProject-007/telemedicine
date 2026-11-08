import { describe, expect, it } from 'vitest';
import { createDoctorSchema } from '@/features/admin/create-doctor-schema';
import { parseLanguages, profileSchema, toProfileInput, toProfileValues } from './profile-schema';

const valid = {
  specialty: 'Cardiology',
  experienceYears: '12',
  consultationFee: '800',
  qualification: 'MBBS, MD',
  bio: '',
  languages: 'English, Hindi',
};

describe('profileSchema', () => {
  it('accepts a complete profile and converts it for the API', () => {
    const parsed = profileSchema.parse(valid);
    expect(toProfileInput(parsed)).toMatchObject({
      specialty: 'Cardiology',
      experienceYears: 12,
      consultationFee: 800,
      languages: ['English', 'Hindi'],
    });
  });

  it.each([
    ['experienceYears', '-1'],
    ['experienceYears', '71'],
    ['experienceYears', '2.5'],
    ['consultationFee', 'free'],
    ['consultationFee', '100001'],
    ['specialty', 'x'],
  ])('rejects %s = %s', (field, value) => {
    expect(profileSchema.safeParse({ ...valid, [field]: value }).success).toBe(false);
  });

  it('limits languages to 10', () => {
    const many = Array.from({ length: 11 }, (_, i) => `Lang${i}`).join(',');
    expect(profileSchema.safeParse({ ...valid, languages: many }).success).toBe(false);
  });

  it('round-trips an API doctor into form values', () => {
    const values = toProfileValues({
      specialty: 'ENT',
      experienceYears: 3,
      consultationFee: 500,
      qualification: null,
      bio: null,
      languages: ['English'],
    });
    expect(values).toMatchObject({ experienceYears: '3', qualification: '', languages: 'English' });
  });
});

describe('parseLanguages', () => {
  it('trims and drops empty entries', () => {
    expect(parseLanguages(' English ,, Hindi ,')).toEqual(['English', 'Hindi']);
  });
});

describe('createDoctorSchema', () => {
  const account = {
    name: 'Dr Anita Sharma',
    email: 'anita@example.com',
    phone: '',
    password: 'secret123',
  };

  it('needs both the account and the profile', () => {
    expect(createDoctorSchema.safeParse({ ...account, ...valid }).success).toBe(true);
    expect(createDoctorSchema.safeParse(account).success).toBe(false);
    expect(createDoctorSchema.safeParse(valid).success).toBe(false);
  });
});
