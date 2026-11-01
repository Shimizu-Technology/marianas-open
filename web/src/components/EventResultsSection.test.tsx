import { createElement } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { api } from '../services/api';
import EventResultsSection from './EventResultsSection';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
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
