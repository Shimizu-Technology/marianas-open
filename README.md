# Marianas Open platform

The official digital platform for the Marianas Open and its international jiu-jitsu circuit. It combines a public event, media, rankings, results, travel, sponsor, and impact experience with an invite-only tournament administration console.

The product exists to help Marianas Open grow beyond a once-a-year event website: athletes can discover and follow the circuit, while the operating team can manage yearly seasons, events, results, galleries, livestreams, content, sponsors, and user access without requiring a developer for routine changes.

## Architecture

- `web/` — React 19, TypeScript, Vite, Tailwind, Clerk, PostHog, and multilingual public/admin interfaces.
- `api/` — Rails 8 API, PostgreSQL, Active Storage, background jobs, ASJJF result importing, and role-based administration.
- `docs/` — Product research, requirements, competitive context, runbooks, and operational documentation.

The frontend is configured for Netlify and the API for a managed Rails/PostgreSQL environment. Public visitors do not download the admin application bundle.

## Local development

```bash
cd api
bundle install
bin/rails db:prepare
bin/rails server
```

In another terminal:

```bash
cd web
npm install
npm run dev
```

Copy environment values from `web/.env.example`; the primary integration variables are `VITE_API_URL`, the Clerk keys, PostgreSQL, Active Storage, and optional translation/analytics services.

## Verification

```bash
cd api && bin/rails test
cd web && npm run lint && npm run build
```

See [Admin operations](./docs/ADMIN-OPERATIONS.md) for yearly rollover and publishing, [Authentication](./docs/AUTH-SYSTEM.md) for roles, and [PRD](./docs/PRD.md) for the original product rationale.
