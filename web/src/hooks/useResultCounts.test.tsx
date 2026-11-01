import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, type Event, type EventResultsSummary } from '../services/api';
import { useResultCounts } from './useResultCounts';

const event = (slug: string, results_count?: number) => ({
  slug, status: 'completed', date: '2026-10-24', results_count,
} as Event);

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('useResultCounts', () => {
  it('uses list counts without per-event summary requests', async () => {
    const request = vi.spyOn(api, 'getEventResultsSummary');
    const events = [event('known-empty', 0), event('known-published', 10)];
    const { result } = renderHook(() => useResultCounts(events));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.events.map(event => event.results_count)).toEqual([0, 10]);
    expect(request).not.toHaveBeenCalled();
  });
  it('resolves older API counts once and preserves a real zero', async () => {
    const request = vi.spyOn(api, 'getEventResultsSummary').mockResolvedValue({ total_results: 0 } as EventResultsSummary);
    const events = [event('legacy-zero')];
    const { result, rerender } = renderHook(() => useResultCounts(events));
    await waitFor(() => expect(result.current.events[0].results_count).toBe(0));
    rerender();
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('keeps failed summaries unknown instead of claiming results are pending', async () => {
    vi.spyOn(api, 'getEventResultsSummary').mockRejectedValue(new Error('Unavailable'));
    const events = [event('legacy-error')];
    const { result } = renderHook(() => useResultCounts(events));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.events[0].results_count).toBeUndefined();
  });
  it('does not delay the next-event module for historical result summaries', () => {
    const request = vi.spyOn(api, 'getEventResultsSummary');
    const events = [event('not-needed')];
    const { result } = renderHook(() => useResultCounts(events, false));
    expect(result.current.loading).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });
});
