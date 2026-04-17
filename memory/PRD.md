# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: 341 ITERATIONS — 100% PASS RATE

---

## COMPLETED (Apr 17, 2026) — 6 Batches

### Batch 6 (Latest)
1. **Vendor Order Auto-Routing** — When orders are created from quotes, items auto-split by category → vendor assignments → vendor_orders created. Single-source categories auto-assign to preferred vendor. Competitive categories flag for vendor quotes. Manual trigger: POST /api/admin/orders-ops/{id}/auto-route
2. **Real-Time Feedback Badge** — Sidebar polls /api/admin/sidebar-counts every 30s. Feedback Inbox shows red badge with count of new feedback items. Also added discount_requests badge
3. **Country Switcher** — Admin header shows country dropdown (TZ/KE/UG) with flags. Each country has its own currency, VAT, phone prefix. Foundation for multi-tenant expansion where each country operates independently

### Previous Batches
4-17. [See previous PRD entries — all completed and tested]

---

## Key Endpoints
- `GET /api/admin/sidebar-counts` — Badge counts for all nav items
- `GET /api/admin/active-country-config` — Active country config (currency, VAT, etc.)
- `POST /api/admin/orders-ops/{id}/auto-route` — Manual vendor order routing
- `POST /api/admin/vendor-assignments/split-order` — Preview order splitting
- `POST /api/feedback` — Submit user feedback
- `POST /api/admin/impersonate/{user_id}` — Act as another user
- `POST /api/admin/system/go-live-reset` — Clear test data for deployment

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`

## Multi-Country Expansion Plan
Each country = separate operational unit:
- Own vendors, sales team, affiliates (assigned to country)
- Own orders, quotes, invoices (tagged with country_code)
- Own dashboard metrics (filtered by active country)
- Shared catalog structure, country-specific products & pricing
- Admin switches between country views via header dropdown
- Next step: Add country_code to all entities + filter queries
