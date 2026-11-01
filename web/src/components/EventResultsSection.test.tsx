import { createElement, type PropsWithChildren } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { api } from '../services/api';
import EventResultsSection from './EventResultsSection';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('./ScrollReveal', () => ({ default: ({ children }: PropsWithChildren) => createElement('div', null, children) }));
vi.mock('framer-motion', () => ({ useReducedMotion: () => true, motion: { div: ({ children }: PropsWithChildren) => createElement('div', null, children) }, AnimatePresence: ({ children }: PropsWithChildren) => children }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('unblocks the archive layout after a failed result fetch without claiming there are no results', async () => {
  vi.spyOn(api, 'getEventResults').mockRejectedValue(new Error('Unavailable'));
  vi.spyOn(api, 'getEventResultsSummary').mockRejectedValue(new Error('Unavailable'));
  const onReady = vi.fn();
  render(createElement(EventResultsSection, { eventSlug: 'published-results', onReady }));
  await waitFor(() => expect(onReady).toHaveBeenCalledWith('published-results'));
  expect(screen.getByText('season.resultsUnavailable')).toBeTruthy();
  expect(screen.queryByText('results.noResults')).toBeNull();
});

it('keeps published divisions when only optional summary statistics fail', async () => {
  vi.spyOn(api, 'getEventResults').mockResolvedValue([{ division: 'Adult Black', results: [{ id: 1, placement: 1, competitor_name: 'Athlete One', academy: 'Academy', belt_rank: 'black' }] }] as Awaited<ReturnType<typeof api.getEventResults>>);
  vi.spyOn(api, 'getEventResultsSummary').mockRejectedValue(new Error('Summary unavailable'));
  const onReady = vi.fn();
  render(createElement(EventResultsSection, { eventSlug: 'published-results', onReady }));
  await waitFor(() => expect(onReady).toHaveBeenCalledWith('published-results'));
  expect(screen.getByText('Athlete One')).toBeTruthy();
  expect(screen.queryByText('season.resultsUnavailable')).toBeNull();
});
