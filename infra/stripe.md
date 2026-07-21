---
doc: infra/stripe
updated: 2026-07-21
status: live account, one open blocker (see top)
---

# Stripe — Allternit LLC

**⚠ OPEN BLOCKER (as of 2026-07-21):** `charges_enabled` is still `false` (`requirements.pending_verification` on company/person address fields) despite Eoj having received an earlier verification email. **Nothing can actually be purchased until this flips.** Check the Stripe dashboard for a stuck-verification banner before assuming any checkout flow works. Re-verify this status before relying on it — check `charges_enabled` live rather than trusting this note if it's more than a few days old.

## Account

- Live account `acct_1TvNZgANxEzOvVEH`, email `allternitpbc@gmail.com`. Set up 2026-07-20.
- Branding (logo/colors) is dashboard-only — `POST /v1/account` is blocked on this account type; set manually in the dashboard. Brand colors: `#E07A5F` terracotta, `#1A1A1A` ink.

## Catalog

- 38 products, "starting at" floors of the service-catalog ranges. Canonical reference with all product IDs and payment links: `Allternit LLC/08_Revenue_Operations/STRIPE_CATALOG.md`.
- Each product carries the Allternit matrix-logo image via a public `raw.githubusercontent.com` URL from `Gizziio/allternit-assets` — **that GitHub repo must stay public** or every product image breaks.
- Payment links are card-only (`payment_method_types[0]=card`) — required while other payment methods were inactive; links keep working once more methods activate, no need to recreate them.
- Custom-quoted work (Tier C, Build/Retrofit/Husks) is invoiced ad hoc — no Stripe product needed.

## Keys

- Stripe CLI is installed (Homebrew) and logged in — restricted key, **read-only** in live mode.
- Live writes use a separate restricted key named `claude-setup`, stored in the macOS Keychain: `security find-generic-password -s stripe-allternit -w` (service `stripe-allternit`, account `allternit`).
- `claude-setup` scope has grown over time: started as Customers+Invoices write, later added Checkout Sessions:Read + Webhook Endpoints:Write for the booking automation (below). Check current scope in the Stripe dashboard before assuming a capability isn't there.

## Invoicing

- Programmatic invoicing script: `Allternit LLC/08_Revenue_Operations/send_invoice.py`. Supports itemized `--lines billing.csv` (rows `hours,description`, one line item each — mirrors client progress reports) or `--hours N`; flags `--customer/--rate/--sow/--period/--dry-run`. Reads the key from the Keychain entry above; customer-level custom fields and footer auto-inherit onto every invoice.
- Reference customer: **swyft market, Inc.** `cus_UvHgnkG4t4T0KA` (invoice prefix SWYFT, late-fee footer). Reusable Net-15 draft invoice `in_1TvR7BANxEzOvVEHwGICeSQw` at $60/hr for SOW-2026-001 Phase 2 — Eoj edits quantity to hours and sends each cycle. Custom fields: "Governing SOW: SOW-2026-001", "Attention: Brianni Manuel, CEO".
- New-client sequence (NDA → intake → SOW → Stripe customer+deposit → folder skeleton → time log → cycle billing) is fully documented in `Allternit LLC/06_Client_Ops_and_Contracts/00_New_Client_Kickoff_Playbook.md`.

## Booking automation (services.allternit.com, live 2026-07-21)

All 41 Stripe payment links redirect to `/thank-you.html` after checkout. A Cloudflare Worker `allternit-services-hooks` (source in `Allternit-websites/projects/services.allternit.com/worker/`, D1 database `allternit-services-bookings`) receives the `checkout.session.completed` webhook, **auto-creates/updates a Stripe Customer with no human approval step**, logs the booking to D1, and emails `allternitpbc@gmail.com` via Cloudflare Email Routing.

**⚠ Policy tension, flagged not resolved (2026-07-21):** this auto-customer-creation was built before this brain/CLAUDE.md's hard rule existed ("new Stripe customers... stay manual per the kickoff playbook, with the human driving each step"). It's live in production as of this writing. Eoj was asked to make the call on whether to keep it (arguable exception: it only tags an *already-paying* customer, no new business/money decision) or change the Worker to stop auto-creating Customers. Resolve and update this note before treating the rule as consistently enforced.

**Intake wizard (2026-07-21):** the small-business catalog's "Book" buttons no longer link straight to checkout — they open a 3-step wizard (`wizard.js`) that POSTs a full structured brief to the Worker's `/intake` endpoint (new `intakes` D1 table), gets back a reference id, then redirects to the normal Payment Link with `?client_reference_id=...` so the webhook can merge the full brief back in at payment time. Full detail in `STRIPE_CATALOG.md`'s "Intake wizard" section. Systems Audit / Run subscriptions on the homepage still use the older 2-field checkout-only intake, not yet converted.

**Deliberately does NOT** auto-draft an SOW or auto-invoice — that stays human judgment via the kickoff playbook. Full monitoring commands and the permission-grant history are documented in `STRIPE_CATALOG.md`'s "Automated booking pipeline" section — read that before touching the webhook or key scopes.
