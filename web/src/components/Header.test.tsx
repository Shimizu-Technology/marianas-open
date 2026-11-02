import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';

const events: never[] = [];
vi.mock('../hooks/useApi', () => ({ useEvents: () => ({ events }) }));
vi.mock('../contexts/OrganizationContext', () => ({ useOrg: () => ({ name: 'Marianas Open', logo_url: null }) }));
vi.mock('../hooks/useTranslatedField', () => ({ useTranslatedField: () => ({ tf: () => '' }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('./LanguageSwitcher', () => ({ default: () => <button>Language</button> }));
vi.mock('../services/api', () => ({ api: {
  getImpactStatus: async () => ({ visible: false }),
  getCompetitors: async () => ({ competitors: [] }),
  getAcademies: async () => ({ academies: [] }),
} }));
afterEach(() => { cleanup(); document.body.style.cssText = ''; });

it('closes mobile navigation before shortcut search and releases all scrolling locks on Escape', () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  render(<MemoryRouter><Header /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'nav.toggleMenu' }));
  expect(document.body.style.overflow).toBe('hidden');
  fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
  expect(screen.queryByRole('navigation', { name: 'nav.toggleMenu' })).toBeNull();
  expect(screen.getByRole('dialog')).toBeTruthy();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.body.style.overflow).toBe('');
  expect(document.body.style.position).toBe('');
});

it('closes a desktop dropdown from a focused child link and restores its trigger', () => {
  render(<MemoryRouter><Header /></MemoryRouter>);
  const trigger = screen.getByRole('button', { name: 'nav.events' });
  fireEvent.click(trigger);
  const link = screen.getByRole('link', { name: 'nav.calendar' }); link.focus();
  fireEvent.keyDown(link, { key: 'Escape' });
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(trigger);
});
