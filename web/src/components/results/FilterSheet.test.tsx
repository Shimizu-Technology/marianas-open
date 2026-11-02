import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useState } from 'react';
import FilterSheet from './FilterSheet';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(cleanup);
function Harness() {
  const [open, setOpen] = useState(false);
  const [belt, setBelt] = useState('');
  return (
    <>
      <button onClick={() => setOpen(true)}>Open filters</button>
      <output>{belt}</output>
      <FilterSheet open={open} onClose={() => setOpen(false)}>
        <label>
          Belt
          <select value={belt} onChange={(e) => setBelt(e.target.value)}>
            <option value="">All</option>
            <option value="black">Black</option>
          </select>
        </label>
      </FilterSheet>
    </>
  );
}
it('traps focus, applies filters, dismisses with Escape and restores the opener and scrolling', () => {
  render(<Harness />);
  const opener = screen.getByRole('button', { name: 'Open filters' });
  opener.focus();
  fireEvent.click(opener);
  const close = screen.getByRole('button', { name: 'results.closeFilters' });
  const show = screen.getByRole('button', { name: 'results.showResults' });
  expect(document.activeElement).toBe(close);
  expect(document.body.style.overflow).toBe('hidden');
  fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
  expect(document.activeElement).toBe(show);
  fireEvent.keyDown(show, { key: 'Tab' });
  expect(document.activeElement).toBe(close);
  fireEvent.change(screen.getByRole('combobox', { name: 'Belt' }), { target: { value: 'black' } });
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(opener);
  expect(screen.getByRole('status').textContent).toBe('black');
  expect(document.body.style.overflow).toBe('');
});
it('shows applied results on dismissal and retains the selection when reopened', () => {
  render(<Harness />);
  fireEvent.click(screen.getByText('Open filters'));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'black' } });
  fireEvent.click(screen.getByText('results.showResults'));
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(screen.getByText('Open filters'));
  expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('black');
});
