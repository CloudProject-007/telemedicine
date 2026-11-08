import { describe, expect, it } from 'vitest';
import { HOME_BY_ROLE, NAV_BY_ROLE } from './roles';

describe('role routing', () => {
  it('sends every role to a page that is in its own navigation', () => {
    for (const role of ['PATIENT', 'DOCTOR', 'ADMIN'] as const) {
      expect(NAV_BY_ROLE[role].some((item) => item.to === HOME_BY_ROLE[role])).toBe(true);
    }
  });

  it('lists each page once per role', () => {
    for (const items of Object.values(NAV_BY_ROLE)) {
      const paths = items.map((item) => item.to);
      expect(new Set(paths).size).toBe(paths.length);
    }
  });

  it('gives only patients and doctors the shared reminders page', () => {
    const has = (role: 'PATIENT' | 'DOCTOR' | 'ADMIN') =>
      NAV_BY_ROLE[role].some((item) => item.to === '/settings/notifications');
    expect([has('PATIENT'), has('DOCTOR'), has('ADMIN')]).toEqual([true, true, false]);
  });
});
