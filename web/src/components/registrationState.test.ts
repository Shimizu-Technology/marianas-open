import { expect, it } from 'vitest';
import { registrationState } from './registrationState';
const now = new Date('2026-11-02T00:00:00Z');
it('withholds future opening dates and accepts past, today and null dates', () => {
  expect(registrationState({ registration_opens_on: '2027-01-01' }, now)).toBe('scheduled');
  expect(registrationState({ registration_opens_on: '2026-10-31' }, now)).toBe('open');
  expect(registrationState({ registration_opens_on: '2026-11-02' }, now)).toBe('open');
  expect(registrationState({ registration_opens_on: null }, now)).toBe('open');
  expect(registrationState({ registration_opens_on: null, registration_not_open: true }, now)).toBe('pending');
  expect(registrationState({ date: '2026-01-01', registration_opens_on: null }, now)).toBe('closed');
});
