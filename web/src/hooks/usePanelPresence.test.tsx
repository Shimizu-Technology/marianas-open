import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, useRef } from 'react';
import { createPortal } from 'react-dom';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { usePanelPresence } from './usePanelPresence';
import { useModalFocus } from './useModalFocus';

// jsdom does not yet reflect the native inert property to its attribute.
const inertDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'inert');
beforeAll(() => Object.defineProperty(HTMLElement.prototype, 'inert', {
  configurable: true,
  get() { return this.hasAttribute('inert'); },
  set(value: boolean) { this.toggleAttribute('inert', value); },
}));
afterAll(() => {
  if (inertDescriptor) Object.defineProperty(HTMLElement.prototype, 'inert', inertDescriptor);
  else Reflect.deleteProperty(HTMLElement.prototype, 'inert');
});
let root: HTMLDivElement;
let opener: HTMLButtonElement;
let host: HTMLDivElement;
let bodyStyle: string;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  bodyStyle = document.body.style.cssText;
  document.body.style.cssText = 'overflow: auto; padding-right: 7px;';
  root = document.createElement('div');
  root.id = 'root';
  root.inert = false;
  opener = document.createElement('button');
  opener.textContent = 'Open';
  host = document.createElement('div');
  root.append(opener, host);
  document.body.append(root);
  opener.focus();
});
afterEach(() => {
  cleanup();
  root.remove();
  document.body.style.cssText = bodyStyle;
  vi.useRealTimers();
  vi.restoreAllMocks();
});
function Panel({ open, onClose = () => {} }: { open: boolean; onClose?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { present } = usePanelPresence(open);
  useModalFocus(open, ref, onClose);
  return present ? createPortal(<div ref={ref} role="dialog" aria-modal={open || undefined} aria-hidden={!open || undefined} inert={!open} tabIndex={-1}>
    <button onClick={onClose}>Close</button><button>Last action</button>
  </div>, document.body) : null;
}
function expectReleased() {
  expect(root.inert).toBe(false);
  expect(root.hasAttribute('inert')).toBe(false);
  expect(document.body.style.cssText).toBe('overflow: auto; padding-right: 7px;');
  expect(document.activeElement).toBe(opener);
  opener.focus();
  expect(document.activeElement).toBe(opener); // no remaining focus trap
}
it('closes semantics immediately, restores focus and scrolling, then releases the exit timer', () => {
  const { rerender } = render(<Panel open />, { container: host });
  expect(root.inert).toBe(true);
  expect(document.body.style.overflow).toBe('hidden');
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
  rerender(<Panel open={false} />);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('dialog', { hidden: true }).inert).toBe(true);
  expectReleased();
  act(() => vi.advanceTimersByTime(160));
  expect(screen.queryByRole('dialog', { hidden: true })).toBeNull();
  expectReleased();
  expect(vi.getTimerCount()).toBe(0);
});
it('survives StrictMode effect replay and keeps Escape and the focus trap active exactly once', () => {
  const onClose = vi.fn();
  const { rerender } = render(<StrictMode><Panel open onClose={onClose} /></StrictMode>, { container: host });
  expect(root.inert).toBe(true);
  expect(document.body.style.overflow).toBe('hidden');
  const first = screen.getByRole('button', { name: 'Close' });
  const last = screen.getByRole('button', { name: 'Last action' });
  fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
  expect(document.activeElement).toBe(last);
  fireEvent.keyDown(last, { key: 'Tab' });
  expect(document.activeElement).toBe(first);
  opener.focus();
  expect(document.activeElement).toBe(first);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
  rerender(<StrictMode><Panel open={false} onClose={onClose} /></StrictMode>);
  act(() => vi.advanceTimersByTime(160));
  expectReleased();
  expect(vi.getTimerCount()).toBe(0);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
});
it('cancels disposal and reacquires focus, inert and scroll lock when reopened during exit', () => {
  const { rerender } = render(<Panel open />, { container: host });
  rerender(<Panel open={false} />);
  expectReleased();
  act(() => vi.advanceTimersByTime(80));
  rerender(<Panel open />);
  act(() => vi.advanceTimersByTime(160));
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(root.inert).toBe(true);
  expect(document.body.style.overflow).toBe('hidden');
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
  expect(vi.getTimerCount()).toBe(0);
  rerender(<Panel open={false} />);
  act(() => vi.advanceTimersByTime(160));
  expectReleased();
});
it.each([true, false])('releases all effects on unmount (mid-exit: %s)', midExit => {
  const onClose = vi.fn();
  const { rerender, unmount } = render(<StrictMode><Panel open onClose={onClose} /></StrictMode>, { container: host });
  if (midExit) {
    rerender(<StrictMode><Panel open={false} onClose={onClose} /></StrictMode>);
    act(() => vi.advanceTimersByTime(80));
    expect(vi.getTimerCount()).toBe(1);
  }
  unmount();
  expectReleased();
  expect(vi.getTimerCount()).toBe(0);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(160));
  expect(screen.queryByRole('dialog', { hidden: true })).toBeNull();
});
