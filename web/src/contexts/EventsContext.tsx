import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../services/api';
import type { Event } from '../services/api';

interface EventsContextValue {
  events: Event[];
  loading: boolean;
  error: string | null;
}

const EventsContext = createContext<EventsContextValue | null>(null);
const RETRY_DELAYS_MS = [500, 1_500, 4_000] as const;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Events could not be loaded.';
}

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;
    let requestSequence = 0;

    const beginLoad = () => {
      const requestId = ++requestSequence;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      setLoading(true);
      setError(null);

      const attemptLoad = async (attempt: number) => {
        try {
          const nextEvents = await api.getEvents();
          if (cancelled || requestId !== requestSequence) return;

          setEvents(nextEvents);
          setLoading(false);
        } catch (requestError) {
          if (cancelled || requestId !== requestSequence) return;

          const retryDelay = RETRY_DELAYS_MS[attempt];
          if (retryDelay !== undefined) {
            retryTimer = window.setTimeout(() => void attemptLoad(attempt + 1), retryDelay);
            return;
          }

          setError(errorMessage(requestError));
          setLoading(false);
        }
      };

      void attemptLoad(0);
    };

    const retryWhenOnline = () => beginLoad();
    window.addEventListener('online', retryWhenOnline);
    beginLoad();

    return () => {
      cancelled = true;
      requestSequence += 1;
      if (retryTimer !== undefined) window.clearTimeout(retryTimer);
      window.removeEventListener('online', retryWhenOnline);
    };
  }, []);

  const value = useMemo(
    () => ({ events, loading, error }),
    [events, loading, error],
  );

  return (
    <EventsContext.Provider value={value}>
      {children}
    </EventsContext.Provider>
  );
}

export function usePublicEvents(): EventsContextValue {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventsProvider');
  }

  return context;
}
