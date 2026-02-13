# Competitive Analysis — BJJ Streaming & Tournament Platforms

## The Big Players

---

### 1. FloGrappling (by FloSports)

**What they are:** The dominant streaming platform for BJJ. Part of FloSports, which covers 25+ niche sports.

**Website:** flograppling.com

**Business Model:**
- **$150/year** (marketed as "$12.50/mo" but you MUST pay annually)
- No true monthly option — this is a massive pain point in the community
- Subscription gives access to ALL FloSports properties (wrestling, track, etc.), not just grappling
- They sign **exclusive streaming deals** with tournament organizers

**What They Do Well:**
- Live streaming of major events (IBJJF, ADCC previously, Polaris)
- Expert commentary during live events
- Athlete profiles and in-depth analysis
- Original documentaries ("All Access" series)
- News/articles — they function as a media company too
- Huge content library (years of archived matches)
- Recently signed Polaris (Europe's longest-running grappling promotion, Nov 2025)
- Signed FPJJ (Brazilian federation) and UIJJ (Italian federation) for exclusive streaming

**What They Do Poorly (Community Feedback):**
- **Pricing is the #1 complaint** — $150/year with no monthly option feels like a scam
- **800+ BBB complaints** about misleading subscription practices
- **Stream quality issues** — lag, buffering, low camera quality (Reddit: "recording with $200 240p cameras")
- **Terrible search** — hard to find specific matches in the archive
- **No match indexing** — you're scrubbing through long videos
- **Lost ADCC** — ADCC signed with UFC Fight Pass instead (multi-year exclusive deal, 2023)
- Community sentiment is overwhelmingly negative on r/bjj

**Key Insight:** FloGrappling is widely hated but used because there's no real alternative for live BJJ. This is a HUGE opportunity gap.

**Relationship with Marianas Open:** FloGrappling covered the Marianas Open in 2017-2018 (at least). The relationship appears to have ended — no recent Flo coverage found.

---

### 2. Smoothcomp

**What they are:** The #1 tournament management software for combat sports. Think of them as the "backend" — registration, brackets, scoring, and now streaming.

**Website:** smoothcomp.com

**Business Model:**
- Per-event pricing for organizers (exact cost not public, but described as "fairly cheap" by users)
- Free for athletes/spectators to browse events and results

**What They Do Well:**
- **Registration:** Weight class, belt rank, age division, academy affiliation
- **Bracket generation:** Automatic bracket creation based on registrations
- **Live scoring:** Digital scoreboards synced to brackets
- **Competitor profiles:** Track athletes across events, look up records
- **Livestreaming integration:** THREE options:
  1. **Smoothcomp TV (PPV):** Their own platform — automatically cuts matches and links them to brackets/profiles. "The best watch page on the internet." Pay-per-view model.
  2. **YouTube integration:** Custom integration that manages stream keys automatically
  3. **Custom RTMP/SRT:** Stream to any platform
- **Smoothstreamer app:** Free mobile app (iPhone/iPad/Android) — scan QR code, tap record, stream with scoreboard overlay automatically embedded
- **Multi-language support:** 18 languages including Japanese, Korean, Chinese, Arabic
- **Mobile app:** For athletes to check brackets, schedules, results
- **Federation Platform:** For organizations managing multiple events
- **Academy finder:** Community feature

**What They Could Do Better:**
- Not a media company — no news, no documentaries, no editorial content
- Less brand recognition among casual fans
- The PPV/streaming is newer and less proven at massive scale

**Key Insight:** Smoothcomp is the GOLD STANDARD for tournament operations. Their streaming integration (especially Smoothcomp TV's automatic match cutting + bracket linking) is exactly the kind of thing the Marianas Open needs. We should study this deeply.

**The Smoothcomp TV killer feature:** When you stream through Smoothcomp TV, it **automatically cuts individual matches and links them to the bracket and competitor profiles.** So instead of scrubbing through a 10-hour video, you just click a match in the bracket and watch that specific fight. THIS is what FloGrappling fails at and what Leon wants to build.

---

### 3. UFC Fight Pass

**What they are:** UFC's streaming platform that has expanded into BJJ/grappling.

**Business Model:**
- **$25 for 6 months** (BJJ-only content tier, introduced 2025)
- Full Fight Pass subscription includes UFC + all combat sports

**Key Deal:** Signed ADCC to an exclusive multi-year streaming deal (2023). This was a HUGE blow to FloGrappling, which previously had ADCC. 40+ ADCC events per year including Opens, Trials, and the World Championship.

**What They Do Well:**
- Massive infrastructure (owned by UFC/TKO Group)
- Professional production quality
- Large existing audience (UFC fans who discover BJJ)
- Affordable pricing compared to FloGrappling

**Relevance:** Shows that the market is fragmenting — ADCC left Flo for Fight Pass, proving exclusive deals aren't permanent and there's room for new players.

---

### 4. ASJJF (asjjf.org)

**What they are:** The Asian Sport Jiu-Jitsu Federation — the federation the Marianas Open is affiliated with.

**What They Provide:**
- Event registration and management
- Rankings (Asia, Japan, Philippines, Korea, Marianas Pro, etc.)
- Event listings and competitor records
- The platform Marianas Open currently depends on for registration

**Limitations:**
- Generic federation platform — not branded for Marianas Open
- No streaming features
- No multi-language fan-facing experience
- Registration UX is functional but not polished

---

### 5. Other Notable Platforms

| Platform | What It Does | Notes |
|----------|-------------|-------|
| **MartialMatch** | Tournament software (Smoothcomp alternative) | "Affordable and easy to use" — newer, smaller |
| **BJJ Battle Royale** | Tournament management software | Small/indie, 408 Facebook likes |
| **BJJ Heroes** | Competitor profiles/records database | Community reference, not a tournament platform |
| **Mataleao.ca** | Registration + brackets | Mentioned by Canadian organizers |
| **BJJ Tour** | Events with embedded live broadcasts | Multi-mat streaming on their website |

---

## Key Lessons & Takeaways

### What's Working in the Market

1. **Smoothcomp's match-to-bracket linking** — The automatic cutting of individual matches from a stream and linking them to brackets/profiles is the single most impressive feature in this space. FloGrappling doesn't have this. This should be our north star for the VOD experience.

2. **Smoothcomp's streaming setup** — QR code scan → auto stream with scoreboard overlay is genius. Zero technical skill needed from the organizer. Their Smoothstreamer app on mobile is a game-changer for smaller events.

3. **YouTube as infrastructure** — Both Smoothcomp and BJJ Tour use YouTube Live as the streaming backend. Free, reliable, handles scale. No need to build our own streaming infrastructure.

4. **Multi-language is table stakes** — Smoothcomp supports 18 languages. But none of the streaming/media platforms (FloGrappling, UFC Fight Pass) offer multi-language experiences. This is our gap.

5. **BJJ-only pricing works** — UFC Fight Pass proved this with their $25/6mo BJJ tier. People will pay for focused content.

### What's NOT Working

1. **FloGrappling's pricing model** — Annual-only at $150 with no monthly option. 800+ BBB complaints. The community actively hates them. Lesson: transparent, flexible pricing.

2. **FloGrappling's search/discovery** — Can't find specific matches. Lesson: match indexing and search is critical.

3. **Exclusive deals fragmenting the market** — ADCC left Flo for UFC Fight Pass. Fans need multiple subscriptions. Lesson: don't lock things behind exclusive paywalls if you want to grow the sport.

4. **Camera quality** — FloGrappling criticized for low camera quality. Lesson: if you're going to stream, invest in decent cameras.

5. **No platform serves international audiences in their language** — English-only streaming, English-only commentary, English-only UX. For an event like Marianas Open with competitors from 6 countries, this is a massive missed opportunity.

### Our Differentiation Opportunity

| Feature | FloGrappling | Smoothcomp | UFC Fight Pass | **Us** |
|---------|-------------|------------|----------------|--------|
| Multi-language UI | No | Yes (18 lang) | No | **Yes (priority)** |
| Multi-language commentary | No | No | No | **Potential** |
| Match-specific VOD | No (scrub) | Yes (auto-cut) | No | **Yes (inspired by SC)** |
| Registration | No | Yes | No | **Yes** |
| Live streaming | Yes | Yes (newer) | Yes | **YouTube embed** |
| Tournament brackets | No | Yes | No | **Yes** |
| News/editorial | Yes | No | Yes | **Phase 2** |
| Competitor profiles | Basic | Yes | Basic | **Yes** |
| Social sharing (localized) | No | No | No | **Yes** |
| Pricing transparency | Poor | Good | Good | **Good** |

### Specific Recommendations for the Marianas Open Platform

1. **Don't try to replace Smoothcomp for brackets/scoring** — they've been doing this for 10+ years. Instead, consider integrating with them OR building a focused fan/media experience that complements tournament operations.

2. **Own the streaming/VOD experience** — This is where the real gap is. YouTube Live for infrastructure + our own UI for discovery, language switching, and social sharing.

3. **Match indexing is the killer feature** — After every event, every single fight should be searchable by competitor, weight class, belt rank, academy, round. This is what FloGrappling fails at and what families in Japan want.

4. **Multi-language is our edge** — Nobody else does this well for BJJ. With competitors from 6 countries, localized everything (UI, emails, social cards, commentary tracks) is a genuine competitive advantage.

5. **Free for fans, paid for premium** — Don't be FloGrappling. Free live streams to grow the audience, premium for VOD library, multi-angle, commentary tracks.

---

*Last updated: Feb 13, 2026*
*Research by: Prime (Shimizu Technology)*
