# Marianas Open commerce launch runbook

This runbook is the final handoff from working software to a controlled merchandise launch. The shop stays hidden until the business, Deal Depot, and Shimizu Technology complete these steps together.

## 1. Prepare staging

1. Merge each reviewed feature PR into `staging`.
2. Confirm the staging CI run is green and both ARM64 images were published.
3. Confirm the MacBook deployment reports the same merge SHA and has a fresh database backup.
4. Open Commerce → Launch Readiness on `mo.shimizu-technology.com`.
5. Resolve every automatic blocker. Do not paste credential values into launch notes, screenshots, chat, or tickets.

Staging must use Stripe test credentials, an EasyPost test key, separate webhook signing secrets, synthetic customer data, and disabled email delivery. `COMMERCE_ENABLED` may be enabled in staging for acceptance after those boundaries are confirmed.

## 2. Load the real launch catalog

For each launch product:

- Create the product, options, and every sellable size, color, or other variant.
- Assign a stable SKU, price, fulfillment methods, weight, and country of origin.
- Add a customer-facing product image and description.
- Add the verified Deal Depot quantity through an inventory adjustment with a source note.
- Publish only after a second person checks the price, SKU, option combinations, and stock.

Measure the packed product and packaging. Product weight is used to select a package; the package preset must reflect the box or mailer Deal Depot will actually use.

## 3. Configure business ownership

Before live payment credentials are installed, record who:

- is the legal seller and owns the merchandise;
- owns the Stripe account and settlement bank account;
- appears on card statements and receipts;
- responds to disputes and refund requests;
- owns Guam tax reporting;
- provides customer support; and
- approves returns, cancellations, privacy, pickup, and shipping policies.

Store the approved policy text in the public site before launch. Record the approval—not confidential account or banking details—in Launch Readiness.

## 4. Run physical pilots

Use a real launch item and its real package. For every route that will be available on day one:

1. Create a customer checkout and compare the EasyPost address result with the entered address.
2. Confirm the Stripe total equals merchandise, shipping, and tax shown by Marianas Open.
3. Complete a test payment and verify the order, inventory reservation/capture, and suppressed staging notifications.
4. Prepare the order in the Deal Depot workspace and buy the selected EasyPost test label.
5. Before production, repeat the carrier portion with a real paid label, tender the parcel, and verify the first carrier scan and tracking updates.
6. Compare the charged shipping amount with the actual postage and packaging. Adjust package data or enabled services if the difference is unacceptable.
7. Exercise a partial refund, a full refund, order reconciliation, and the inventory-return adjustment as separate actions.
8. Record the date, route, carrier/service, result, and any follow-up in the matching Launch Readiness note.

Run separate pilots for Guam, mainland U.S., and each Asia destination group that will be enabled. If Asia shipping will not be offered at launch, record that scope decision and its owner in the Asia gate before marking it passed.

## 5. Promote production

1. Confirm every required automatic check and human sign-off is passed on staging.
2. Keep a final staging database backup and record the deployed SHA.
3. Open a `staging` to `main` PR. Require CI and code review on the current head.
4. Install production Stripe and EasyPost credentials, separate webhook secrets, and live Resend sender credentials through the hosting providers' secret stores. Never commit them.
5. Register production webhooks for the documented checkout, refund, and tracking events.
6. Deploy with `COMMERCE_ENABLED=false` first. Run database migrations and verify the public site, admin, health endpoint, and provider configuration.
7. Open Commerce → Launch Readiness in production. Require no automatic blockers and all required sign-offs while `COMMERCE_ENABLED` remains false.
8. Turn on `COMMERCE_ENABLED`, deploy, and complete one low-value live order under staff supervision.

## 6. Watch the first orders

For the first 48 hours, check Commerce → Refunds & Reports at the start and end of each Deal Depot shift. Resolve payment, notification, shipping, and refund alerts before processing more orders. Reconcile the first live payments in Stripe and compare the first postage charges in EasyPost.

If totals, inventory, payment state, or provider mode look wrong, turn `COMMERCE_ENABLED` off and redeploy. Existing signed order-status links and staff records remain available while new storefront traffic is disabled.
