import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { Event } from '../services/api';
import EventPhotoCard from './EventPhotoCard';
vi.mock('../hooks/usePublicCopy', () => ({ usePublicCopy: () => ({ t: (key: string) => key }) }));
vi.mock('../hooks/useTranslatedField', () => ({ useTranslatedField: () => ({ tf: (event: Event) => event.name }) }));
afterEach(cleanup);
it('hides the unrelated flagship photo and shows only a real previous edition', () => {
  const current = { id: 1, name: 'Guam Copa de Marianas 2027', date: '2027-01-30' } as Event;
  const flagship = { id: 2, name: 'Guam Marianas Open 2026', date: '2026-10-24', status: 'completed', hero_image_url: 'https://example.com/mo.jpg' } as Event;
  const { container, rerender } = render(<EventPhotoCard event={current} events={[flagship]} />);
  expect(container.querySelector('figure')).toBeNull();
  const copa = { ...flagship, id: 3, name: 'Guam Copa de Marianas 2026', date: '2026-01-31' };
  rerender(<EventPhotoCard event={current} events={[flagship, copa]} />);
  expect(screen.getByText(copa.name)).toBeTruthy();
  expect(container.textContent).not.toMatch(/1,000|20\+|Marianas Open 2026/);
});
