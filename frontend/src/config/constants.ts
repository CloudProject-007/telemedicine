/** Product name: rename here and it changes everywhere. */
export const APP_NAME = 'TeleCare';

/** Indian national emergency number, shown wherever we say the service is not for emergencies. */
export const EMERGENCY_NUMBER = '112';

/** How far ahead the booking screen looks for open times. The API allows up to 31 days. */
export const SLOT_LOOKAHEAD_DAYS = 14;

/** Specialties offered in the landing-page finder. The doctor list itself comes from the API. */
export const FEATURED_SPECIALTIES = [
  'General Medicine',
  'Cardiology',
  'Dermatology',
  'Pediatrics',
  'Gynecology',
  'Orthopedics',
  'Psychiatry',
  'ENT',
  'Neurology',
  'Diabetology',
] as const;
