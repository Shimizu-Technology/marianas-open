import { useCallback, useEffect, useState } from "react";
import { api, type SponsorPlacement } from "../services/api";

const REFRESH_INTERVAL = 60_000;

export function useSponsorPlacements(eventId?: number, enabled = true) {
  const [data, setData] = useState<{ eventId?: number; items: SponsorPlacement[]; error: boolean }>({ items: [], error: false });
  const [version, setVersion] = useState(0);
  const retry = useCallback(() => setVersion(v => v + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let current = true;
    let request = 0;
    const refresh = async () => {
      const identity = ++request;
      try {
        const result = await api.getSponsorPlacements(eventId);
        if (current && identity === request) {
          setData({ eventId, items: result.sponsor_placements, error: false });
        }
      } catch {
        if (current && identity === request) {
          setData(previous => ({ eventId, items: previous.eventId === eventId ? previous.items : [], error: true }));
        }
      }
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    void refresh();
    const timer = window.setInterval(refreshWhenVisible, REFRESH_INTERVAL);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      current = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [eventId, enabled, version]);

  const inScope = enabled && data.eventId === eventId;
  return { placements: inScope ? data.items : [], error: inScope && data.error, retry };
}
