import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import en from '../locales/en.json';
import ja from '../locales/ja.json';
import AboutPage from './AboutPage';
import RulesPage from './RulesPage';
import Footer from '../components/Footer';
import JourneySection from '../components/JourneySection';
import { eventEditorFixture } from '../components/admin/event-editor/eventEditorFixtures';
import { invalidateSiteContentCache } from '../hooks/useSiteContent';
import { api, type SiteContentMap } from '../services/api';

vi.mock('../services/api', () => ({ api: { getSiteContents: vi.fn() } }));
vi.mock('../components/SEO', () => ({ default: () => null }));
vi.mock('../components/ScrollReveal', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../hooks/useSiteImages', () => ({ useSiteImages: () => ({ images: [] }), getImageUrl: (_images: unknown, _key: string, fallback: string) => fallback }));
vi.mock('../contexts/OrganizationContext', () => ({ useOrg: () => ({ name: 'Marianas Open', contact_email: null, phone: null }) }));
beforeEach(() => { vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} }); });
afterEach(() => { cleanup(); invalidateSiteContentCache(); vi.unstubAllGlobals(); });
const values = (en: string, ja: string | null = null): SiteContentMap[string] => ({ en, ja, ko: null, pt: null, tl: null, zh: null, 'zh-Hant': null });
async function setup(element: React.ReactNode, content: SiteContentMap, language = 'en') {
  vi.mocked(api.getSiteContents).mockResolvedValue(content);
  const i18n = createInstance();
  await i18n.init({ lng: language, resources: { en: { translation: en }, ja: { translation: ja } }, interpolation: { escapeValue: false } });
  render(<I18nextProvider i18n={i18n}><MemoryRouter>{element}</MemoryRouter></I18nextProvider>);
}
it('renders real About and Footer staff overrides', async () => {
  await setup(<><AboutPage /><Footer /></>, { about_hero_title: values('Staff heading'), about_p1: values('Staff story'), footer_tagline: values('Staff footer') });
  expect(await screen.findByRole('heading', { name: 'Staff heading' })).toBeTruthy();
  expect(await screen.findByText('Staff story')).toBeTruthy();
  expect(await screen.findByText('Staff footer')).toBeTruthy();
});
it('renders localized defaults on actual pages without CMS entries and tolerates null contacts', async () => {
  await setup(<><AboutPage /><RulesPage /><Footer /></>, {}, 'ja');
  expect(screen.getByRole('heading', { name: ja.about.heroTitle })).toBeTruthy();
  expect(screen.getByText(ja.footer.tagline)).toBeTruthy();
  expect(document.querySelector('a[href^="tel:"]')).toBeNull();
  expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
});
it('renders the actual Home journey heading and series introduction from staff copy', async () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  await setup(<JourneySection events={[eventEditorFixture({ date: '2030-01-30', end_date: null, is_main_event: false, status: 'upcoming' })]} />, { journey_title: values('Staff journey'), journey_subtitleSeries: values('Staff series') });
  expect(await screen.findByRole('heading', { name: 'Staff journey' })).toBeTruthy();
  expect(await screen.findByText('Staff series')).toBeTruthy();
});
