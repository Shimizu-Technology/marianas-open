# Marianas Open development contract

## Branch flow

- Build each change on its own feature branch and isolated Git worktree.
- Open feature pull requests into `staging`. Do not merge feature branches directly into `main`.
- Promote a tested release with a pull request from `staging` into `main`.
- Treat a merge to `main` as a production release because Netlify and Render deploy `main` automatically.
- Back-merge an emergency production hotfix into `staging` immediately after it lands on `main`.

## Required verification

- Run the repository gate before opening or updating a pull request.
- Keep GitHub CI, CodeRabbit, and Greptile green on the current pull-request head.
- For UI work, verify the affected flow in a browser against the staging environment.
- Do not merge a staging-to-main release until the owner has accepted it on staging.

## Environment safety

- Production and staging must use separate databases, credentials, webhooks, storage, analytics, and payment/shipping test modes.
- Never copy production customer data into staging by default. Use synthetic or deliberately sanitized fixtures.
- Never send real customer email from staging.
- Provider callbacks that cannot pass Cloudflare Access belong on the separately routed webhook hostname and must still pass signature verification.
