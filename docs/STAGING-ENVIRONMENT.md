# Marianas Open staging environment

## Purpose

Staging is the shared acceptance environment for commerce and other substantial changes. It gives Steve, Deal Depot, and the development team a stable URL to review work before production. It is not a second production system and must not contain production customer data or live provider credentials.

The public application remains on Netlify, Render, and Neon. A merge to `main` still releases production. Staging runs on Shimizu Technology hardware to avoid another recurring hosting bill.

## Architecture

```text
Reviewer
  -> Cloudflare Access
  -> mo.shimizu-technology.com
  -> Cloudflare Tunnel on Mac mini
  -> Tailscale Serve HTTPS on MacBook Pro
  -> loopback-only Docker origin:8788
  -> Caddy web container
       -> React static application
       -> Rails API container
       -> Rails Solid Queue worker
       -> staging-only PostgreSQL
```

The MacBook Pro is the application host because it has substantially more memory and disk headroom. The Mac mini remains the always-on control plane: it owns the Cloudflare Tunnel and availability monitoring, but it does not take on the Rails, Node, or PostgreSQL workload.

No router ports are opened. Docker binds only to loopback, and Tailscale Serve forwards tailnet traffic on port 8788 to that loopback origin. Cloudflare Access protects the interactive hostname. Provider callbacks use `mo-hooks.shimizu-technology.com`; that hostname is not a substitute for webhook signature verification, replay protection, or rate limiting.

## Git flow and review gates

1. Create a feature branch and isolated worktree from `staging`.
2. Open a pull request into `staging`.
3. GitHub runs API tests and security scans, frontend lint/build, and deployment-config validation.
4. CodeRabbit and Greptile review pull requests to both `staging` and `main`.
5. After the pull request is accepted and merged, CI publishes immutable ARM64 container images tagged with the merge commit SHA.
6. The MacBook polls only successful `staging` CI runs, pulls those images, backs up the staging database, runs migrations once, health-checks the candidate, and rolls application containers back if the health check fails.
7. After owner acceptance, open a pull request from `staging` to `main`. That pull request gets the same CI and review gates. Merging it releases production through the existing Netlify and Render integrations.

Keep only one active release train in `staging`. If unfinished work must coexist with a release candidate, place it behind a feature flag or wait to merge it.

The Rails security scan currently records eight inherited Brakeman warnings. CI fails if that count increases or if the scanner itself errors. Those findings remain visible in every run and should be removed in a dedicated security pass; once fixed, lower the explicit baseline in the workflow.

## Environment boundaries

Staging uses:

- A local PostgreSQL volume with synthetic test records.
- A local Active Storage volume, never the production S3 bucket.
- Clerk test credentials.
- Stripe Sandbox credentials when commerce is added.
- EasyPost test credentials when shipping is added.
- No Resend key and `COMMERCE_EMAIL_DELIVERY_MODE=disabled` hardcoded in the Compose service, so staging records suppressed notification attempts but cannot send customer email even if a host variable is set accidentally.
- A separate or disabled analytics project.

Stripe and shipping webhooks must be configured for `https://mo-hooks.shimizu-technology.com/...` and must use staging-only signing secrets.

## MacBook Pro installation

The intended service checkout is `/Users/leonshimizu/services/marianas-open-staging`. It is a deployment checkout, not a development worktree.

1. Install Colima and create the dedicated `marianas-open-staging` profile with 4 CPUs, 6 GiB RAM, and a 40 GiB disk.
2. Copy `ops/staging/runtime.env.example` to `ops/staging/runtime.env` and keep `STAGING_BIND_ADDRESS` on `127.0.0.1`.
3. Store these services under the `marianas-open-staging` account in the macOS login keychain:
   - `marianas-open-staging-postgres`
   - `marianas-open-staging-secret-key-base`
   - `marianas-open-staging-clerk-secret-key`
   - `marianas-open-staging-easypost-api-key` (EasyPost test key; optional until commerce QA begins)
   - `marianas-open-staging-easypost-webhook-secret` (HMAC secret for the exact EasyPost test webhook)
   - `marianas-open-staging-stripe-api-key` (a least-privilege Stripe test restricted key)
   - `marianas-open-staging-stripe-webhook-secret` (signing secret for the exact staging webhook endpoint)
4. Install the LaunchAgent plist from `ops/staging/launchd/` into `~/Library/LaunchAgents/`.
5. Bootstrap it with `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.shimizutechnology.marianas-open-staging.plist`.
6. Expose the loopback origin only to the tailnet with `tailscale serve --bg --yes 8788`.

The agent checks every three minutes. It never builds source on the host and does not require a GitHub token after the container packages are public.

## Mac mini installation

Create a dedicated Cloudflare Tunnel rather than modifying the tunnels that serve Party Games or Håfa Code. Install its generated configuration and credential file under Jerry's `.cloudflared` directory, then supervise that exact tunnel with launchd. Route both staging hostnames to the MacBook Tailscale origin.

In Cloudflare Zero Trust, create a self-hosted Access application for `mo.shimizu-technology.com` and allow only the reviewers' email addresses. Route only `/api/v1/webhooks/stripe` and `/api/v1/webhooks/easypost` from `mo-hooks.shimizu-technology.com` to the origin; every other hook-host path returns `404`. Rails verifies each raw payload with its provider-specific signing secret and deduplicates provider event IDs before changing an order or shipment.

## Recovery

- Application failure: `deploy.sh` restores the prior image SHA automatically. Migrations must therefore remain backward compatible.
- Database recovery: restore the newest file in the service checkout's `backups/` directory. Backups are retained for 14 days.
- MacBook unavailable: the public staging URL is unavailable, but production is unaffected.
- Mac mini unavailable: the tunnel is unavailable, but the staging stack and its data remain on the MacBook.

## Production promotion checklist

- Current `staging` CI is green.
- CodeRabbit and Greptile reviewed the current head with no actionable findings.
- Steve or the designated business reviewer accepted the browser flow on staging.
- Stripe remains in Sandbox and EasyPost remains in test mode during acceptance.
- Database migrations are backward compatible.
- A staging database backup exists.
- The `staging` to `main` pull request contains only the intended release.
