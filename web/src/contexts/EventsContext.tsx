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

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getEvents()
      .then(setEvents)
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
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
