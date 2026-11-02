import { expect, it } from 'vitest';
import i18n from './i18n';

it('updates the document language and persists the selected locale', async () => {
  await i18n.changeLanguage('ja');
  expect(document.documentElement.lang).toBe('ja');
  expect(localStorage.getItem('i18nextLng')).toBe('ja');
  await i18n.changeLanguage('en');
  expect(document.documentElement.lang).toBe('en');
  expect(localStorage.getItem('i18nextLng')).toBe('en');
});
