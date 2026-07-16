# Marianas Open — Live Tournament Platform

**Client:** Marianas Open / Fury Promotions, LLC

**Contact:** Steve Shimizu (President & Founder)

**Status:** Live production platform

**Website:** https://marianasopen.com

## Current state

This repository contains the live Marianas Open digital platform built and maintained by Shimizu Technology. The earlier planning/POC framing in this README was stale and no longer described the implemented product.

The public website is live and currently receives **3,000+ visitors per month** according to the project owner as of July 2026.

## Documentation

| Document | Description |
|----------|-------------|
| [PRD.md](./docs/PRD.md) | Product requirements and historical planning |
| [RESEARCH.md](./docs/RESEARCH.md) | Marianas Open, competitive landscape, and technology research |
| [POC-SPEC.md](./docs/POC-SPEC.md) | Historical proof-of-concept specification and design direction |
| [COMPETITIVE-ANALYSIS.md](./docs/COMPETITIVE-ANALYSIS.md) | FloGrappling, Smoothcomp, UFC Fight Pass, and related platforms |
| [QUESTIONS.md](./docs/QUESTIONS.md) | Historical discovery questions |
| [local-prod-like-uploads.md](./docs/local-prod-like-uploads.md) | Production-like local S3/Solid Queue gallery upload testing |

## What the platform supports

- International tournament calendar and event detail pages
- Competitor profiles, teams/academies, rankings, and results
- Past-event history and event galleries
- Live-stream/watch experience
- Rules, impact, organization, and sponsor content
- Global search and social/QR sharing
- Multilingual content, including English, Japanese, Korean, Portuguese, Tagalog, Simplified Chinese, and Traditional Chinese
- Administrative management for events, competitors, academies, results, videos, images, sponsors, announcements, settings, and site content
- Role-protected administration and managed media uploads
- Analytics/SEO-oriented public experience

## Project structure

```text
marianas-open/
  api/      # Rails API, PostgreSQL, authentication, admin/content/media endpoints
  web/      # React + Vite + TypeScript public site and administration UI
  docs/     # Product research, historical POC documents, architecture, QA, and operations notes
```

The documents that refer to a POC or potential future build are retained as historical planning artifacts. They are not the current product status.

## Stack

- React, Vite, and TypeScript
- Ruby on Rails API
- PostgreSQL
- Clerk authentication
- Managed media uploads/storage
- PostHog analytics
- Internationalization and structured SEO support

## Public-proof boundary

The public site and public tournament content can be demonstrated. Do not expose administrative credentials, unpublished content, private contact information, analytics details, or upload/storage configuration in portfolio demos.

---

*Shimizu Technology — Building for the Marianas*
