# Marianas Open — Product Requirements Document

**Version:** 0.1 (Draft)
**Author:** Shimizu Technology
**Date:** Feb 13, 2026
**Status:** Planning — Pre-Meeting

---

## 1. Executive Summary

The Marianas Open is Guam's largest and longest-running international jiu-jitsu tournament, now spanning 6 countries with 1,300+ competitors and $2M in economic impact. Despite this scale, their tech is fragmented — a basic website, third-party registration (ASJJF), no streaming, and no multi-language support for their increasingly international audience.

**Shimizu Technology's opportunity:** Build a modern, multi-language platform that helps the Marianas Open reach more people internationally, own their digital experience, and professionalize their operations.

---

## 2. The Problem

### For Competitors (International)
- Registration is on ASJJF.org — English-only, no localization
- No way to follow the full Pro Series journey across countries
- No competitor profiles or historical results
- Families abroad can't watch matches live

### For the Organization
- Don't own their registration data or experience
- Website is basic — just event links
- No way to communicate with competitors in their language
- Can't offer streaming to grow audience beyond physical attendance
- Sponsor value is limited to on-site presence

### For Spectators / Fans
- No live streaming of matches
- No real-time results or bracket tracking
- No way to follow favorite competitors across events
- No content in their native language

---

## 3. Proposed Solutions

### Tier 1: Quick Wins (POC Scope)
Things we can demo in a meeting to show the vision.

#### 3.1 Multi-Language Event Hub
- **What:** A beautiful, responsive website for the Marianas Open with full i18n support
- **Languages:** English, Japanese, Korean, Filipino, Mandarin Chinese (+ Chamorro)
- **Pages:** Landing, Event Calendar, Event Detail, About
- **Key feature:** Language switcher — tap a flag, everything changes instantly
- **Why it matters:** 1,300 competitors from 6 countries. Their families, coaches, and gyms all need info in their language.
- **Tech:** React + Vite + react-i18next

#### 3.2 Social Sharing & Reach
- **What:** OG meta tags and social cards localized per language
- **Key feature:** Share a tournament link on LINE (Japan), KakaoTalk (Korea), Facebook — preview renders in the right language
- **Why it matters:** Word of mouth is how BJJ gyms recruit competitors. Sharing needs to work across cultures.

#### 3.3 QR Codes for On-Site
- **What:** Generate QR codes that link to language-specific pages
- **Key feature:** Scan at the venue, land on results/schedule in your language
- **Why it matters:** 5,000+ spectators at the Guam event, many international

### Tier 2: Platform Features (Post-Meeting, If Engaged)
Features to discuss and potentially scope after the meeting.

#### 3.4 Registration System
- **What:** Own the registration experience instead of relying on ASJJF
- **Features:**
  - Weight class / belt rank / age division / gi vs no-gi selection
  - Academy/team affiliations
  - Multi-language forms and confirmation emails
  - Payment processing (Stripe) with multi-currency support
  - Digital waiver management (localized)
  - Multi-event registration (sign up for Pro Series + Open at once)
- **Consideration:** Need to understand ASJJF relationship — is self-registration possible, or must they stay on ASJJF?

#### 3.5 Live Results & Brackets
- **What:** Real-time tournament bracket display
- **Features:**
  - Live bracket updates as matches complete
  - Push notifications for upcoming matches
  - Competitor profiles with photos, academy, belt rank
  - Filterable by weight class, age, belt
- **Consideration:** Could integrate with Smoothcomp if they use it, or build custom

#### 3.6 Streaming Integration
- **What:** Solve the fragmented video problem with a unified streaming/VOD experience
- **Current state:** Individual fight videos uploaded to YouTube weeks after events (Japanese/English titles). Only select fights — finals, notable matchups. No live streaming. FloGrappling covered them in 2017-2018 but that appears to have stopped.
- **Architecture:** They stream to YouTube Live (or similar) → we embed on our site with metadata
- **Phase 1 (Simple):**
  - YouTube Live embed on event page during tournament
  - After event: indexed VOD library where you search by competitor name, weight class, round
  - Timestamped clips from the long YouTube recordings
- **Phase 2 (Advanced):**
  - Multi-mat streaming (multiple matches simultaneously)
  - Language-specific commentary tracks
  - Push notifications: "Your teammate's match starts in 5 minutes on Mat 3"
  - Clip sharing with social cards
- **Key question for Steve:** How many mats are filmed currently? All mats or just the main mat? What camera setup do they use?

#### 3.7 Competitor Profiles & Rankings
- **What:** Database of all competitors across 20 years of events
- **Features:**
  - Win/loss records, medals, tournament history
  - Academy leaderboards
  - Country/region rankings
  - Social profiles and highlight reels
- **Consideration:** Historical data may need manual entry or import

#### 3.8 Sponsor Portal
- **What:** Showcase sponsors with real digital value
- **Features:**
  - Sponsor logos on event pages, streams, results
  - Sponsor-branded highlight clips
  - Analytics on impressions and clicks
  - Tiered sponsor packages
- **Why it matters:** GVB is investing $550K/year. Sponsors need measurable ROI.

---

## 4. Technical Approach

### POC Stack
| Layer | Tech | Why |
|-------|------|-----|
| Frontend | React + Vite + TypeScript | Fast, modern, what we know |
| i18n | react-i18next | Industry standard, supports 6+ languages |
| Styling | Tailwind CSS + Framer Motion | Consistent with our design system |
| Hosting | Vercel | Free, fast, instant deploys |

### Full Platform Stack (If Engaged)
| Layer | Tech | Why |
|-------|------|-----|
| API | Rails 7 | Proven, fast to build, what we know |
| Frontend | React + Vite | Same as POC, evolve it |
| Database | PostgreSQL | Reliable, handles complex queries |
| Payments | Stripe | Multi-currency, international |
| Storage | AWS S3 | Images, videos, documents |
| Streaming | YouTube Live API / Mux | Start simple, scale up |
| Hosting | Render + Vercel | Same stack as Pacific Golf |

### Pacific Golf Synergy
We've already built many of these patterns for Pacific Golf:
- Multi-org tournament management
- Registration with Stripe payments
- Real-time leaderboards
- Org branding (colors, logos, banners)
- Mobile-responsive public pages with Framer Motion
- Active Storage for media

The BJJ platform would share architectural patterns but be a separate codebase — the domain is different enough (brackets vs scorecard, weight classes vs handicaps, etc.).

---

## 5. i18n Strategy

### Language Priority
| Language | Country | Competitor Base | Priority |
|----------|---------|----------------|----------|
| English | Guam, HK, Philippines | Base language | P0 |
| Japanese | Japan (Nagoya) | Large — Pro Japan is 4-star event | P0 |
| Korean | South Korea | Growing — new country in 2026 | P1 |
| Filipino/Tagalog | Philippines (Manila) | 100+ entries in 2025, growing fast | P1 |
| Mandarin Chinese | Taiwan (Taipei) | Pro Taiwan is new for 2026 | P2 |
| Cantonese | Hong Kong | Pro HK is new for 2026 | P2 |
| Chamorro | Guam | Cultural significance, small scope | P3 (nice-to-have) |

### Translation Approach
- **Phase 1 (POC):** AI-assisted translations (GPT/Claude) for demo quality
- **Phase 2 (Production):** Professional translation review for registration, legal (waivers), and key content
- **Ongoing:** Community-contributed translations for news/blog content

### What Gets Translated
| Content Type | POC? | Production? |
|-------------|------|------------|
| UI elements (buttons, nav, labels) | Yes | Yes |
| Event information | Yes | Yes |
| Registration forms | Mock | Yes |
| Legal/waiver text | No | Yes (professional) |
| Email communications | No | Yes |
| Social media cards | Yes | Yes |
| Streaming UI | No | Yes |

---

## 6. POC Scope (For the Meeting)

### Goal
Show Steve a working demo that makes him go: *"This is exactly what we need."*

### What to Build
1. **Landing page** — Marianas Open branded, language switcher, upcoming events
2. **Event detail page** — Marianas Open 2026 with schedule, location, how to register
3. **Event calendar** — All 2026 Pro Series events on a visual timeline
4. **Language switching** — Tap flag → everything changes (EN, JA, KO, TL, ZH)
5. **Mobile-first** — Competitors will be on their phones
6. **Social sharing** — Share button generates localized preview cards

### What NOT to Build (Yet)
- Actual registration (mock only)
- Streaming
- Brackets / scoring
- Backend / database
- Authentication

### Success Criteria
- Steve sees it and understands the vision
- Language switching is smooth and impressive
- It looks better than marianasopen.com and ASJJF combined
- It sparks conversation about "what else could we do?"

---

## 7. Business Model Considerations

### How This Could Make Money
| Revenue Stream | Description |
|---------------|-------------|
| **Platform fee** | Monthly/annual SaaS fee for the tournament platform |
| **Registration cut** | Small % of registration fees processed through the platform |
| **Streaming subscriptions** | Pay-per-view or monthly subscription for live streams |
| **Sponsor packages** | Digital sponsor placements with analytics |
| **White-label licensing** | Other BJJ tournaments could use the same platform |

### Pricing Considerations
- Steve currently gets $550K from GVB — budget exists for tech investment
- Registration fees from 1,300+ competitors = significant volume
- Streaming subscriptions to international audience = recurring revenue
- Need to understand what ASJJF charges (if anything) for their platform

---

## 8. Risks & Open Questions

See [QUESTIONS.md](./QUESTIONS.md) for the full list of open questions.

### Key Risks
| Risk | Mitigation |
|------|-----------|
| **ASJJF dependency** — Can they leave ASJJF's platform? | Ask Steve about the relationship; may need to integrate rather than replace |
| **Translation quality** — AI translations may have BJJ terminology wrong | Have native-speaking practitioners review key terms |
| **Scope creep** — Full platform is massive | Start with event hub + registration, add streaming/brackets later |
| **Existing commitments** — Steve may have other tech plans | Come prepared to listen, not just pitch |
| **Competition** — Smoothcomp is established | Our edge is i18n + custom branding + unified experience |

---

## 9. Timeline (Proposed)

| Phase | Timeframe | Deliverable |
|-------|-----------|-------------|
| **Research & Planning** | Feb 13, 2026 | This PRD, research docs |
| **POC Build** | Feb 14-16, 2026 | Working multi-language demo |
| **Meeting with Steve** | Week of Feb 17 | Present POC, discuss needs |
| **Proposal** | Feb 17-21 | Formal scope & pricing (if engaged) |
| **Phase 1 Build** | Mar-Apr 2026 | Event hub + registration (before Nagoya Pro) |
| **Phase 2** | May-Sep 2026 | Streaming + results (before Marianas Open) |

---

*This is a living document. Updated as we learn more from the meeting.*
