import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { usePanelPresence } from './usePanelPresence';

afterEach(() => { cleanup(); vi.useRealTimers(); });
function Panel({ open }: { open: boolean }) {
  const { present } = usePanelPresence(open);
  return present ? <div role="dialog" aria-hidden={!open || undefined}>Choice</div> : null;
}
it('closes semantics immediately, retains an exit frame, and cancels disposal when reopened', () => {
  vi.useFakeTimers();
  const { rerender } = render(<Panel open />);
  rerender(<Panel open={false} />);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('dialog', { hidden: true })).toBeTruthy();
  act(() => vi.advanceTimersByTime(80));
  rerender(<Panel open />);
  act(() => vi.advanceTimersByTime(160));
  expect(screen.getByRole('dialog')).toBeTruthy();
  rerender(<Panel open={false} />);
  act(() => vi.advanceTimersByTime(160));
  expect(screen.queryByRole('dialog', { hidden: true })).toBeNull();
});
