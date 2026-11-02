import { createElement, type PropsWithChildren } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { api } from '../services/api';
import { MemoryRouter } from 'react-router-dom';
import EventResultsSection from './EventResultsSection';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }) }));
vi.mock('./ScrollReveal', () => ({ default: ({ children }: PropsWithChildren) => createElement('div', null, children) }));
vi.mock('framer-motion', () => ({ useReducedMotion: () => true, motion: { div: ({ children }: PropsWithChildren) => createElement('div', null, children) }, AnimatePresence: ({ children }: PropsWithChildren) => children }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('unblocks the archive layout after a failed result fetch without claiming there are no results', async () => {
  vi.spyOn(api, 'getEventResults').mockRejectedValue(new Error('Unavailable'));
  vi.spyOn(api, 'getEventResultsSummary').mockRejectedValue(new Error('Unavailable'));
  const onReady = vi.fn();
  render(createElement(MemoryRouter, null, createElement(EventResultsSection, { eventSlug: 'published-results', onReady })));
  await waitFor(() => expect(onReady).toHaveBeenCalledWith('published-results'));
  expect(screen.getByText('season.resultsUnavailable')).toBeTruthy();
  expect(screen.queryByText('results.noResults')).toBeNull();
});

it('keeps published divisions when only optional summary statistics fail', async () => {
  vi.spyOn(api, 'getEventResults').mockResolvedValue([{ division: 'Adult Black', results: [{ id: 1, placement: 1, competitor_name: 'Athlete One', academy: 'Academy', belt_rank: 'black' }] }] as Awaited<ReturnType<typeof api.getEventResults>>);
  vi.spyOn(api, 'getEventResultsSummary').mockRejectedValue(new Error('Summary unavailable'));
  const onReady = vi.fn();
  render(createElement(MemoryRouter, null, createElement(EventResultsSection, { eventSlug: 'published-results', onReady })));
  await waitFor(() => expect(onReady).toHaveBeenCalledWith('published-results'));
  expect(screen.getByText('Athlete One')).toBeTruthy();
  expect(screen.queryByText('season.resultsUnavailable')).toBeNull();
});

it('separates disciplines, preserves raw division titles and links canonical athlete names without repeated belt badges', async () => {
  const gi = '[GI] FEMALE BLACK ADULT 18 HEAVY';
  const nogi = '[NOGI] MALE WHITE MASTER 36 LIGHT';
  vi.spyOn(api, 'getEventResults').mockResolvedValue([
    { division: gi, results: [{ id: 13921, placement: 1, competitor_id: 2278, competitor_name: 'Gabrieli Pessanha', academy: 'Infight Japan', belt_rank: 'black', gender: 'female', weight_class: 'heavy' }] },
    { division: nogi, results: [{ id: 999, placement: 3, competitor_name: 'Another Athlete', academy: 'Result Academy', belt_rank: 'white', gender: 'male', weight_class: 'light' }] },
  ] as Awaited<ReturnType<typeof api.getEventResults>>);
  vi.spyOn(api, 'getEventResultsSummary').mockResolvedValue(null as unknown as Awaited<ReturnType<typeof api.getEventResultsSummary>>);
  render(createElement(MemoryRouter, null, createElement(EventResultsSection, { eventSlug: 'published-results' })));
  const athlete = await screen.findByRole('link', { name: 'Gabrieli Pessanha' });
  expect(athlete.getAttribute('href')).toBe('/competitors/2278');
  expect(screen.getByText('officialRankings.values.female · officialRankings.values.black · officialRankings.values.adultAge · watch.weight.heavy').closest('[title]')?.getAttribute('title')).toBe(gi);
  expect(screen.queryByText('Another Athlete')).toBeNull();
  expect(athlete.closest('.ui-card')?.querySelector('.ui-chip')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'officialRankings.nogi' }));
  expect(screen.queryByText('Gabrieli Pessanha')).toBeNull();
  const unknownAthlete = await screen.findByRole('link', { name: 'Another Athlete' });
  expect(unknownAthlete.getAttribute('href')).toBe('/competitors/profile?result_id=999');
});
