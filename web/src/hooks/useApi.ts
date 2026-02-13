import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Organization, Event, Sponsor } from '../services/api';

export function useOrganization() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getOrganization()
      .then(setOrg)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { org, loading, error };
}

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getEvents()
      .then(setEvents)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { events, loading, error };
}

export function useEvent(slug: string) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getEvent(slug)
      .then(setEvent)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  return { event, loading, error };
}

export function useSponsors() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSponsors()
      .then(setSponsors)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { sponsors, loading, error };
}
