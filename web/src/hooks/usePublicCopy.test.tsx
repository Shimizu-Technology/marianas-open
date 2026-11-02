import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import en from '../locales/en.json';
import ja from '../locales/ja.json';
import { usePublicCopy } from './usePublicCopy';
import { useSiteContent } from './useSiteContent';
import { usePublicLinks } from './usePublicLinks';
import { api } from '../services/api';
import type { SiteContentMap } from '../services/api';

vi.mock('../services/api', () => ({ api: { getSiteContents: vi.fn() } }));
const { invalidateSiteContentCache } = await import('./useSiteContent');
afterEach(() => { cleanup(); invalidateSiteContentCache(); });
async function setup(content: Record<string, Partial<SiteContentMap[string]>>, language = 'en') {
  vi.mocked(api.getSiteContents).mockResolvedValue(Object.fromEntries(Object.entries(content).map(([key, value]) => [key, { en: null, ja: null, ko: null, pt: null, tl: null, zh: null, 'zh-Hant': null, ...value }])));
  const i18n = createInstance();
  await i18n.init({ lng: language, fallbackLng: 'en', resources: { en: { translation: en }, ja: { translation: ja } }, interpolation: { escapeValue: false } });
  function Copy() {
    const { t } = usePublicCopy();
    const { loading } = useSiteContent();
    const link = usePublicLinks();
    return <><p>{t('about.heroTitle')}</p><p>{t('watch.subtitle')}</p><p>{t('calendar.subtitleDynamic', { count: 7 })}</p><span>{t('watch.clearFilters')}</span><a href={link('youtube_channel_url', 'https://www.youtube.com/@TheMarianasOpen')}>Channel</a><span>{loading ? 'Loading' : 'Ready'}</span></>;
  }
  render(<I18nextProvider i18n={i18n}><Copy /></I18nextProvider>);
  await screen.findByText('Ready');
  return i18n;
}
it('renders localized defaults when CMS entries or translations are missing', async () => {
  await setup({ about_hero_title: { en: 'English-only override' }, watch_subtitle: { ja: '' } }, 'ja');
  expect(screen.getByText(ja.about.heroTitle)).toBeTruthy();
  expect(screen.getByText(ja.watch.subtitle)).toBeTruthy();
});
it('renders staff overrides and interpolates values without changing UI chrome', async () => {
  await setup({ about_hero_title: { en: 'Staff story' }, watch_subtitle: { en: 'Staff matches' }, calendar_subtitleDynamic: { en: '{{count}} staff events' }, watch_clearFilters: { en: 'Wrong chrome' } });
  expect(screen.getByText('Staff story')).toBeTruthy();
  expect(screen.getByText('Staff matches')).toBeTruthy();
  expect(screen.getByText('7 staff events')).toBeTruthy();
  expect(screen.getByText(en.watch.clearFilters)).toBeTruthy();
});
it('rejects executable CMS links and shares valid destinations across languages', async () => {
  await setup({ youtube_channel_url: { en: 'javascript:alert(1)' } });
  expect(screen.getByRole('link').getAttribute('href')).toBe('https://www.youtube.com/@TheMarianasOpen');
});
it('uses the same staff link in Japanese', async () => {
  await setup({ youtube_channel_url: { en: 'https://youtube.com/@staff' } }, 'ja');
  expect(screen.getByRole('link').getAttribute('href')).toBe('https://youtube.com/@staff');
});
