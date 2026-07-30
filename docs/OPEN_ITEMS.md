# MyPetMart — Open Items

Items here block or affect specific modules. Each must be resolved before the
dependent module begins.

---

## OI-001 — Payment gateway selection
**Status:** Unresolved
**Blocks:** M5 (Cart & Checkout)
**Detail:** Payment gateway name, API credentials and merchant account have
not been confirmed. The proposal states "payment gateway setup support" but
does not name a provider (e.g. Razorpay, Cashfree, PayU, Stripe).
**Required from:** Client — provider name, API keys, test/live merchant account.

## OI-002 — Shipping provider selection
**Status:** Unresolved
**Blocks:** M5 (Checkout + shipping label flow)
**Detail:** Shipping partner name and API not confirmed. Proposal states "basic
shipping partner integration" but does not name the provider (e.g. Shiprocket,
Delhivery, Pickrr, Ecom Express).
**Required from:** Client — provider name, API credentials, test account.

## OI-003 — Cash on Delivery confirmation
**Status:** Unconfirmed — do not publish
**Blocks:** Payment method display in checkout; trust badge in header/footer
**Detail:** UI references show COD as a payment option. The proposal lists only
"payment gateway connection" — COD is not explicitly confirmed as in-scope.
If COD is approved, determine whether it requires backend order-status
differentiation.
**Required from:** Client — explicit yes/no on COD support.

## OI-004 — Pan-India shipping confirmation
**Status:** Unconfirmed — do not publish
**Blocks:** Shipping scope, checkout address validation, UI copy
**Detail:** UI references show "Shipping across India" as a trust badge. The
proposal references "basic shipping partner connection" without geographic scope.
**Required from:** Client — explicit confirmation of delivery geography.

## OI-005 — Verified reviews and customer ratings
**Status:** Unconfirmed — do not publish; feature not in proposal scope
**Blocks:** Product detail page, trust badges
**Detail:** UI references show "Verified reviews from pet parents" as a
marquee claim. The proposal does not include a reviews or ratings system.
Building reviews requires: review schema in DB, submission flow, admin
moderation, and trust badge logic. This is out of scope unless separately
approved and quoted.
**Required from:** Client — explicit decision (in scope + extra quote, or drop
the UI claim).

## OI-006 — Domain and DNS access
**Status:** Unresolved
**Blocks:** M9 (Deployment)
**Detail:** Client owns the domain; DNS records and registrar login have not
been shared.
**Required from:** Client — registrar login or DNS delegation.

## OI-007 — Cloudflare account
**Status:** Unresolved
**Blocks:** M3 (Product API + R2 upload)
**Detail:** No Cloudflare account credentials or R2 bucket details have been
shared.
**Required from:** Client or Invictus — Cloudflare account, R2 bucket name,
access key ID, secret access key.

## OI-008 — MySQL environment
**Status:** Unresolved locally; unresolved for production
**Blocks:** M1 (Database schema + Prisma migrations)
**Detail:** MySQL 8.4 is not installed on the development machine. No managed
MySQL host (PlanetScale, Railway, AWS RDS) has been selected.
**Required from:** Invictus — provision local MySQL 8.4 (Docker recommended)
and select production host.

## OI-009 — Product content
**Status:** Unresolved
**Blocks:** M8 (SEO), staging/demo environment
**Detail:** Client must supply product names, images, descriptions, pricing and
categories before the store can be seeded or launched.
**Required from:** Client — product catalogue in agreed format.

## OI-010 — Policy content
**Status:** Unresolved
**Blocks:** Policy pages (Terms, Privacy, Return Policy, Shipping Policy)
**Detail:** The proposal includes "basic policy pages if content provided".
No content has been received.
**Required from:** Client — written policy text for each page.

## OI-011 — Hosting cost conflict
**Status:** Risk — needs acknowledgement
**Blocks:** Hosting handover, Year 2 planning
**Detail:** The proposal states hosting is managed by Invictus for Year 1;
renewal is ₹2,000 + GST per year from Year 2, payable by client. This cost
is not in the ₹35,000 project total. Client must be made aware before
deployment.
**Required from:** Client — written acknowledgement of Year 2 hosting renewal
cost.

## OI-012 — Fixed delivery time claims
**Status:** Unconfirmed — do not publish
**Blocks:** Contact page FAQ, product page copy
**Detail:** UI Contact FAQ shows "How long does delivery take?" implying
specific time windows. No delivery SLA has been agreed or confirmed.
**Required from:** Client — either a confirmed delivery window or removal of
the time-specific FAQ entry.

---

## Summary

| ID | Topic | Blocks |
|----|-------|--------|
| OI-001 | Payment gateway | M5 |
| OI-002 | Shipping provider | M5 |
| OI-003 | Cash on Delivery | M5, UI copy |
| OI-004 | Pan-India shipping | UI copy, checkout |
| OI-005 | Reviews & ratings | Product detail, UI badges |
| OI-006 | Domain & DNS | M9 |
| OI-007 | Cloudflare / R2 | M3 |
| OI-008 | MySQL environment | M1 |
| OI-009 | Product content | M8, staging |
| OI-010 | Policy content | Policy pages |
| OI-011 | Hosting cost conflict | Deployment handover |
| OI-012 | Delivery time claims | Contact FAQ, UI copy |
