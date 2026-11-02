import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import en from '../locales/en.json';
import { api, type EventGalleryImage } from '../services/api';
import EventGalleryPage from './EventGalleryPage';
vi.mock('../components/SEO', () => ({ default: () => null }));
vi.mock('../components/ImageWithShimmer', () => ({ default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} /> }));
vi.mock('../hooks/useApi', () => ({ useEvents: () => ({ events: [{ id: 55, slug: 'marianas-open-2026', name: 'Marianas Open 2026', date: '2026-10-24', city: 'Guam', country: 'Guam' }], loading: false }) }));
const i18n = createInstance();
await i18n.init({ lng: 'en', resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
const image = (id: number) => ({ id, title: null, caption: null, alt_text: null, thumbnail_url: `https://images.example/${id}.jpg`, large_url: `https://images.example/${id}-large.jpg` }) as EventGalleryImage;
const result = (id: number, total = 1) => ({ gallery_images: [image(id)], categories: [{ name: 'Tournament Day 1', count: 1 }], total, page: 1, per_page: 24 });
function setup(url = '/events/marianas-open-2026/gallery') {
  return render(<I18nextProvider i18n={i18n}><MemoryRouter initialEntries={[url]}><Routes><Route path="/events/:slug/gallery" element={<EventGalleryPage />} /></Routes></MemoryRouter></I18nextProvider>);
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); window.history.replaceState(null, '', '/'); });
it('prevents opening stale thumbnails while an album changes and shares the newly selected photo', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  let resolve!: (value: ReturnType<typeof result>) => void;
  vi.spyOn(api, 'getEventGallery').mockResolvedValueOnce(result(3004)).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  setup();
  const thumbnail = await screen.findByRole('button', { name: 'Open photo 1' });
  fireEvent.click(screen.getByRole('button', { name: /Tournament Day 1/ }));
  expect((thumbnail as HTMLButtonElement).disabled).toBe(true);
  await act(async () => resolve(result(3298)));
  await waitFor(() => expect((screen.getByRole('button', { name: 'Open photo 1' }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: 'Open photo 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Share photo' }));
  await screen.findByText('Photo link copied');
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/events/marianas-open-2026/gallery?photo=3298'));
  expect(new URL(window.location.href).searchParams.get('photo')).toBe('3298');
});
it('resolves a deep-linked photo beyond the first page without losing pagination', async () => {
  const request = vi.spyOn(api, 'getEventGallery').mockResolvedValueOnce(result(3004, 2)).mockResolvedValueOnce(result(3298, 2));
  setup('/events/marianas-open-2026/gallery?photo=3298');
  const dialog = await screen.findByRole('dialog');
  expect(dialog.querySelector('img')?.getAttribute('src')).toBe('https://images.example/3298-large.jpg');
  expect(request).toHaveBeenNthCalledWith(2, 'marianas-open-2026', { page: 2, per_page: 96 });
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('keeps copy-link text selection separate from lightbox arrow navigation, including Shift', async () => {
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } });
  vi.spyOn(api, 'getEventGallery').mockResolvedValue({ ...result(3004, 2), gallery_images: [image(3004), image(3298)] });
  setup();
  fireEvent.click(await screen.findByRole('button', { name: 'Open photo 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Share photo' }));
  const input = await screen.findByRole('textbox', { name: 'Photo link' });
  input.focus();
  for (const key of ['ArrowLeft', 'ArrowRight']) for (const shiftKey of [false, true]) {
    fireEvent.keyDown(input, { key, shiftKey });
    expect(new URL(window.location.href).searchParams.get('photo')).toBe('3004');
  }
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(new URL(window.location.href).searchParams.get('photo')).toBe('3298');
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('restores the photo URL when the same photo reopens during its exit', async () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.spyOn(api, 'getEventGallery').mockResolvedValue(result(3004));
  setup();
  const thumbnail = await screen.findByRole('button', { name: 'Open photo 1' });
  vi.useFakeTimers();
  thumbnail.focus();
  fireEvent.click(thumbnail);
  expect(new URL(window.location.href).searchParams.get('photo')).toBe('3004');
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(new URL(window.location.href).searchParams.has('photo')).toBe(false);
  act(() => vi.advanceTimersByTime(80));
  fireEvent.click(thumbnail);
  expect(new URL(window.location.href).searchParams.get('photo')).toBe('3004');
  act(() => vi.advanceTimersByTime(160));
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(document.body.style.overflow).toBe('hidden');
  fireEvent.keyDown(window, { key: 'Escape' });
  act(() => vi.advanceTimersByTime(160));
  expect(screen.queryByRole('dialog', { hidden: true })).toBeNull();
  expect(new URL(window.location.href).searchParams.has('photo')).toBe(false);
  expect(document.body.style.overflow).toBe('');
  expect(document.activeElement).toBe(thumbnail);
  expect(vi.getTimerCount()).toBe(0);
});
