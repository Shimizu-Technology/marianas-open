# Marianas Open visual refresh A

## Brief and acceptance

At base `75622f0` (November 2, 2026), athletes and parents need the next tournament's date, place and registration on the first phone screen; fans need completed-event results and photos. Preserve seven locales, the dark/gold identity, self-hosted Outfit/DM Sans, season phases, sponsor placements and accessible navigation. Sources: [platform plan, Phase C](../2027-PLATFORM-PLAN.md), [C1 runtime evidence](../qa/c1/README.md), current public API/code, and Brain-Dump `work/shimizu-tech/marianas-open/2026-02-25-uncle-steve-meeting.md` (historical context only). No API or production writes. Existing editable statistics stay unchanged pending client confirmation.

On this page, the Guam-to-Asia tournament circuit becomes a photographic event programme. The real Copa photograph introduces the next Copa; the compact programme lists the next stops. The live interaction is one Register control that lets the athlete choose Gi or No-Gi, with the published ASJJF destinations. Home claims/proof: next event → published name/date/place/photo; season → current-cycle event list; history → existing photos and editable statistics; partners/sponsors → existing placements. Off-season retains results/gallery destinations. Completed event pages lead with results and gallery and omit archived sales/travel.

Taste draw: `place-carries-it`, keeping brand palette/type. Use authentic event photographs with a local scrim. The dealt midline navigation, city-night stock pictures and oversized full-height rail conflict with the explicit unchanged navigation, real-event-photo and phone-density requirements; the brief takes precedence. No fabricated content or stock assets. Long published event names may exceed two lines on a phone rather than being renamed or truncated.

## Shared system (stable API)

Tailwind v4 configuration lives in `src/index.css` under `@theme`; there is no separate Tailwind config. Ground `navy-900`, surfaces `surface`/`surface-light`, primary text `text-primary`, secondary text `text-secondary`, action `gold`/`gold-400`. Gold is the only primary action colour. Keep semantic status colours and authentic sponsor/flag colours.

Outfit headings: hero 36–72px, section 28–40px, card 20–24px; DM Sans body 16px/1.6, supporting text 14px, labels 13px. Use sentence case for new interface copy, source casing for organizer-edited copy, event names and acronyms; no CSS uppercase or wide tracking. Radius: 8px controls/cards; circular avatars remain circular. Spacing: 4/8/12/16/24/32/48/64px; section padding 48px phone / 64px desktop; 20px phone gutters, 24px desktop, max width 1280px. Cards use one quiet border and surface; no resting shadow. Section headings align with content and keep description directly beneath.

Imports from `components/ui`: `Button` supports native button props or `to` (router link) or `href` (anchor), `variant="primary" | "secondary" | "ghost"` and `className`; default primary. `Card` is a styled div accepting HTML props. `SectionHeading` takes `title`, optional `description`, `className`; emits h2. `Chip` (also exported as `Label`) takes children and span props. Use exported `buttonClassName()` for existing links needing the same system.

`RegisterControl` takes `event` (registration URL fields), optional `className`, `variant`. Future `registration_opens_on` dates show a localized notice and ASJJF event-info link; null/past dates register unless `registration_not_open` or the event is closed. No links: renders nothing. One published option: direct new-tab link. Gi and No-Gi: one button opens a labelled modal choice with actual published links. Portal, trapped focus, Escape/backdrop/close dismissal and opener restoration reuse the existing modal lifecycle. No API changes.

Motion confirms input: a 120ms press response; choice dialog appears immediately, without keyboard animation. Supporting scroll reveals use at most 8px/240ms with no long cascade. Reduced motion removes transforms, transitions and smooth scrolling. No looping decorative indicator. Content and controls remain available immediately.

## Evidence and verification

Before evidence supplied by lead, deployed November 2: [home phone](2027-visual-refresh/before/s-home-390-0.png), [home desktop](2027-visual-refresh/before/s-home-1440-0.png), [Copa phone](2027-visual-refresh/before/s-copa27-390-0.png), [Copa desktop](2027-visual-refresh/before/s-copa27-1440-0.png), [completed MO](2027-visual-refresh/before/s-mo26-390-0.png), [calendar](2027-visual-refresh/before/s-calendar-390-0.png).

Agent executes affected public flows at 390×844 and 1440×900 in en/ja/zh-Hant: home, Copa 2027, completed MO 2026, calendar, archive, 404; isolated live/off-season fixtures; Gi/No-Gi new tabs; keyboard/Escape/focus; reduced motion; no overflow. Production public GET responses only, using C1's isolated browser CORS response headers. No registration submissions. Local gate: npm ci, lint, tsc -b, Vitest and build:no-translate. Focused tests cover event/photo selection, stars, registration and archive photo context. Impeccable advisory findings and final QA results will be appended after execution. Lead owns review, integration, merge and Leon's sign-off.

After: [home phone](2027-visual-refresh/after/home-en-390.png), [home desktop](2027-visual-refresh/after/home-en-1440.png), [Copa phone](2027-visual-refresh/after/copa-2027-en-390.png), [calendar](2027-visual-refresh/after/calendar-ja-390.png). The [acceptance matrix, audit exceptions and lead handoff](2027-visual-refresh/README.md) record final verification and remaining integration work.
