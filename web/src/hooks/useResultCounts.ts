import { useEffect, useMemo, useState } from 'react';
import { api, type Event } from '../services/api';
import { eventPhase } from '../utils/events';

// Older API deployments omit results_count. Current list responses need no extra requests.
const summaries = new Map<string, Promise<number | undefined>>();
export function useResultCounts(events: Event[], enabled = true) {
  const [counts, setCounts] = useState<Record<string, number | undefined>>({});
  const missing = useMemo(() => enabled ? events.filter(event =>
    event.results_count == null && eventPhase(event) === 'completed') : [], [events, enabled]);
  useEffect(() => {
    let cancelled = false;
    void Promise.all(missing.map(async event => {
      let request = summaries.get(event.slug);
      if (!request) {
        request = api.getEventResultsSummary(event.slug).then(result => result.total_results).catch(() => undefined);
        summaries.set(event.slug, request);
      }
      return [event.slug, await request] as const;
    })).then(entries => { if (!cancelled) setCounts(Object.fromEntries(entries)); });
    return () => { cancelled = true; };
  }, [missing]);
  return {
    events: useMemo(() => events.map(event => event.results_count == null && counts[event.slug] != null
      ? { ...event, results_count: counts[event.slug] } : event), [events, counts]),
    loading: missing.some(event => !(event.slug in counts)),
  };
}
