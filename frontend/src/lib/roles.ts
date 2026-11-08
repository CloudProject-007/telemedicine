import type { Role } from '@/types/api';

/** Where each role lands after signing in. */
export const HOME_BY_ROLE: Record<Role, string> = {
  PATIENT: '/doctors',
  DOCTOR: '/doctor',
  ADMIN: '/admin',
};

export interface NavItem {
  to: string;
  label: string;
  /** Match the path exactly, so a parent link is not highlighted on its children. */
  end?: boolean;
}

export const NAV_BY_ROLE: Record<Role, readonly NavItem[]> = {
  PATIENT: [
    { to: '/doctors', label: 'Find a doctor' },
    { to: '/appointments', label: 'My appointments' },
    { to: '/documents', label: 'My records' },
    { to: '/settings/notifications', label: 'Reminders' },
  ],
  DOCTOR: [
    { to: '/doctor', label: 'Schedule', end: true },
    { to: '/doctor/slots', label: 'Open times' },
    { to: '/doctor/profile', label: 'Profile' },
    { to: '/settings/notifications', label: 'Reminders' },
  ],
  ADMIN: [
    { to: '/admin', label: 'Overview', end: true },
    { to: '/admin/doctors', label: 'Doctors' },
    { to: '/admin/appointments', label: 'Appointments' },
  ],
};
