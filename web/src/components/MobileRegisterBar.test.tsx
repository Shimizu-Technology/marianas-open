import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { eventEditorFixture } from './admin/event-editor/eventEditorFixtures';
import MobileRegisterBar from './MobileRegisterBar';
vi.mock('../hooks/useTranslatedField', () => ({ useTranslatedField: () => ({ tf: () => 'Event' }) }));
vi.mock('./RegisterControl', () => ({ default: () => <button>Register</button> }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('hides near the footer, restores the bar above it, and disconnects on unmount', () => {
  let callback: IntersectionObserverCallback;
  const observe = vi.fn(), disconnect = vi.fn();
  vi.stubGlobal('IntersectionObserver', class {
    constructor(handler: IntersectionObserverCallback) { callback = handler; }
    observe = observe;
    disconnect = disconnect;
  });
  const { unmount } = render(<><section id="event-hero">Hero</section><MobileRegisterBar event={eventEditorFixture()} /><footer><a href="/rules">Rules</a></footer></>);
  const hero = document.getElementById('event-hero')!;
  const footer = screen.getByRole('contentinfo');
  expect(observe.mock.calls.map(([element]) => element)).toEqual([hero, footer]);
  const update = (...entries: { target: Element; isIntersecting: boolean }[]) => act(() => callback(entries as IntersectionObserverEntry[], {} as IntersectionObserver));
  update({ target: hero, isIntersecting: false });
  expect(screen.queryByRole('button', { name: 'Register' })).toBeNull();
  update({ target: footer, isIntersecting: false });
  expect(screen.getByRole('button', { name: 'Register' })).toBeTruthy();
  update({ target: footer, isIntersecting: true });
  expect(screen.queryByRole('button', { name: 'Register' })).toBeNull();
  update({ target: footer, isIntersecting: false });
  expect(screen.getByRole('button', { name: 'Register' })).toBeTruthy();
  update({ target: hero, isIntersecting: true });
  expect(screen.queryByRole('button', { name: 'Register' })).toBeNull();
  unmount(); expect(disconnect).toHaveBeenCalledOnce();
});
