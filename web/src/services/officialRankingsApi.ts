import { fetchApi } from './api';

export type RankingStatus = 'pending' | 'available' | 'unavailable';
export interface OfficialRankingList {
  id: number;
  asjjf_ranking_id: number;
  season_year: number;
  circuit: string;
  discipline: 'gi' | 'nogi';
  kind: 'individual' | 'team';
  category: 'adult' | 'kids';
  title: string;
  status: RankingStatus;
  last_synced_at: string | null;
  source_url: string;
}
export interface OfficialRankingDivision {
  id: number;
  asjjf_division_id: number;
  gender: string;
  age_group: string;
  belt: string;
  label: string;
  position: number;
  status: RankingStatus;
  last_synced_at: string | null;
}
export interface OfficialRankingEntry {
  id: number;
  position: number;
  name: string;
  display_name: string;
  academy_name: string | null;
  country_code: string | null;
  raw_country_code: string | null;
  points: string;
  gold: number | null;
  silver: number | null;
  bronze: number | null;
  competitor_id: number | null;
  academy_id: number | null;
  academy_slug: string | null;
}
export interface OfficialRankingLists {
  current_season: number;
  seasons: number[];
  lists: OfficialRankingList[];
}
export interface OfficialRankingEntries {
  entries: OfficialRankingEntry[];
  total: number;
  page: number;
  per_page: number;
  list: OfficialRankingList;
  division: OfficialRankingDivision | null;
}
export interface OfficialStandings {
  season_year: number;
  standings: { position: number; points: string; division: OfficialRankingDivision; list: OfficialRankingList }[];
}
export const officialRankingsApi = {
  getLists: (signal?: AbortSignal) => fetchApi<OfficialRankingLists>('/api/v1/rankings/lists', { signal }),
  getDivisions: (listId: number, signal?: AbortSignal) =>
    fetchApi<{ divisions: OfficialRankingDivision[]; groups: unknown[] }>(`/api/v1/rankings/lists/${listId}/divisions`, { signal }),
  getEntries: (listId: number, divisionId: number | undefined, page = 1, signal?: AbortSignal) => {
    const query = new URLSearchParams({ page: String(page), per_page: '50' });
    if (divisionId !== undefined) query.set('division_id', String(divisionId));
    return fetchApi<OfficialRankingEntries>(`/api/v1/rankings/lists/${listId}/entries?${query}`, { signal });
  },
  getStandings: (competitorId: number, signal?: AbortSignal) =>
    fetchApi<OfficialStandings>(`/api/v1/rankings/standings?competitor_id=${competitorId}`, { signal }),
};
