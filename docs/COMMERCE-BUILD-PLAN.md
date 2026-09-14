# Marianas Open Commerce Build Plan

**Status:** In progress
**Target branch:** `staging`
**Production release:** promotion PR from `staging` to `main` after pilot approval

## Delivery rules

- Build each slice in an isolated worktree and feature branch.
- Keep storefront behavior behind `COMMERCE_ENABLED` until launch approval.
- Use synthetic products and provider test modes in development and staging.
- Require the repository gate, mobile and desktop browser QA, GitHub CI, and review-tool feedback for every PR.
- Never accept price, stock, shipping cost, tax, or final totals from the browser.
- Create a recoverable order before opening Stripe Checkout.
- Keep catalog, inventory, orders, payments, fulfillment, shipments, and refunds as separate application-owned records.

## Implementation tracker

| Slice | Scope | Status |
|---|---|---|
| 1 | Catalog, flexible variants, inventory ledger, public catalog API | Complete |
| 2 | Product and inventory administration, public storefront, cart | Not started |
| 3 | Delivery choice, address validation, EasyPost sandbox quotes | Not started |
| 4 | Durable orders, reservations, Stripe Checkout Sessions, webhooks | Not started |
| 5 | Customer order status, transactional notifications | Not started |
| 6 | Deal Depot fulfillment, labels, tracking, pickup | Not started |
| 7 | Refunds, reconciliation, reports, operational alerts | Not started |
| 8 | Failure hardening, physical shipping pilot, production launch | Not started |

## Live-launch gates

- Confirm the legal seller, eligible Stripe account, settlement bank, receipt name, and dispute/refund ownership.
- Confirm Guam tax treatment with a qualified adviser.
- Measure launch products and Deal Depot packaging.
- Confirm Deal Depot's ship-from address, carriers, hardware, pickup process, and support ownership.
- Physically test every enabled Guam, mainland, and international shipping route.
- Approve shipping, pickup, cancellation, return, privacy, and support policies.

These gates do not block test-mode implementation.
