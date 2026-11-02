import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import {
  api,
  type EventResultDivision,
  type EventResultsSummary,
  type Competitor,
} from '../services/api';
import en from '../locales/en.json';
import ja from '../locales/ja.json';
import pt from '../locales/pt.json';
import EventResultsSection from './EventResultsSection';
import CompetitorsPage from '../pages/CompetitorsPage';
vi.mock('./SEO', () => ({ default: () => null }));
vi.mock('./ScrollReveal', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const athlete = {
  id: 13921,
  placement: 1,
  competitor_id: 2278,
  competitor_name: 'Gabrieli Pessanha',
  academy: 'Infight Japan',
  belt_rank: 'black',
  gender: 'female',
  weight_class: 'heavy',
};
const divisions = [
  { division: '[GI] FEMALE BLACK ADULT 18 HEAVY', results: [athlete] },
] as EventResultDivision[];
async function setup(element: React.ReactNode, language: 'en' | 'ja' | 'pt') {
  const i18n = createInstance();
  await i18n.init({
    lng: language,
    resources: { en: { translation: en }, ja: { translation: ja }, pt: { translation: pt } },
    interpolation: { escapeValue: false },
  });
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>{element}</MemoryRouter>
    </I18nextProvider>
  );
}
function resultsFixture(rows = divisions) {
  vi.spyOn(api, 'getEventResults').mockResolvedValue(rows);
  vi.spyOn(api, 'getEventResultsSummary').mockRejectedValue(new Error('Optional summary'));
}
it('translates age/belt groups and all filter values on Japanese results', async () => {
  resultsFixture();
  await setup(<EventResultsSection eventSlug="mo" />, 'ja');
  await screen.findByRole('link', { name: 'Gabrieli Pessanha' });
  expect(screen.getByRole('heading', { level: 4 }).textContent).toContain(
    ja.officialRankings.values.adultAge.replace('{{age}}', '18')
  );
  expect(screen.getByRole('heading', { level: 3 }).textContent).toContain(
    ja.officialRankings.values.black
  );
  expect(screen.getByRole('option', { name: ja.officialRankings.values.female })).toBeTruthy();
  expect(screen.getByRole('option', { name: ja.officialRankings.values.black })).toBeTruthy();
  expect(screen.getByRole('option', { name: ja.watch.weight.heavy })).toBeTruthy();
  expect(screen.queryByText('Female · Black · Adult 18 · Heavy')).toBeNull();
});
it('finds canonical names in reversed order and preserves academy search and empty-state recovery', async () => {
  resultsFixture();
  await setup(<EventResultsSection eventSlug="mo" />, 'en');
  await screen.findByRole('link', { name: 'Gabrieli Pessanha' });
  const search = screen.getByRole('searchbox');
  fireEvent.change(search, { target: { value: '  Pessanha   Gabrieli ' } });
  expect(screen.getByRole('link', { name: 'Gabrieli Pessanha' })).toBeTruthy();
  fireEvent.change(search, { target: { value: 'Pessanha Missing' } });
  expect(screen.getByText(en.results.noMatchingResults)).toBeTruthy();
  fireEvent.change(search, { target: { value: 'Infight Japan' } });
  expect(screen.getByRole('link', { name: 'Gabrieli Pessanha' })).toBeTruthy();
});
it('locale-formats summary and placement counts while retaining numeric plural selection', async () => {
  const rows = ['Rooster', 'Feather', 'Light', 'Heavy'].map((weight, index) => ({
    division: `[GI] FEMALE BLACK ADULT 18 ${weight.toUpperCase()}`,
    results: Array.from({ length: index === 3 ? 1234 : 1 }, (_, i) => ({
      ...athlete,
      id: index * 2000 + i,
    })),
  })) as EventResultDivision[];
  resultsFixture(rows);
  vi.mocked(api.getEventResultsSummary).mockResolvedValue({
    total_results: 1237,
    divisions: 1234,
    countries: 12,
    academies: 1234,
    belt_breakdown: { black: 1234 },
    top_academies: [],
  } as unknown as EventResultsSummary);
  await setup(<EventResultsSection eventSlug="mo" />, 'pt');
  await screen.findByText('1.237');
  expect(screen.getAllByText('1.234').length).toBeGreaterThan(0);
  expect(
    screen.getByText(pt.results.placementsCount.replace('{{count, number}}', '1.234'))
  ).toBeTruthy();
});
it('formats competitor totals, medals and load-more counts in the selected locale', async () => {
  vi.spyOn(api, 'getCompetitors').mockResolvedValue({
    competitors: [
      {
        id: 1,
        first_name: 'Test',
        last_name: 'Athlete',
        full_name: 'Test Athlete',
        gold_medals: 1234,
        silver_medals: 0,
        bronze_medals: 0,
        events_competed: 1234,
        photo_url: null,
      },
    ] as Competitor[],
    total: 1234,
    page: 1,
    per_page: 24,
  });
  await setup(<CompetitorsPage />, 'pt');
  expect(
    await screen.findByText(pt.visualB.athleteCount.replace('{{count, number}}', '1.234'))
  ).toBeTruthy();
  expect(screen.getByRole('button', { name: /1\.234/ })).toBeTruthy();
  expect(screen.getAllByText('1.234').length).toBeGreaterThan(0);
  expect(screen.getByText(/1\.234 eventos/)).toBeTruthy();
});
