# POC Specification — Marianas Open International Hub

## Goal

Show Steve Shimizu a working demo that makes him say: *"This is exactly what we need."*

The POC demonstrates the **vision** — a multi-language, mobile-first fan experience that makes the Marianas Open feel like the world-class international event it already is.

---

## What We're Building

A **static React app** (no backend) with 4 pages:

### Page 1: Landing / Home
- Hero section with Marianas Open branding
- "Guam's Premiere International Jiu-Jitsu Event"
- Language switcher (flags) prominently in header
- Quick stats: "1,300+ Competitors · 6 Countries · $50K Prize Pool · Since 2007"
- Upcoming events timeline (2026 Pro Series)
- "Register Now" CTA (links to ASJJF — we're not replacing that yet)
- Sponsor showcase section

### Page 2: Event Detail (Marianas Open 2026)
- Hero banner with event poster / location photo
- Date, venue, ASJJF star rating
- Schedule / format info
- Location with embedded map (UOG Calvo Fieldhouse)
- "How to Register" section (step-by-step, localized)
- Prize pool breakdown
- Travel info for international competitors (visa, flights, hotels)
- Social share buttons (generates localized OG cards)

### Page 3: Event Calendar / Pro Series
- Visual timeline of all 2026 events across Asia
- Interactive map showing event locations (Guam → Japan → Philippines → Taiwan → Korea → Hong Kong)
- Each event card with date, location, ASJJF rank, register link
- "Follow the Journey" narrative — compete locally, qualify for Guam

### Page 4: Watch / VOD (Mock)
- Mock of what the streaming/VOD experience would look like
- "Live Now" section (with placeholder video embed)
- Match library with search/filter: by competitor name, weight class, belt, event
- Individual match cards with thumbnail, competitors, result, duration
- This page is a VISION page — shows Steve what we COULD build

---

## Language Support

### Languages in POC
| Language | Code | Flag | Priority |
|----------|------|------|----------|
| English | en | 🇺🇸 | P0 (default) |
| Japanese | ja | 🇯🇵 | P0 |
| Korean | ko | 🇰🇷 | P1 |
| Filipino | tl | 🇵🇭 | P1 |
| Chinese (Simplified) | zh | 🇨🇳 | P2 |

### What Gets Translated
- All UI labels (nav, buttons, headings)
- Event information (names, descriptions, locations)
- Registration instructions
- Travel info
- NOT translating: competitor names, academy names (these are proper nouns)

### Translation Approach
- AI-generated for the POC (Claude/GPT)
- Flag any BJJ-specific terminology for review (e.g., "gi", "no-gi" are universal; but "weight class" needs proper translation)
- `react-i18next` with JSON locale files

---

## Design Direction

### Brand Analysis (Current marianasopen.com)
- **Primary color:** `#004581` (deep navy blue) — header, buttons, links
- **Secondary:** `#262626` (near-black) — text
- **Accent:** `#cfcfcf` (light gray) — borders, backgrounds
- **Logo:** Shield/crest shape with palm trees, latte stone, crossed elements. Text: "MARIANAS OPEN · BRAZILIAN JIU-JITSU CHAMPIONSHIP"
- **Font:** Roboto (clean, utilitarian)
- **Instagram:** @themarianasopen
- **Overall feel:** Clean but VERY basic. Static WordPress with just text and buttons. No photos, no energy, no sense of the scale of this event.

### Design Principles for the POC

**1. Premium Combat Sports Feel**
- Dark mode primary (dark navy/charcoal backgrounds) — like UFC, ADCC, ONE Championship
- The BJJ world uses dark themes. FloGrappling: dark header, orange accents. Smoothcomp: dark nav. UFC Fight Pass: black/red.
- Dark backgrounds make action photos POP

**2. Respect the Existing Brand**
- Keep the navy blue (`#004581`) as primary — it's already their color
- Add a warm accent for CTAs and highlights: gold/amber (`#D4A843`) — evokes championship, trophies, medals
- Keep the shield logo, just use it bigger and with more presence

**3. International & Cultural**
- Subtle nods to the Pacific/Marianas (latte stone motifs, ocean textures)
- Language flags prominently visible, not hidden in a dropdown
- Country-specific imagery where possible (Guam beaches, Nagoya dojo, Manila skyline)

**4. Mobile-First, Content-Dense**
- Competitors will be on phones. Families watching from abroad on phones.
- Big touch targets, smooth scrolling, fast
- Inspired by sports apps (ESPN, UFC app) not corporate websites

**5. Motion & Energy**
- Framer Motion for page transitions and scroll reveals
- Subtle parallax on hero images
- The current site feels dead. We need ENERGY to match the event.

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `navy-900` | `#001A33` | Page backgrounds, dark sections |
| `navy-800` | `#002B52` | Cards, elevated surfaces |
| `navy-700` | `#004581` | Primary brand (their existing blue) |
| `navy-600` | `#0060B0` | Links, interactive elements |
| `gold-500` | `#D4A843` | Accents, CTAs, highlights, champion elements |
| `gold-400` | `#E4C06A` | Hover states, secondary accents |
| `white` | `#FFFFFF` | Primary text on dark |
| `gray-300` | `#D1D5DB` | Secondary text on dark |
| `gray-600` | `#4B5563` | Muted text, borders |
| `red-600` | `#DC2626` | Live indicators, urgent CTAs |

### Typography
- **Headings:** Inter or Montserrat (bold, uppercase for event names — feels like fight posters)
- **Body:** Inter (clean, readable at small sizes, good i18n support including CJK)
- **Accent:** Condensed weight for stats and numbers (like "1,300+ COMPETITORS")

### Visual References (Mood Board)
- **UFC.com** — dark theme, bold typography, action photography
- **ONE Championship** — premium feel, Asian-market focused, multi-language
- **Smoothcomp event pages** — functional but well-organized event information
- **NOT FloGrappling** — their design is actually pretty mediocre, lots of whitespace waste

---

## Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| Framework | React 18 + TypeScript | What we know, fast to build |
| Build | Vite | Fast dev, instant HMR |
| i18n | react-i18next | Industry standard, lazy loading per language |
| Styling | Tailwind CSS | Rapid styling, dark mode support built-in |
| Animation | Framer Motion | Already using in Pacific Golf, smooth page transitions |
| Routing | React Router v6 | Simple, supports language prefix routes |
| Maps | Leaflet or Mapbox GL | Interactive event map (free tier) |
| Hosting | Vercel | Free, instant deploys, preview URLs |
| Icons | Lucide React | Consistent with our design system (no emojis in UI) |

### Project Structure
```
poc/
├── public/
│   └── locales/
│       ├── en/
│       │   └── translation.json
│       ├── ja/
│       │   └── translation.json
│       ├── ko/
│       │   └── translation.json
│       ├── tl/
│       │   └── translation.json
│       └── zh/
│           └── translation.json
├── src/
│   ├── components/
│   │   ├── Header.tsx          # Nav + language switcher
│   │   ├── Footer.tsx
│   │   ├── LanguageSwitcher.tsx # Flag buttons
│   │   ├── EventCard.tsx       # Reusable event card
│   │   ├── EventTimeline.tsx   # Visual timeline
│   │   ├── EventMap.tsx        # Interactive world map
│   │   ├── MatchCard.tsx       # VOD match card (mock)
│   │   ├── SponsorBar.tsx      # Sponsor logos
│   │   └── ScrollReveal.tsx    # Framer Motion wrapper
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── EventDetailPage.tsx
│   │   ├── CalendarPage.tsx
│   │   └── WatchPage.tsx       # Mock VOD experience
│   ├── data/
│   │   └── events.ts           # Static event data
│   ├── i18n.ts                 # i18next config
│   ├── App.tsx
│   └── main.tsx
├── tailwind.config.ts
├── package.json
└── vite.config.ts
```

---

## What This Is NOT

- NOT a working registration system (links to ASJJF)
- NOT a real streaming platform (mock/placeholder)
- NOT connected to any backend
- NOT the final product — it's a vision demo

---

## Success Criteria

1. ✅ Steve pulls it up on his phone and it looks BETTER than marianasopen.com
2. ✅ Language switching is instant and impressive ("tap Japanese, everything changes")
3. ✅ The VOD mock page makes Steve go "I want THAT"
4. ✅ The event map shows the international scale of what he's built
5. ✅ It sparks conversation about what else we could build together
6. ✅ Loads fast, works on mobile, feels premium

---

## Open Design Questions

1. **Do we have high-res photos from past events?** Action shots of competitors, venue photos, crowd shots. The current site has ZERO imagery — we need photos to make this pop. Check Instagram @themarianasopen and GSPN coverage.

2. **Logo files?** We only have the favicon PNG. Need vector/high-res version of the shield logo.

3. **Event poster designs?** Steve likely has promotional flyers/posters for past events that could inform the visual language.

4. **Video clips for the Watch page mock?** The YouTube fight videos could work as placeholder content.

---

## Estimated Build Time

| Task | Time |
|------|------|
| Project setup (Vite + Tailwind + i18n + Router) | 1 hour |
| Translation files (5 languages × 4 pages) | 2 hours |
| Header/Footer/LanguageSwitcher | 1 hour |
| HomePage | 2-3 hours |
| EventDetailPage | 2 hours |
| CalendarPage + Map | 2-3 hours |
| WatchPage (mock) | 2 hours |
| Framer Motion animations | 1-2 hours |
| Mobile responsive polish | 1-2 hours |
| Deploy to Vercel | 30 min |
| **Total** | **~15-18 hours** |

Could be done in a focused day-and-a-half sprint.

---

*Last updated: Feb 13, 2026*
