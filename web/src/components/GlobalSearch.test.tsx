import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useState } from 'react';
import GlobalSearch from './GlobalSearch';

const mocks = vi.hoisted(() => ({ competitors: vi.fn(), academies: vi.fn() }));
vi.mock('../services/api', () => ({ api: { getCompetitors: mocks.competitors, getAcademies: mocks.academies } }));
const events = [{ id: 1, name: 'Copa de Marianas', slug: 'copa-de-marianas-2026' }];
vi.mock('../hooks/useApi', () => ({ useEvents: () => ({ events }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

function Harness() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  return <><button onClick={() => setOpen(true)}>Open search</button><GlobalSearch open={open} onClose={() => setOpen(false)} /><output>{location.pathname}</output></>;
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  mocks.competitors.mockResolvedValue({ competitors: [] });
  mocks.academies.mockResolvedValue({ academies: [] });
});
afterEach(() => { cleanup(); document.body.style.cssText = ''; });

function openSearch() {
  const view = render(<MemoryRouter><Harness /></MemoryRouter>);
  const opener = screen.getByRole('button', { name: 'Open search' });
  opener.focus();
  fireEvent.click(opener);
  return { ...view, opener };
}

describe('search modal', () => {
  it('portals outside the header, focuses search, traps Tab, and restores focus and body styles on Escape', () => {
    document.body.style.overflow = 'auto';
    const { container, opener } = openSearch();
    const dialog = screen.getByRole('dialog', { name: 'search.title' });
    const input = screen.getByRole('searchbox');
    expect(container.contains(dialog)).toBe(false);
    expect(document.activeElement).toBe(input);
    expect(document.body.style.position).toBe('fixed');
    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'search.close' }));
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    expect(document.activeElement).toBe(input);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.style.position).toBe('');
  });

  it('supports keyboard selection and returns to the page without a scroll lock', async () => {
    openSearch();
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'Copa' } });
    await screen.findByRole('button', { name: /Copa de Marianas/ });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(screen.getByText('/events/copa-de-marianas-2026')).toBeTruthy());
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.position).toBe('');
  });

  it('discards an obsolete search response instead of replacing the latest results', async () => {
    let resolveOld!: (value: unknown) => void;
    mocks.competitors.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    openSearch();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'old' } });
    await waitFor(() => expect(mocks.competitors).toHaveBeenCalled());
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Copa' } });
    await screen.findByRole('button', { name: /Copa de Marianas/ });
    await act(async () => resolveOld({ competitors: [{ id: 1, full_name: 'Obsolete result' }] }));
    expect(screen.queryByText('Obsolete result')).toBeNull();
    expect(screen.getByRole('button', { name: /Copa de Marianas/ })).toBeTruthy();
  });
});
