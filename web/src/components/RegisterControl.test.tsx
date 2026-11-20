// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RegisterControl from './RegisterControl';
vi.mock('../hooks/usePublicCopy', () => ({ usePublicCopy: () => ({ i18n: { language: 'en' }, t: (key: string) => ({ 'calendar.register': 'Register', 'calendar.registerGi': 'Register (Gi)', 'calendar.registerNogi': 'Register (No-Gi)', 'visualRefresh.close': 'Close' })[key] || key }) }));
afterEach(cleanup);
describe('RegisterControl', () => {
  it('offers the actual Gi/No-Gi destinations from one button and restores focus on Escape', () => {
    render(<RegisterControl event={{ registration_url_gi: 'https://asjjf.org/main/eventNotice/1', registration_url_nogi: 'https://asjjf.org/main/eventInfo/2' }} />);
    const trigger = screen.getByRole('button', { name: 'Register' });
    trigger.focus(); fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeTruthy();
    const gi = screen.getByRole('link', { name: 'Register (Gi)' });
    expect(gi.getAttribute('href')).toBe('https://asjjf.org/main/eventInfo/1');
    expect(gi.getAttribute('target')).toBe('_blank');
    expect(screen.getByRole('link', { name: 'Register (No-Gi)' }).getAttribute('href')).toBe('https://asjjf.org/main/eventInfo/2');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
  it('traps focus, dismisses on backdrop, and closes after choosing a destination', () => {
    render(<RegisterControl event={{ registration_url_gi: 'https://asjjf.org/main/eventInfo/1', registration_url_nogi: 'https://asjjf.org/main/eventInfo/2' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    const close = screen.getByRole('button', { name: 'Close' });
    const last = screen.getByRole('link', { name: 'Register (No-Gi)' });
    last.focus(); fireEvent.keyDown(document, { key: 'Tab' }); expect(document.activeElement).toBe(close);
    fireEvent.click(document.querySelector('.register-backdrop')!); expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    fireEvent.click(screen.getByRole('link', { name: 'Register (Gi)' })); expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('uses a direct link for one destination and hides absent registration', () => {
    const { rerender } = render(<RegisterControl event={{ registration_url: 'https://asjjf.org/main/eventInfo/3' }} />);
    expect(screen.getByRole('link').getAttribute('target')).toBe('_blank');
    rerender(<RegisterControl event={{}} />); expect(screen.queryByRole('button')).toBeNull(); expect(screen.queryByRole('link')).toBeNull();
  });
});
