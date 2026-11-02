# D3 / C3 — public copy and translations

## Scope and acceptance

Started November 2, 2026 from `origin/main` at `d7103b6` in the isolated `agent/copy-and-translations` worktree. This PR stays open for the parent/merge owner.

The site serves athletes, families, fans and the organizing team. Public visitors browse ASJJF-backed events, results, rankings, profiles and media; staff edit site content and organization settings. ASJJF remains the source for competition data. No event, ranking, result or production-data repair is part of this change.

Sources: `docs/2027-PLATFORM-PLAN.md`, `docs/TRANSLATION_STRATEGY.md`, current public components, `SiteContent`, its public/admin controllers and existing seeds, and the Brain Dump's `work/shimizu-tech/marianas-open/marianas-open-research.md`. Historical notes establish product context; the checked-out implementation determines this audit.

Required acceptance, executed by the agent:

1. Staff copy defaults match the current locale text; CMS overrides render in the selected language. Missing/blank translations use localized defaults. Existing keys and all staff values survive repeat seeding.
2. Every English locale leaf (including arrays and interpolation variables) exists in all six other locales. Identical strings require a documented per-locale allowlist entry. No missing-key fallback is allowed.
3. Whole points use locale grouping without `.0`; genuine fractions survive. Public dates follow the selected language, including profile history and ticket deadlines.
4. Browse public pages at 390px and 1440px in English and Japanese; switch language using the UI, reload, and verify `<html lang>` and saved choice. Check profile navigation, content, footer, overflow and invalid dates. No native-device claim is made.
5. Full API/web gate passes; owned resources and test database are removed. No merge or production mutation.

## Copy audit

The exact bindings and seed defaults are in `web/src/content/publicCopy.json` and `api/db/data/public_copy.json`.

Moved or connected to existing site content:

- Home: hero CTA text, partner introduction/descriptions/destinations, sponsor introduction, development credit and CTA. Existing homepage hero, feature and statistic keys remain in use; About statistics now honor the same keys.
- About: hero, story paragraphs, timeline, federation statement, photo caption, facts, signature/tagline and contact invitation. Reuses the existing `about_*` keys for previously seeded text.
- Calendar: series introductions, including the count-dependent variants. Home: the visible journey badge, heading and introductions. Past events: archive introduction.
- Watch: page introduction, YouTube CTA/destinations, featured introduction and future-feature descriptions.
- Rules: page introduction, organizer guidance, rulebook introduction and contact invitation.
- Impact/sponsorship: page/empty-state introduction, sponsor invitation, CTA and sponsorship email (retains its original `info@marianasopen.com` default).
- Footer: tagline, rights notice, credit and YouTube channel. About/Rules email and telephone now read the already editable organization settings. About location is a site-content entry.

Intentionally left in code or locale files:

- UI chrome: navigation, ordinary button verbs, filters, table headings, pagination, validation, loading/error/empty states, accessibility instructions, season-state labels and source labels. Hard-coded English chrome found during the audit was added to the locale files.
- Official competition/rule summaries and checklists stay in locale files; this PR does not make federation rules editable organizer marketing text.
- Event/prize/venue/registration/accommodation data, athlete/academy names and profiles, sponsor placements and gallery captions keep their existing dedicated admin/API models. Proper names are not translated.
- Brand/logo text, technical SEO titles/descriptions/schema/canonical URLs, official rulebook/source URLs, platform names, share endpoints, and image asset metadata stay code-managed. Organizer partner/YouTube destinations are editable, and accept only HTTP(S) links.
- There are no separate Sponsors or Contact routes: sponsor placements appear on Home/Event pages, the sponsor invitation is on Impact, and contact appears on About/Rules/footer.

## Deployment and data safety

`PublicCopySeed` uses `insert_all(..., unique_by: :key)`, so existing rows, metadata and all translations are skipped intact. It bypasses callbacks and does not enqueue translation requests. New defaults include all seven locale values and are marked translated so subsequent English edits can enqueue normal automatic translation.

Render's existing pre-deploy `db:migrate` task runs the create-only seed after successful migrations. It is also available as `bin/rails site_content:seed_public_copy` and through the existing site-content seed. Never run the repository's demo `db:seed` against production: it deletes unrelated data. No schema migration or production command was run for this PR.

## Verification ledger

Automated gates and browser results are recorded in the PR at the tested head. CMS overrides are covered by isolated rendering tests, not by writing to production.

Browser environment: local Vite with `VITE_API_URL=https://marianas-open-api.onrender.com`; production requests are restricted to GET. Production CORS rejects localhost, so the isolated QA browser passes through the unchanged live GET response bodies with a local CORS response header. No production configuration changes. T3 preview snapshot timed out twice (`Preview automation snapshot timed out after 15000ms.`); the alternate browser transport also timed out. An isolated Chromium instance supplies the actual browser checks and screenshots.

Native review is recommended for the newly translated federation statement (especially affiliation terminology) and Filipino ticketing/Watch terminology. These are real translations, not English placeholders; `tl` remains Filipino/Tagalog and no Chamorro locale was added.

Impeccable's advisory scan flags existing gradient text. Those styles remain unchanged because visual redesign is outside this PR.
