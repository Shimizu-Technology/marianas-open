import { act, cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import en from '../locales/en.json';
import HomePage from './HomePage';

vi.mock('../components/SEO', () => ({ default: () => null }));
vi.mock('../components/ScrollReveal', () => ({ default: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div> }));
vi.mock('../hooks/useApi', () => ({ useEvents: () => ({ events: [], loading: false }) }));
vi.mock('../hooks/useResultCounts', () => ({ useResultCounts: () => ({ events: [], loading: false }) }));
vi.mock('../hooks/useSponsorPlacements', () => ({ useSponsorPlacements: () => ({ placements: [], error: null }) }));
vi.mock('../hooks/useSiteImages', async importOriginal => ({ ...await importOriginal<typeof import('../hooks/useSiteImages')>(), useSiteImages: () => ({ images: [] }) }));
vi.mock('../hooks/useSiteContent', () => ({ useSiteContent: () => ({ t: (_key: string, fallback: string) => fallback, content: {} }) }));
const i18n = createInstance();
await i18n.init({ lng: 'en', resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('reserves all deferred story and partner image space before the observer mounts images', () => {
  const observers: { callback: IntersectionObserverCallback; observer: IntersectionObserver }[] = [];
  vi.stubGlobal('IntersectionObserver', class {
    observe = vi.fn();
    disconnect = vi.fn();
    constructor(callback: IntersectionObserverCallback) {
      observers.push({ callback, observer: this as unknown as IntersectionObserver });
    }
  });
  render(<I18nextProvider i18n={i18n}><MemoryRouter><HomePage /></MemoryRouter></I18nextProvider>);
  const tile = screen.getByText(en.home.internationalReach).closest('.col-span-2')!;
  expect(tile.classList.contains('h-48')).toBe(true);
  expect(tile.querySelector('img')).toBeNull();
  const storyTiles = [...tile.parentElement!.children];
  expect(storyTiles).toHaveLength(3);
  expect(storyTiles.slice(0, 2).every(el => el.classList.contains('aspect-[4/3]'))).toBe(true);
  expect(storyTiles.every(el => !el.querySelector('img'))).toBe(true);
  for (const name of ['ASJJF', 'MSJJF', 'Copa de Marianas', 'Road to the Open']) {
    const partner = screen.getByAltText(name).closest('a')!;
    expect(partner.classList.contains('h-40')).toBe(true);
    expect(partner.classList.contains('sm:h-44')).toBe(true);
  }
  act(() => observers.forEach(({ callback, observer }) => callback([{ isIntersecting: true } as IntersectionObserverEntry], observer)));
  expect(tile.querySelector('img')?.classList.contains('h-full')).toBe(true);
  expect(tile.classList.contains('h-48')).toBe(true);
});
