import { expect, it } from 'vitest';
import { formatNumber } from './numbers';

it('formats whole ASJJF decimal points without .0 and keeps fractions', () => {
  expect(formatNumber('5351.0', 'en')).toBe('5,351');
  expect(formatNumber('5351.0', 'ja')).toBe('5,351');
  expect(formatNumber('5351.0', 'pt')).toBe('5.351');
  expect(formatNumber('5351.25', 'pt')).toBe('5.351,25');
  expect(formatNumber(0, 'ko')).toBe('0');
  expect(formatNumber('unknown', 'en')).toBe('—');
});
