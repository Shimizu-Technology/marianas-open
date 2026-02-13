# Marianas Open — Research

## Overview

The **Marianas Open** is the biggest and longest-running jiu-jitsu tournament organization in the Marianas, operating since **2007** (~20 years). What started as a local Guam tournament has grown into an **international Asian BJJ series** spanning 6+ countries.

---

## The Organization

| Field | Detail |
|-------|--------|
| **Full Name** | Marianas Sports Jiu-Jitsu Federation Inc. |
| **Operating Company** | Fury Promotions, LLC |
| **Founded** | 2007 |
| **President & Founder** | Steve Shimizu |
| **Contact** | (671) 777-9044 · steveshimizu@outlook.com |
| **Affiliation** | ASJJF (Asian Sport Jiu-Jitsu Federation) |
| **Website** | [marianasopen.com](https://marianasopen.com) |
| **Facebook** | [facebook.com/marianasopen](https://facebook.com/marianasopen) (5,700+ likes) |
| **Location** | Hagatna, Guam |

### About Steve Shimizu
- BJJ Black Belt — presented by Professor Edison Kagohara (ASJJF President)
- Founded Fury Promotions in honor of his late uncle Paul SN Shimizu, who had a passion for live entertainment, music, sports, and event production
- Serves as Guam's official representative to the ASJJF
- Personally travels to Japan, Korea, Philippines to promote events and build relationships with gyms

### Events Under the Brand
| Event | Description |
|-------|-------------|
| **Copa de Marianas** | Local/regional qualifier events on Guam |
| **Marianas Pro Series** | International trial events across Asia (Japan, Philippines, Korea, Taiwan, Hong Kong) |
| **Marianas Open International Championship** | The grand finale — 5-star ASJJF ranked, held annually on Guam (October) |

---

## Scale & Growth

| Year | Competitors | Spectators | Key Milestones |
|------|------------|------------|----------------|
| 2007 | — | — | Founded |
| 2022 | 300+ | — | Registration closed early due to demand |
| 2023 | — | — | Post-Marianas Pro Japan trials, international competitors flew to Guam |
| 2024 | "Largest ever" | — | UOG Calvo Field House, $50K prize pool, awards banquet at Dusit Thani |
| 2025 | **1,300+** | **5,000+** | $50K prize pool, **$2M economic impact**, awards banquet at Hyatt Regency |

### Key Stats (2025)
- **1,300+ competitors** from across Asia-Pacific
- **5,000+ spectators**
- **$50,000 prize pool**
- **$2M economic impact** (per GVB's ROI formula)
- **100+ entries from the Philippines alone** (first time hitting that mark)
- Partners in **Korea, Japan, Taiwan, Philippines**
- Featured in **30,000+ printed magazines across Asia**
- Covered by **every newscast in the Philippines**
- Australia's BJJ federation offered Guam to host the **World Championship** (capacity issue — would need to accommodate ~10,000 competitors)

---

## Financial & Government Support

| Year | GVB Sponsorship | Notes |
|------|----------------|-------|
| 2024 | $500,000 | First major GVB sponsorship |
| 2025 | $550,000 | Approved 8-1 by GVB board (Nov 2025) |
| **Total** | **$1,050,000** | Over 2 years |

GVB board member Michael Sgro: *"There's no other event like it that plants the seed of our warrior culture and ina'fa'maolek and our fighting spirit. The sport of jiu jitsu on a global scale is tremendous."*

Steve Shimizu: *"Our partners are predicting Guam will be the next biggest jiu jitsu hub in all of Asia."*

---

## 2026 Event Calendar

| Event | Date | Location | Country | ASJJF Rank |
|-------|------|----------|---------|------------|
| Copa de Marianas 2026 | Jan 31, 2026 | UOG Calvo Fieldhouse | Guam | 3 stars |
| Marianas Pro Nagoya | Mar 14, 2026 | Aichi Budokan Sports Complex | Japan | 4 stars |
| Marianas Pro Manila | Apr 25-26, 2026 | Quantum Skyview, Gateway Mall 2 | Philippines | 3 stars |
| Marianas Pro Taiwan | May 30-31, 2026 | Taipei Xin-Yi Sports Center 6F | Taiwan | 3 stars |
| Marianas Pro Korea | Jun 6, 2026 | Exhibition Hall 2 | South Korea | 3 stars |
| Marianas Pro Hong Kong | Jul 18-19, 2026 | Kellet School | Hong Kong | 3 stars |
| Marianas Open 2026 | Oct TBD | Guam (likely UOG) | Guam | 5 stars (expected) |

**Languages needed:** English, Japanese, Korean, Filipino/Tagalog, Mandarin Chinese, Cantonese (+ Chamorro for local flavor)

---

## Current Tech Stack & Pain Points

### Website: marianasopen.com
- **WordPress** site behind Cloudflare CDN
- Reportedly built by an outsourced team (possibly India-based)
- Very basic — event listings with links to ASJJF for registration
- Each event gets a simple page with "Click here to register" links to ASJJF
- No multi-language support
- No streaming integration
- No results/rankings database
- No real interactivity — just static event pages
- Legacy Google Sites page still exists: `sites.google.com/site/671marianasopen`
- WP JSON API exposed: `marianasopen.com/wp-json/`

### Registration: Fully on ASJJF.org
- All competitor registration goes through the **ASJJF platform** (asjjf.org)
- Marianas Open does NOT own the registration experience
- Cannot customize the flow, branding, or language
- Limited control over data and competitor relationships
- Contact email for changes: `2022copagu@gmail.com` (Gmail-based, not branded)

### Streaming & Video: Fragmented
- **FloGrappling** streamed the Marianas Open in the past (2017-2018 era) — but FloGrappling is expensive/exclusive
- **Current approach:** Individual fight videos uploaded to YouTube AFTER the event
  - Videos titled in Japanese/English format: `【FULL FIGHT】Name vs Name / MARIANAS OPEN 2024 【ブラジリアン柔術】`
  - Posted weeks/months after the event (not live)
  - Only select fights (finals, notable matchups) — NOT all matches
  - No official Marianas Open YouTube channel found — videos seem posted by ASJJF or affiliated accounts
- **The problem:** If you're a competitor's family in Japan and want to watch them fight LIVE, there's no way to do it
- **The other problem:** After the event, you'd have to scrub through long videos or hope your specific fight was clipped and uploaded
- **Opportunity:** Massive. 5,000+ spectators on-site but potentially 10x that audience remotely across 6 countries

### Results & Rankings: Partial (via ASJJF)
- ASJJF maintains rankings: `Asia Jiu Jitsu Ranking`, `Japan Jiu Jitsu Ranking`, `Marianas Pro Ranking`, etc.
- But these are federation-wide, not Marianas Open specific
- No unified Marianas Open results database across 20 years
- No competitor profiles or historical records on marianasopen.com

---

## Competitive Landscape

### BJJ Tournament Platforms

| Platform | What It Does | Pricing | Used By |
|----------|-------------|---------|---------|
| **Smoothcomp** | #1 BJJ tournament software — brackets, registration, scoring, live results | Per-event pricing | IBJJF, ADCC, most major tournaments |
| **FloGrappling** | Streaming + media platform for grappling sports | $12.50/mo subscription | ADCC, major BJJ events |
| **ASJJF.org** | Asian federation's registration/event platform | Free (federation service) | Marianas Open currently |
| **ibjjf.com** | IBJJF's own registration system | Per-event fees | IBJJF events only |
| **BJJ Heroes** | Competitor profiles/records database | Free | Community reference |
| **Jiu-Jitsu X** | Newer tournament platform | — | Smaller events |

### What's Missing in the Market
- **No platform combines registration + streaming + results** in one branded experience
- **No i18n-first tournament platform** — everything is English-only or single-language
- **No platform designed for international series** spanning multiple countries/events
- The Marianas Open's unique position (6 countries, 7+ events/year) is underserved by existing tools

---

## Social Media & Online Presence

| Platform | Handle/URL | Followers |
|----------|-----------|-----------|
| Facebook | [/marianasopen](https://facebook.com/marianasopen) | 5,700+ likes |
| Instagram | TBD (need to verify) | — |
| Website | [marianasopen.com](https://marianasopen.com) | — |
| ASJJF | [asjjf.org](https://asjjf.org) (events listed) | — |

### Media Coverage
- **Guam Pacific Daily News** (guampdn.com) — regular coverage
- **GSPN (Guam Sports Network)** — regular coverage
- **Stars & Stripes Guam** — feature articles
- **KUAM News** — TV coverage
- **Post Guam** — regular coverage
- **Philippine newscasts** — increasing coverage with 100+ Filipino entries
- **30,000+ printed magazines across Asia** — mentioned by Steve in GVB pitch

---

*Last updated: Feb 13, 2026*
*Research by: Prime (Shimizu Technology)*
