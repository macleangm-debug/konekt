# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: 342 ITERATIONS — 100% BACKEND PASS RATE

---

## COMPLETED (Apr 17-20, 2026) — 7 Batches

### Batch 7 (Latest) — Multi-Country Architecture
1. **Country Selector in Settings Hub** — TZ/KE/UG buttons at top of all settings. Switching country loads that country's settings
2. **Per-Country Settings Storage** — Each country has its own settings block (settings_hub_TZ, settings_hub_KE, etc.)
3. **Settings Replication** — "Copy to KE/UG" buttons auto-replicate settings with country-specific adjustments (VAT: TZ=18%, KE=16%, UG=18%; Currency auto-mapped)
4. **Country Expansion Page** — Non-live countries show "Konekt is coming to [Country]" registration page

### Batch 6 — Vendor Routing + Notifications
5. Vendor Order Auto-Routing (auto-split by category → vendor assignments)
6. Real-Time Feedback Badge (sidebar polls every 30s)
7. Country Switcher in admin header

### Batches 1-5
8-22. Dashboard profit, credit terms, site visit flow, statement branding, multi-country config, doc numbering, order restrictions, quote preview, marketplace fix, go-live reset, impersonation, "Customize this" CTA, checkout credit terms, feedback widget + inbox, vendor assignments + order splitting, number format settings, admin override promo, services in quotes, micro-interactions

---

## Multi-Country Model
- Each country = separate operational unit
- Own settings, vendors, sales, pricing stored in settings_hub_{COUNTRY_CODE}
- Admin switches countries via Settings Hub selector or header dropdown
- Non-live countries show expansion/interest page
- Shared catalog structure, country-specific products & pricing

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
