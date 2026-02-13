# Marianas Open — Ranking System

**Version:** 1.0
**Date:** Feb 14, 2026
**Status:** Implemented (based on ASJJF formula)

---

## Overview

Rankings are calculated from event results stored in our database. The formula mirrors ASJJF's official star-based ranking system so competitors and Steve will recognize familiar numbers.

---

## ASJJF Star-Based Points Formula

Each ASJJF event is assigned a **star rating** that determines how many ranking points placements are worth. Bigger events = more stars = more points.

### Points by Star Tier

| Placement | 1-Star | 2-Star | 3-Star | 4-Star | 5-Star | 15-Star |
|-----------|--------|--------|--------|--------|--------|---------|
| Gold (1st) | 15 | 30 | 45 | 60 | 75 | 225 |
| Silver (2nd) | 7 | 14 | 21 | 28 | 35 | 105 |
| Bronze (3rd) | 3 | 6 | 9 | 12 | 15 | 45 |
| Alone in Bracket | 7 | 14 | 21 | 28 | 35 | 105 |

**Pattern:** Base multiplier × star count. Gold=15×stars, Silver=7×stars, Bronze=3×stars.

### Bonus Points (NOT implemented — data unavailable)

ASJJF also awards per-match bonuses:
- **+3 points** per win by submission
- **+1 point** per win by decision/points

We do NOT have match-level data (only final placements), so these bonuses are excluded. This means our rankings will be ~5-10% lower than ASJJF's official numbers for active competitors. The *relative* ordering should still be very close since bonuses are small compared to placement points.

### Team Rankings

Same point structure as fighters, except:
- "Alone in Bracket" = **0 points** (not Silver)
- "One Bracket, all same team" = **0 points**

Team points are summed from all team members' individual placements.

---

## Our Event Star Ratings

Based on ASJJF event pages:

| Event | Star Rating | Notes |
|-------|-------------|-------|
| Marianas Open International Championship | **5-star** | Flagship event, $51.5K prize pool |
| Copa de Marianas | **3-star** | Regional Guam event |
| Marianas Pro Japan (Tokyo) | **3-star** | Pro Series qualifier |
| Marianas Pro Japan (Nagoya) | **3-star** | Pro Series qualifier |
| Marianas Pro Manila | **3-star** | Pro Series qualifier |
| Marianas Pro Taiwan | **3-star** | Pro Series qualifier |
| Marianas Pro Korea | **3-star** | Pro Series qualifier |

> **TODO:** Verify star ratings for each Pro event. We confirmed 5-star for Marianas Open and 3-star for Manila events from ASJJF pages. The Pro Series events are likely all 3-star but should be confirmed.

---

## Ranking Seasons

ASJJF organizes rankings into **seasons** (e.g., Season 41, Season 45). We don't currently track seasons — our rankings aggregate across all events in the database.

**Future enhancement:** Add a `season` or `ranking_period` concept to group events and show rankings by year/season.

---

## Implementation Details

### Database

Rankings are computed dynamically from `event_results` table, not stored separately.

**Key fields used:**
- `event_result.placement` — "Gold", "Silver", "Bronze"
- `event_result.competitor_name` — Athlete name (string match, not FK)
- `event_result.academy` — Team/gym name
- `event_result.country` — Country of origin
- `event_result.belt` — Belt rank
- `event_result.weight_class` — Division
- `event_result.gi_nogi` — "Gi" or "No-Gi"
- `event.star_rating` — Integer (1-15), determines point multiplier

### API Endpoint

`GET /api/v1/rankings`

Query params:
- `type` — `individual` (default) or `team`
- `belt` — Filter by belt (e.g., "Black", "Brown")
- `gi_nogi` — "Gi", "No-Gi", or "Combined" (default)
- `event_id` — Limit to specific event
- `limit` — Number of results (default 50)

### Calculation

```
For each competitor:
  total_points = SUM(
    placement_points(result.placement, event.star_rating)
  ) across all their results

  gold_count = COUNT(results WHERE placement = 'Gold')
  silver_count = COUNT(results WHERE placement = 'Silver')
  bronze_count = COUNT(results WHERE placement = 'Bronze')

ORDER BY total_points DESC, gold_count DESC, silver_count DESC
```

Tiebreaker: More golds wins. Then more silvers.

### Academy/Team Ranking

```
For each academy:
  total_points = SUM(all members' individual points)
  total_golds = SUM(all members' golds)

ORDER BY total_points DESC, total_golds DESC
```

### Country Ranking

Same as academy but grouped by `country`.

---

## Known Limitations

1. **No match-level bonus points** — Missing +3 submission / +1 decision bonuses
2. **Name matching is string-based** — "John Smith" from two events may or may not be the same person. No unique competitor ID from ASJJF.
3. **Star ratings are manually assigned** — If a new event has a different star tier, we need to update the DB
4. **No season separation** — All-time rankings only (for now)
5. **"Alone in Bracket" not distinguished** — Our scraped data shows "Gold" for unopposed winners; we can't tell if they actually fought for it or were alone. This slightly inflates some athletes' points.

---

## Future Enhancements

- [ ] Season-based rankings (group by year or ASJJF season)
- [ ] Competitor deduplication (fuzzy name matching or manual linking)
- [ ] Match-level data import (if ASJJF API becomes available)
- [ ] Weight class normalization (ASJJF weight classes vary by event)
- [ ] Admin UI to adjust star ratings per event
- [ ] "Marianas Series" ranking — custom ranking that only counts Marianas-branded events
- [ ] Configurable point formula in admin (let Steve tweak multipliers)

---

## References

- ASJJF ranking pages: `https://www.asjjf.org/main/ranking` (requires JS, seasons 41-45 observed)
- Marianas Open 2025 event page: `https://asjjf.org/main/eventInfo/1732` (5-star, confirmed)
- Manila Open 2025: `https://asjjf.org/main/eventInfo/1675` (3-star, confirmed)
- Asian Open 2025: `https://asjjf.org/main/eventInfo/1748` (15-star ← World Championship tier)
