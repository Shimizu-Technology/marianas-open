import { useEffect, useState } from 'react';

/** Keyed results keep a previous division's rows out of a newly selected division. */
export function useRankingRequest<T>(request: ((signal: AbortSignal) => Promise<T>) | null) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ request: typeof request; attempt: number; data?: T; error?: boolean }>();
  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    request(controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ request, attempt, data });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ request, attempt, error: true });
    });
    return () => controller.abort();
  }, [request, attempt]);
  const current = result?.request === request && result?.attempt === attempt ? result : undefined;
  return { data: current?.data, error: !!current?.error, loading: !!request && !current, retry: () => setAttempt(a => a + 1) };
}
