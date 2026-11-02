import { getDateLocale } from './dateLocale';

/** ASJJF decimal strings may be whole points; preserve genuine fractions. */
export function formatNumber(value: number | string, language: string): string {
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat(getDateLocale(language), { maximumFractionDigits: 20 }).format(number)
    : '—';
}
