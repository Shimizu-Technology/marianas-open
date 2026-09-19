# Commerce proof of concept on staging

The shop at `https://mo.shimizu-technology.com/shop` can exercise the customer and Deal Depot workflows without connecting Stripe or EasyPost. It is a demonstration, not a sales channel. No card is collected, no money moves, no postage is purchased, and commerce email delivery is disabled.
Staging responses carry a `noindex` header so search engines should not list the preview.

## What the preview exercises

- A separate demo catalog with product options, stock reservations, and both delivery and pickup checkout.
- Example delivery prices included in the displayed order total. They are generated locally and are **not carrier rates**; the demo parcel dimensions are placeholders.
- A no-card payment completion that creates a clearly marked simulated order.
- Staff order preparation, demo label recording, fulfillment status changes, and mock refunds.

Demo products and package presets are marked `demo_only` in the database. The storefront serves only demo products while POC mode is active and only real products otherwise. Checkout and rate creation reject a cart from the wrong catalog. Real launch-readiness checks ignore demo products and parcels. Order status and admin views retain a `simulated` label even after the switch is turned off. The operations CSV includes a `simulated` column; staging totals are not revenue.

## Enabling on staging

1. In the staging service's private `ops/staging/runtime.env`, set `COMMERCE_ENABLED=true` and `COMMERCE_POC_MODE=true`.
2. Keep staging Stripe and EasyPost API keys absent. `ops/staging/common.sh` rejects a mixed mock/key deployment. Staging Compose always sets `COMMERCE_EMAIL_DELIVERY_MODE=disabled`.
3. Deploy the reviewed `staging` branch through the existing deployment flow. The API activates POC mode only when Rails runs as `production`, `COMMERCE_DEPLOYMENT_ENV=staging`, and `PUBLIC_FRONTEND_URL=https://mo.shimizu-technology.com`.
4. Run `bin/rails commerce:poc_setup` once inside the staging API container. It marks products whose every SKU begins `PREVIEW-` as demo-only, tops up their synthetic stock to at least 50 available units each, and creates the explicitly unmeasured demo parcel. The task refuses to run outside POC mode and is safe to rerun. These stock adjustments are not Deal Depot inventory.
5. Test a shipping order and a pickup order on mobile and desktop. Use a demo contact address; no email is sent. In the admin order view, record a demo label and mock refund. Check that Launch Readiness remains blocked for real provider keys, measured packaging, and the other release gates.

The preview products and prices are synthetic. Never replace them with real merchandise or claim that these example rates are the final shipping price.

## Leaving POC mode

Turning `COMMERCE_POC_MODE` off hides the demo catalog and parcel. It does **not** convert simulated orders into sales or make them fulfillable through real providers. Demo orders remain identifiable by their mock Checkout Session IDs and cannot be refunded or labeled through a real provider.

Real payments require an approved Stripe account, test and then live credentials, signed webhooks, payment/refund pilots, and confirmed seller/tax/policy decisions. Real delivery requires a measured ship-from address and package presets, EasyPost test then production credentials, route-specific carrier/customs pilots, and Deal Depot's actual packing and handoff process. Adding API keys alone is not a release gate. Use the admin Launch Readiness checklist and promote only after the real workflow passes end-to-end tests.
