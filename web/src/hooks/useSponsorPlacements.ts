import { useEffect, useState } from "react";
import { api, type SponsorPlacement } from "../services/api";

export function useSponsorPlacements(eventId?: number, enabled = true) {
  const [data, setData] = useState<{ eventId?: number; items: SponsorPlacement[] }>({ items: [] });
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    api
      .getSponsorPlacements(eventId)
      .then((data) => {
        if (current) setData({ eventId, items: data.sponsor_placements });
      })
      .catch(() => {
        if (current) setData({ eventId, items: [] });
      });
    return () => {
      current = false;
    };
  }, [eventId, enabled]);
  return enabled && data.eventId === eventId ? data.items : [];
}
