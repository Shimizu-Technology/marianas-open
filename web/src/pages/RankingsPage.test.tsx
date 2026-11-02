import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import en from '../locales/en.json';
import RankingsPage from './RankingsPage';
import { officialRankingsApi } from '../services/officialRankingsApi';
import type { OfficialRankingDivision, OfficialRankingList, OfficialRankingEntry } from '../services/officialRankingsApi';

vi.mock('../components/SEO', () => ({ default: () => null }));
vi.mock('../services/officialRankingsApi', () => ({ officialRankingsApi: { getLists: vi.fn(), getDivisions: vi.fn(), getEntries: vi.fn() } }));
const i18n = createInstance();
await i18n.init({ lng: 'en', resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
const list: OfficialRankingList = { id: 1, asjjf_ranking_id: 227, season_year: 2026, circuit: 'marianas_pro', discipline: 'gi', kind: 'individual', category: 'adult', title: 'Marianas Pro', status: 'available', last_synced_at: '2026-11-01T00:00:00Z', source_url: 'https://asjjf.org/ranking/individualRanking/227' };
const division = (id: number, gender: string, age_group: string, belt: string, status: OfficialRankingDivision['status'] = 'available'): OfficialRankingDivision => ({ id, asjjf_division_id: id + 100, gender, age_group, belt, label: `${gender} ${age_group} ${belt}`, position: id, status, last_synced_at: list.last_synced_at });
const divisions = [division(11, 'Male', 'Adult 18', 'White'), division(12, 'Male', 'Adult 18', 'Black'), division(13, 'Male', 'Master 1', 'Brown'), division(14, 'Female', 'Adult 18', 'Blue'), division(15, 'Female', 'Kid 1', 'Yellow')];
const entry: OfficialRankingEntry = { id: 81, position: 4, name: 'Official Name', display_name: 'Matched Athlete', academy_name: 'Biba Jiu Jitsu', country_code: 'GU', raw_country_code: 'GUM', points: '123.50', gold: 2, silver: null, bronze: 0, competitor_id: 7, academy_id: 8, academy_slug: 'biba' };
function Location() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output data-testid="url">{location.search}</output><button onClick={() => navigate(-1)}>Back in test</button></>;
}
function setup(url = '/rankings') {
  return render(<I18nextProvider i18n={i18n}><MemoryRouter initialEntries={[url]}><RankingsPage /><Location /></MemoryRouter></I18nextProvider>);
}
beforeEach(() => {
  vi.mocked(officialRankingsApi.getLists).mockResolvedValue({ current_season: 2026, seasons: [2026, 2025], lists: [list, { ...list, id: 2, kind: 'team' }, { ...list, id: 3, kind: 'team', category: 'kids', status: 'pending' }, { ...list, id: 4, season_year: 2025, discipline: 'nogi' }] });
  vi.mocked(officialRankingsApi.getDivisions).mockResolvedValue({ divisions, groups: [] });
  vi.mocked(officialRankingsApi.getEntries).mockImplementation(async () => ({ entries: [entry, { ...entry, id: 82, position: 4, name: 'Unmatched', display_name: 'Unmatched', competitor_id: null, academy_slug: null, gold: null }], total: 2, page: 1, per_page: 50, list, division: divisions[1] }));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('official rankings', () => {
  it('defaults to Male Adult Black, preserves published points and ties, and links only matched identities', async () => {
    setup();
    expect(screen.getByText('Loading official rankings…')).toBeTruthy();
    await screen.findByRole('heading', { name: 'Official ASJJF Marianas Pro Ranking 2026' });
    await screen.findAllByText('Matched Athlete');
    expect((screen.getByLabelText('Gender') as HTMLSelectElement).value).toBe('Male');
    expect((screen.getByLabelText('Age group') as HTMLSelectElement).value).toBe('Adult 18');
    expect((screen.getByLabelText('Belt') as HTMLSelectElement).value).toBe('Black');
    expect(officialRankingsApi.getEntries).toHaveBeenLastCalledWith(1, 12, 1, expect.any(AbortSignal));
    expect(screen.getAllByText('123.5')).toHaveLength(4);
    expect(screen.getAllByText('#4')).toHaveLength(4);
    expect(screen.queryByText('#1')).toBeNull();
    expect(screen.getAllByRole('link', { name: 'Matched Athlete' })[0].getAttribute('href')).toBe('/competitors/7');
    expect(screen.getAllByRole('link', { name: 'Biba Jiu Jitsu' })[0].getAttribute('href')).toBe('/teams/biba');
    expect(screen.queryByRole('link', { name: 'Unmatched' })).toBeNull();
    expect(screen.getByRole('link', { name: 'View on ASJJF' }).getAttribute('href')).toBe(list.source_url);
    expect(screen.getByText(/Last synced:/)).toBeTruthy();
    expect(screen.queryByText(/calculated|formula|Fighter Ranking Points/i)).toBeNull();
  });

  it('cascades gender and age to valid belts and restores filters through browser history', async () => {
    setup('/rankings?ref=share');
    await screen.findByLabelText('Gender');
    fireEvent.change(screen.getByLabelText('Gender'), { target: { value: 'Female' } });
    await waitFor(() => expect(officialRankingsApi.getEntries).toHaveBeenLastCalledWith(1, 14, 1, expect.any(AbortSignal)));
    expect(within(screen.getByLabelText('Belt')).getAllByRole('option').map(o => o.textContent)).toEqual(['Blue']);
    fireEvent.change(screen.getByLabelText('Age group'), { target: { value: 'Kid 1' } });
    await waitFor(() => expect(officialRankingsApi.getEntries).toHaveBeenLastCalledWith(1, 15, 1, expect.any(AbortSignal)));
    expect((screen.getByLabelText('Belt') as HTMLSelectElement).value).toBe('Yellow');
    const query = new URLSearchParams(screen.getByTestId('url').textContent!);
    expect(Object.fromEntries(query)).toMatchObject({ season: '2026', discipline: 'gi', kind: 'individual', gender: 'Female', age: 'Kid 1', belt: 'Yellow', division_id: '15', ref: 'share' });
    fireEvent.click(screen.getByRole('button', { name: 'Back in test' }));
    await waitFor(() => expect((screen.getByLabelText('Age group') as HTMLSelectElement).value).toBe('Adult 18'));
    expect((screen.getByLabelText('Belt') as HTMLSelectElement).value).toBe('Blue');
  });

  it('loads shared season, discipline, and division filters rather than overwriting them', async () => {
    setup('/rankings?season=2025&discipline=nogi&gender=Female&age=Kid+1&belt=Yellow&division_id=15');
    await screen.findAllByText('Matched Athlete');
    expect(officialRankingsApi.getDivisions).toHaveBeenLastCalledWith(4, expect.any(AbortSignal));
    expect(officialRankingsApi.getEntries).toHaveBeenLastCalledWith(4, 15, 1, expect.any(AbortSignal));
    expect(screen.getByRole('heading', { name: 'Official ASJJF Marianas Pro Ranking 2025' })).toBeTruthy();
    expect((screen.getByLabelText('Gender') as HTMLSelectElement).value).toBe('Female');
  });

  it('shows team categories only when available and never requests team divisions', async () => {
    setup('/rankings?kind=team&category=kids');
    await screen.findAllByText('Matched Athlete');
    expect(officialRankingsApi.getDivisions).not.toHaveBeenCalled();
    expect(officialRankingsApi.getEntries).toHaveBeenLastCalledWith(2, undefined, 1, expect.any(AbortSignal));
    expect(screen.queryByRole('button', { name: 'Kids' })).toBeNull();
    expect(screen.queryByLabelText('Gender')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Gi · Team · Adults' })).toBeTruthy();
  });

  it('offers available kids teams and resets pagination when changing category', async () => {
    vi.mocked(officialRankingsApi.getLists).mockResolvedValue({ current_season: 2026, seasons: [2026], lists: [{ ...list, id: 2, kind: 'team' }, { ...list, id: 3, kind: 'team', category: 'kids' }] });
    setup('/rankings?kind=team&page=2');
    await screen.findAllByText('Matched Athlete');
    fireEvent.click(screen.getByRole('button', { name: 'Kids' }));
    await waitFor(() => expect(officialRankingsApi.getEntries).toHaveBeenLastCalledWith(3, undefined, 1, expect.any(AbortSignal)));
    expect(screen.getByRole('button', { name: 'Kids' }).getAttribute('aria-pressed')).toBe('true');
    expect(new URLSearchParams(screen.getByTestId('url').textContent!).has('page')).toBe(false);
  });

  it('recovers catalog failure with retry without exposing backend errors', async () => {
    vi.mocked(officialRankingsApi.getLists).mockRejectedValueOnce(new Error('internal secret error'));
    setup();
    await screen.findByRole('alert');
    expect(screen.queryByText('internal secret error')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findAllByText('Matched Athlete');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each(['pending', 'unavailable'] as const)('explains %s lists without attempting entries', async status => {
    vi.mocked(officialRankingsApi.getLists).mockResolvedValue({ current_season: 2026, seasons: [2026], lists: [{ ...list, status }] });
    setup();
    await screen.findByText(status === 'pending' ? 'This ranking is awaiting its first official sync.' : 'Official rankings are not available for this selection.');
    expect(officialRankingsApi.getEntries).not.toHaveBeenCalled();
  });

  it('shows pending divisions separately from a published empty division', async () => {
    vi.mocked(officialRankingsApi.getDivisions).mockResolvedValue({ divisions: [division(12, 'Male', 'Adult', 'Black', 'pending')], groups: [] });
    setup();
    await screen.findByText('This ranking is awaiting its first official sync.');
    expect(officialRankingsApi.getEntries).not.toHaveBeenCalled();
    cleanup();
    vi.mocked(officialRankingsApi.getDivisions).mockResolvedValue({ divisions, groups: [] });
    vi.mocked(officialRankingsApi.getEntries).mockResolvedValue({ entries: [], total: 0, page: 1, per_page: 50, list, division: divisions[1] });
    setup();
    await screen.findByText('No official standings have been published for this selection.');
  });

  it('retries an entry failure without losing shared division filters', async () => {
    vi.mocked(officialRankingsApi.getEntries).mockRejectedValueOnce(new Error('private entry failure'));
    setup('/rankings?gender=Female&age=Kid+1&belt=Yellow&division_id=15');
    await screen.findByRole('alert');
    expect((screen.getByLabelText('Age group') as HTMLSelectElement).value).toBe('Kid 1');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findAllByText('Matched Athlete');
    expect(officialRankingsApi.getEntries).toHaveBeenLastCalledWith(1, 15, 1, expect.any(AbortSignal));
    expect(new URLSearchParams(screen.getByTestId('url').textContent!).get('division_id')).toBe('15');
  });

  it('pages official entries and lets an empty out-of-range page recover', async () => {
    vi.mocked(officialRankingsApi.getEntries).mockResolvedValueOnce({ entries: [entry], total: 60, page: 1, per_page: 50, list, division: divisions[1] })
      .mockResolvedValueOnce({ entries: [], total: 50, page: 2, per_page: 50, list, division: divisions[1] });
    setup();
    await screen.findAllByText('Matched Athlete');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('No official standings have been published for this selection.');
    expect(officialRankingsApi.getEntries).toHaveBeenLastCalledWith(1, 12, 2, expect.any(AbortSignal));
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    await screen.findAllByText('Matched Athlete');
    expect(officialRankingsApi.getEntries).toHaveBeenLastCalledWith(1, 12, 1, expect.any(AbortSignal));
  });

  it('ignores a late division response after switching discipline', async () => {
    let finish!: (value: { divisions: OfficialRankingDivision[]; groups: unknown[] }) => void;
    vi.mocked(officialRankingsApi.getDivisions).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    setup();
    await screen.findByRole('button', { name: 'No-Gi' });
    await waitFor(() => expect(officialRankingsApi.getDivisions).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'No-Gi' }));
    await screen.findByText('Official rankings are not available for this selection.');
    await act(async () => finish({ divisions, groups: [] }));
    expect(screen.queryByLabelText('Gender')).toBeNull();
    expect(officialRankingsApi.getEntries).not.toHaveBeenCalled();
  });
});
