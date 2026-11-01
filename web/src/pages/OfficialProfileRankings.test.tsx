import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import en from '../locales/en.json';
import CompetitorProfilePage from './CompetitorProfilePage';
import AcademyPage from './AcademyPage';
import CompetitorStandings from '../components/rankings/CompetitorStandings';
import { api } from '../services/api';
import { officialRankingsApi } from '../services/officialRankingsApi';
import type { CompetitorDetail, AcademyDetail } from '../services/api';
import type { OfficialStandings } from '../services/officialRankingsApi';

vi.mock('../components/SEO', () => ({ default: () => null }));
vi.mock('../services/api', () => ({ api: { getCompetitor: vi.fn(), getCompetitorProfile: vi.fn(), getAcademy: vi.fn() } }));
vi.mock('../services/officialRankingsApi', () => ({ officialRankingsApi: { getStandings: vi.fn() } }));
const i18n = createInstance();
await i18n.init({ lng: 'en', resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
const standings: OfficialStandings = { season_year: 2026, standings: [{ position: 7, points: '143.25', division: { id: 21, asjjf_division_id: 20401, gender: 'Male', age_group: 'Adult 18', belt: 'Black', label: 'Male Adult 18 Black', position: 1, status: 'available', last_synced_at: null }, list: { id: 1, asjjf_ranking_id: 227, season_year: 2026, circuit: 'marianas_pro', discipline: 'gi', kind: 'individual', category: 'adult', title: 'Marianas Pro', status: 'available', last_synced_at: null, source_url: 'https://asjjf.org/ranking/individualRanking/227' } }] };
const competitor = { id: 7, first_name: 'Test', last_name: 'Athlete', full_name: 'Test Athlete', academy: 'Biba', academy_slug: 'biba', country_code: 'GU', gold_medals: 1, silver_medals: 0, bronze_medals: 1, events_competed: 1, total_points: 99999, results: [{ event_id: 1, event_name: 'Copa', event_slug: 'copa', event_date: '2026-01-01', division: 'Male Adult Black', placement: 1, belt_rank: 'black', points_earned: 88888 }] } as CompetitorDetail;
function setup(element: React.ReactNode, url = '/') {
  return render(<I18nextProvider i18n={i18n}><MemoryRouter initialEntries={[url]}>{element}</MemoryRouter></I18nextProvider>);
}
beforeEach(() => {
  vi.mocked(api.getCompetitor).mockResolvedValue(competitor);
  vi.mocked(officialRankingsApi.getStandings).mockResolvedValue(standings);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('shows current-season official standings alongside medal history without formula points', async () => {
  setup(<Routes><Route path="/competitors/:id" element={<CompetitorProfilePage />} /></Routes>, '/competitors/7');
  await screen.findByRole('heading', { name: 'Test Athlete' });
  await screen.findByRole('heading', { name: 'ASJJF standings · 2026' }, { timeout: 5000 });
  expect(officialRankingsApi.getStandings).toHaveBeenCalledWith(7, expect.any(AbortSignal));
  expect(screen.getByText('#7')).toBeTruthy();
  expect(screen.getByText('143.25')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Medal history' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Copa' }).getAttribute('href')).toBe('/events/copa');
  expect(screen.queryByText('99999')).toBeNull();
  expect(screen.queryByText('88888')).toBeNull();
  expect(screen.queryByRole('columnheader', { name: 'Points Earned' })).toBeNull();
  const query = new URL(screen.getByRole('link', { name: 'Male · Adult 18 · Black' }).getAttribute('href')!, 'https://example.com').searchParams;
  expect(Object.fromEntries(query)).toMatchObject({ season: '2026', discipline: 'gi', division_id: '21' });
});

it('keeps official standings failures retryable independently of medal history', async () => {
  vi.mocked(officialRankingsApi.getStandings).mockRejectedValueOnce(new Error('backend details'));
  setup(<Routes><Route path="/competitors/:id" element={<CompetitorProfilePage />} /></Routes>, '/competitors/7');
  await screen.findByRole('alert');
  expect(screen.getByRole('link', { name: 'Copa' })).toBeTruthy();
  expect(screen.queryByText('backend details')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByText('143.25');
});

it('explains absent current-season standings without presenting a zero ranking', async () => {
  vi.mocked(officialRankingsApi.getStandings).mockResolvedValue({ season_year: 2026, standings: [] });
  setup(<CompetitorStandings competitorId={7} />);
  await screen.findByText('No current-season official standing is linked to this athlete.');
  expect(screen.queryByText('#0')).toBeNull();
});

it('does not request official standings by ambiguous legacy athlete names', () => {
  setup(<CompetitorStandings />);
  expect(screen.getByText('Official standings are available on matched athlete profiles.')).toBeTruthy();
  expect(officialRankingsApi.getStandings).not.toHaveBeenCalled();
});

it('removes computed totals from academy and roster medal history', async () => {
  vi.mocked(api.getAcademy).mockResolvedValue({ id: 8, name: 'Biba', slug: 'biba', total_points: 99999, gold: 1, silver: 2, bronze: 3, athletes: [{ id: 7, first_name: 'Test', last_name: 'Athlete', full_name: 'Test Athlete', total_points: 88888, gold: 1, silver: 0, bronze: 0 }] } as AcademyDetail);
  setup(<Routes><Route path="/teams/:slug" element={<AcademyPage />} /></Routes>, '/teams/biba');
  await screen.findByRole('heading', { name: 'Biba' });
  expect(screen.queryByText('99999')).toBeNull();
  expect(screen.queryByText(/88888/)).toBeNull();
  expect(screen.queryByText('Total Points')).toBeNull();
  expect(screen.getByRole('link', { name: /Test Athlete/ }).getAttribute('href')).toBe('/competitors/7');
});

it('clears a previous athlete while navigating to a missing athlete', async () => {
  const { rerender } = setup(<CompetitorStandings competitorId={7} />);
  await screen.findByText('143.25');
  vi.mocked(officialRankingsApi.getStandings).mockRejectedValue(new Error('missing'));
  rerender(<I18nextProvider i18n={i18n}><MemoryRouter><CompetitorStandings competitorId={99} /></MemoryRouter></I18nextProvider>);
  await waitFor(() => expect(screen.queryByText('143.25')).toBeNull());
  await screen.findByRole('alert');
});
