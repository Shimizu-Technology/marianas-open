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
| 2 | Product and inventory administration, public storefront, cart | Implemented; PR review pending |
| 3 | Delivery choice, address validation, EasyPost sandbox quotes | Not started |
| 4 | Durable orders, reservations, Stripe Checkout Sessions, webhooks | Not started |
| 5 | Customer order status, transactional notifications | Not started |
| 6 | Deal Depot fulfillment, labels, tracking, pickup | Not started |
| 7 | Refunds, reconciliation, reports, operational alerts | Not started |
| 8 | Failure hardening, physical shipping pilot, production launch | Not started |

## Slice 2 implementation contract

- Staff manage products from one guided workflow: product details, arbitrary options and values, generated variants, pricing, fulfillment, physical/customs data, images, and inventory.
- Products and variants remain drafts by default. Publishing requires a complete active variant, at least one variant for every advertised fulfillment method, and a measured weight for every shippable active variant.
- Saved option types and variant records are retained so SKUs, inventory history, and future order references stay stable. Staff archive variants and products instead of deleting operational history.
- Every stock change goes through the transactional inventory service and records actor, reason, note, quantity delta, and resulting balance.
- The public storefront appears only when the server-side commerce flag is enabled. It reads price and availability from the API and handles loading, empty, disabled, sold-out, and retry states.
- The browser cart is versioned and persists only product IDs, variant IDs, and requested quantities. Checkout will re-price and revalidate every line on the server; browser totals will never be authoritative.

## Live-launch gates

- Confirm the legal seller, eligible Stripe account, settlement bank, receipt name, and dispute/refund ownership.
- Confirm Guam tax treatment with a qualified adviser.
- Measure launch products and Deal Depot packaging.
- Confirm Deal Depot's ship-from address, carriers, hardware, pickup process, and support ownership.
- Physically test every enabled Guam, mainland, and international shipping route.
- Approve shipping, pickup, cancellation, return, privacy, and support policies.

These gates do not block test-mode implementation.
