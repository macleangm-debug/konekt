# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: 337 ITERATIONS, 100% PASS RATE

---

## COMPLETED (Apr 17, 2026)

### Session 2 — Batch 2
1. **Go-Live Reset** — Settings Hub > Launch Controls now shows 2 cards: Launch Controls (Testing/Controlled/Full Live) + "Go Live — Clear Test Data" with confirmation flow
2. **Impersonate Users** — Admin/Ops can "Act as" any non-admin user (vendor, sales). POST /api/admin/impersonate/{user_id}. LogIn button on Users page.
3. **"Customize this" CTA** — Product detail pages show "Customize this product" with links to related service categories (from category config)
4. **Credit Terms at Checkout** — Checkout quote endpoint checks customer credit_terms_enabled + credit_limit. Returns payment_required_now=false when within credit limit.
5. **Operations Nav Consolidated** — Orders & Fulfillment, Site Visits, Deliveries, Purchase Orders, Supply Review all under Operations

### Session 2 — Batch 1
6. **Quote Creation Preview** — Branded preview with CanonicalDocumentRenderer (logo, company info, bank details)
7. **Marketplace Fix** — "No Listing Found" hidden when service cards visible
8. **Profit Display** — Floors at TZS 0 when no revenue
9. **Operations Nav** — Consolidated all ops items

### Session 1
10. Dashboard Profit Tracking (KPI + dual-line chart)
11. Admin-Only Credit Terms (Customer 360 Profile)
12. Service Site Visit 2-Stage Flow
13. Statement of Accounts Branding
14. Multi-Country Config + Document Numbering
15. Order Status Restrictions

---

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`

## REMAINING

### P0
- Promotions wired from categories (admin override promo that gives all distributable margin)
- Number formatting (full thousand separators on detail/table views)
- Services in Quote Creation (add service items, Request for Quote)

### P1
- Vendor Ops account switching UI improvements (return-to-admin flow)
- Light micro-interactions
- Service card subcategory content fix
