import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import en from '../locales/en.json';
import WatchPage from './WatchPage';
import VideoThumbnail, { VIDEO_THUMBNAIL_FALLBACK } from '../components/VideoThumbnail';
import { api } from '../services/api';
import type { Video } from '../services/api';

vi.mock('../components/SEO', () => ({ default: () => null }));
vi.mock('../components/SocialShare', () => ({ default: () => null }));
vi.mock('../components/QRShare', () => ({ default: () => null }));
vi.mock('../components/ScrollReveal', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../hooks/useApi', () => ({ useEvents: () => ({ events: [{ name: 'No videos 2027' }] }) }));
vi.mock('../services/api', () => ({ api: { getVideos: vi.fn(), getSiteContents: vi.fn().mockResolvedValue({}) } }));
const i18n = createInstance();
await i18n.init({ lng: 'en', resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const video = (id: number, event_name: string | null, event_date: string | null) => ({ id, title: `Match ${id}`, event_name, event_date, youtube_video_id: 'sI5C5FpI0wQ', featured: false } as Video);
function setup() {
  return render(<I18nextProvider i18n={i18n}><MemoryRouter><WatchPage /></MemoryRouter></I18nextProvider>);
}

it('lists only events with visible videos across years, newest first, and filters and clears', async () => {
  vi.mocked(api.getVideos).mockResolvedValue([video(1, 'Copa 2024', '2024-01-01'), video(2, 'Tokyo 2026', '2026-02-20'), video(3, 'Copa 2024', '2024-01-01'), video(4, 'Manila 2025', '2025-04-01'), video(5, null, null)]);
  setup();
  const filter = await screen.findByRole('combobox', { name: en.watch.filterEvent });
  expect(within(filter).getAllByRole('option').map(o => o.textContent)).toEqual([`${en.watch.filterEvent}: ${en.watch.filterAll}`, 'Tokyo 2026', 'Manila 2025', 'Copa 2024']);
  fireEvent.change(filter, { target: { value: 'Tokyo 2026' } });
  expect(screen.getByText('Match 2')).toBeTruthy();
  expect(screen.queryByText('Match 1')).toBeNull();
  fireEvent.change(screen.getByPlaceholderText(en.watch.searchPlaceholder), { target: { value: 'no match' } });
  fireEvent.click(screen.getByRole('button', { name: en.watch.clearFilters }));
  expect(screen.getByText('Match 1')).toBeTruthy();
  expect((filter as HTMLSelectElement).value).toBe('');
});

it('uses a local thumbnail after an image error and handles a missing thumbnail', () => {
  const { rerender } = render(<VideoThumbnail src="https://img.youtube.com/missing.jpg" alt="Match" />);
  const image = screen.getByRole('img') as HTMLImageElement;
  fireEvent.error(image);
  expect(image.getAttribute('src')).toBe(VIDEO_THUMBNAIL_FALLBACK);
  fireEvent.error(image);
  expect(image.getAttribute('src')).toBe(VIDEO_THUMBNAIL_FALLBACK);
  rerender(<VideoThumbnail src={null} alt="Match" />);
  expect(image.getAttribute('src')).toBe(VIDEO_THUMBNAIL_FALLBACK);
});

it('shows an empty library and distinguishes load failures', async () => {
  vi.mocked(api.getVideos).mockResolvedValue([]);
  const { unmount } = setup();
  await screen.findByText(en.watch.noVideosYet);
  unmount();
  vi.mocked(api.getVideos).mockRejectedValue(new Error('offline'));
  setup();
  await screen.findByText(en.watch.loadError);
});

it('offers named playback and close buttons and omits unshipped feature promises', async () => {
  vi.mocked(api.getVideos).mockResolvedValue([video(1, 'Copa 2026', '2026-01-01')]);
  setup();
  const play = await screen.findByRole('button', { name: `${en.watch.watchNow}: Match 1` });
  fireEvent.click(play);
  expect(document.querySelector('iframe')?.getAttribute('src')).toContain('/embed/sI5C5FpI0wQ');
  fireEvent.click(screen.getByRole('button', { name: en.watch.closeVideo }));
  expect(document.querySelector('iframe')).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: `${en.watch.watchNow}: Match 1` }));
  expect(screen.queryByText(en.watch.visionTitle)).toBeNull();
});

it('plays only the chosen card when a featured match also appears in the library', async () => {
  vi.mocked(api.getVideos).mockResolvedValue([{ ...video(1, 'Copa 2026', '2026-01-01'), featured: true }]);
  setup();
  const plays = await screen.findAllByRole('button', { name: `${en.watch.watchNow}: Match 1` });
  expect(plays).toHaveLength(2);
  fireEvent.click(plays[0]);
  expect(document.querySelectorAll('iframe')).toHaveLength(1);
  expect(screen.getAllByRole('button', { name: en.watch.closeVideo })).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: en.watch.closeVideo }));
  expect(document.querySelectorAll('iframe')).toHaveLength(0);
});
