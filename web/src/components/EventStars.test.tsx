// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import EventStars from './EventStars';
vi.mock('../hooks/usePublicCopy', () => ({ usePublicCopy: () => ({ t: (_: string, options: {count: number}) => `ASJJF ${options.count}-Star Ranked Event` }) }));
afterEach(cleanup);
it('reflects the actual rating and hides unpublished ratings', () => {
  const { rerender } = render(<EventStars stars={3} />);
  expect(screen.getByText('ASJJF 3-Star Ranked Event')).toBeTruthy();
  rerender(<EventStars stars={null} />); expect(screen.queryByText(/ASJJF/)).toBeNull();
});
