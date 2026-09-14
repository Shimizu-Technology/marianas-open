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
| 2 | Product and inventory administration, public storefront, cart | Complete in PR #87 |
| 3 | Delivery choice, address validation, EasyPost sandbox quotes | Complete in PR #88 |
| 4 | Durable orders, reservations, Stripe Checkout Sessions, webhooks | Complete in PR #89 |
| 5 | Customer order status, transactional notifications | Complete in PR #90 |
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

## Slice 3 implementation contract

- Staff configure Deal Depot once as both a public pickup point and the ship-from origin. Pickup instructions, phone, and address are customer-facing; inventory codes and stock details are not.
- Staff configure the actual packed dimensions, empty weight, and maximum packed weight for each package used at Deal Depot. The first active package by operational priority that supports the packed order weight is used for the quote; package measurements must be confirmed during the physical pilot.
- Checkout offers only methods supported by every item in the bag. Pickup is free and never asks for a shipping address.
- For delivery, the API reloads active products, current prices, current inventory, allowed fulfillment methods, currency, weights, customs metadata, origin, and package data. Browser-supplied totals or product details are ignored.
- EasyPost receives the verified destination, Deal Depot origin, package dimensions, total packed weight, and customs items when Guam or another territory/international route requires them. Up to five matching-currency rates are returned in price order.
- Each rate is persisted without customer address data and returned as a signed, expiring 15-minute reference. The next slice must revalidate that reference and the submitted address/cart before creating an order and opening Stripe Checkout.
- `EASYPOST_API_KEY` selects real EasyPost test/live behavior. Deterministic fake rates require the explicit local-only `EASYPOST_FAKE_RATES=true`; staging never falls back to fake rates.

## Slice 4 implementation contract

- Marianas Open creates the order before redirecting to Stripe. The order records the current product and variant names, SKU, selected options, unit price, quantity, fulfillment method, customer contact, shipping address when applicable, and the server-calculated subtotal, shipping, tax, and total.
- Checkout accepts only a signed, unexpired shipping quote whose organization, location, cart digest, destination digest, currency, and amount still match the current server-side cart. Pickup orders require an active pickup location and never carry shipping charges or a shipping address.
- The selected Deal Depot inventory level is locked before stock is reserved. A pending order increases `reserved` without changing `on_hand`; a verified payment atomically decreases both values and records an immutable `sold` inventory movement. Gateway failures, Stripe expiration events, and the expiration job release active reservations without reducing stock on hand.
- A browser-generated checkout key and a Stripe idempotency key make retries return the original Checkout Session instead of creating another order or inventory hold.
- Stripe Checkout receives server-owned line items, shipping, currency, customer email, order number, and non-sensitive order identifiers. The browser cannot provide price, shipping cost, tax, total, Stripe metadata, success URL, or cancel URL.
- Stripe webhook processing verifies the raw request body with `STRIPE_WEBHOOK_SECRET`, records each Stripe event ID once, rejects amount or currency mismatches, and safely retries failed processing. Duplicate payment-complete events cannot consume stock twice.
- Payment cancellation returns to the existing order with a link to resume its Checkout Session. Payment sessions expire after 45 minutes; the cleanup job waits an additional five minutes for a delayed webhook before releasing the reservation.
- `STRIPE_API_KEY` enables real Stripe test/live Checkout; a least-privilege restricted key is preferred and each environment gets a separate key. The integration uses Stripe's current API version, client interface, dynamic payment methods, and a stable integration identifier. The explicit `STRIPE_FAKE_CHECKOUT=true` substitute works only in local Rails development so desktop and mobile browser QA can cover the redirect and payment-complete states without creating a real provider transaction.

## Slice 5 implementation contract

- Payment capture creates customer and configured operations notifications in the same database transaction as the paid order. Message bodies, recipients, and provider idempotency keys are snapshotted so retries cannot silently change an already-created confirmation.
- A durable notification outbox records pending, delivering, sent, suppressed, and failed states. Background delivery retries transient failures without creating a second provider message, and a five-minute recurring dispatcher recovers committed notifications whose original delivery job was lost or abandoned.
- Resend receives both accessible plain-text and responsive HTML versions. Customer confirmations include the order number, item summary, total, fulfillment expectations, support contact, and a signed status link; operations messages provide the corresponding fulfillment handoff.
- Delivery mode is explicit: `disabled` records intentional suppression, `sandbox` can send only to approved `resend.dev` test inboxes, and `live` sends to the snapshotted recipient. Idempotency keys include the Rails environment to prevent test and production deliveries from colliding in one Resend account.
- Staging hardcodes commerce email delivery to `disabled` in its runtime definition and does not receive a Resend key. It can exercise the full payment, outbox, and customer-status flow without contacting a real customer.
- Customers can recover the signed order-status link by entering both the random order number and normalized checkout email. Failed lookups return one generic response so the endpoint does not reveal which detail matched.
- The storefront and paid-order page expose clear status-recovery and next-step guidance for both pickup and shipping, with touch-friendly mobile layouts and equivalent desktop behavior.

## Live-launch gates

- Confirm the legal seller, eligible Stripe account, settlement bank, receipt name, and dispute/refund ownership.
- Confirm Guam tax treatment with a qualified adviser.
- Measure launch products and Deal Depot packaging.
- Confirm Deal Depot's ship-from address, carriers, hardware, pickup process, and support ownership.
- Physically test every enabled Guam, mainland, and international shipping route.
- Approve shipping, pickup, cancellation, return, privacy, and support policies.

These gates do not block test-mode implementation.
