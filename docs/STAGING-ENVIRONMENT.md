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
  -> Tailscale-only origin on MacBook Pro:8788
  -> Caddy web container
       -> React static application
       -> Rails API container
       -> Rails Solid Queue worker
       -> staging-only PostgreSQL
```

The MacBook Pro is the application host because it has substantially more memory and disk headroom. The Mac mini remains the always-on control plane: it owns the Cloudflare Tunnel and availability monitoring, but it does not take on the Rails, Node, or PostgreSQL workload.

No router ports are opened. The origin binds only to the MacBook's Tailscale address. Cloudflare Access protects the interactive hostname. Provider callbacks use `mo-hooks.shimizu-technology.com`; that hostname is not a substitute for webhook signature verification, replay protection, or rate limiting.

## Git flow and review gates

1. Create a feature branch and isolated worktree from `staging`.
2. Open a pull request into `staging`.
3. GitHub runs API tests and security scans, frontend lint/build, and deployment-config validation.
4. CodeRabbit and Greptile review pull requests to both `staging` and `main`.
5. After the pull request is accepted and merged, CI publishes immutable ARM64 container images tagged with the merge commit SHA.
6. The MacBook polls only successful `staging` CI runs, pulls those images, backs up the staging database, runs migrations once, health-checks the candidate, and rolls application containers back if the health check fails.
7. After owner acceptance, open a pull request from `staging` to `main`. That pull request gets the same CI and review gates. Merging it releases production through the existing Netlify and Render integrations.

Keep only one active release train in `staging`. If unfinished work must coexist with a release candidate, place it behind a feature flag or wait to merge it.

## Environment boundaries

Staging uses:

- A local PostgreSQL volume with synthetic test records.
- A local Active Storage volume, never the production S3 bucket.
- Clerk test credentials.
- Stripe Sandbox credentials when commerce is added.
- EasyPost test credentials when shipping is added.
- No Resend key, so staging cannot send customer email.
- A separate or disabled analytics project.

Stripe and shipping webhooks must be configured for `https://mo-hooks.shimizu-technology.com/...` and must use staging-only signing secrets.

## MacBook Pro installation

The intended service checkout is `/Users/leonshimizu/services/marianas-open-staging`. It is a deployment checkout, not a development worktree.

1. Install Colima and create the dedicated `marianas-open-staging` profile with 4 CPUs, 6 GiB RAM, and a 40 GiB disk.
2. Copy `ops/staging/runtime.env.example` to `ops/staging/runtime.env`. Bind `STAGING_BIND_ADDRESS` to the MacBook's current Tailscale IPv4 address.
3. Store these services under the `marianas-open-staging` account in the macOS login keychain:
   - `marianas-open-staging-postgres`
   - `marianas-open-staging-secret-key-base`
   - `marianas-open-staging-clerk-secret-key`
4. Install the LaunchAgent plist from `ops/staging/launchd/` into `~/Library/LaunchAgents/`.
5. Bootstrap it with `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.shimizutechnology.marianas-open-staging.plist`.

The agent checks every three minutes. It never builds source on the host and does not require a GitHub token after the container packages are public.

## Mac mini installation

Create a dedicated Cloudflare Tunnel rather than modifying the tunnels that serve Party Games or Håfa Code. Install its generated configuration and credential file under Jerry's `.cloudflared` directory, then supervise that exact tunnel with launchd. Route both staging hostnames to the MacBook Tailscale origin.

In Cloudflare Zero Trust, create a self-hosted Access application for `mo.shimizu-technology.com` and allow only the reviewers' email addresses. Keep `mo-hooks.shimizu-technology.com` out of the interactive Access policy so Stripe and EasyPost can reach it; secure each webhook endpoint at the application layer.

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
