# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: 338 ITERATIONS

---

## COMPLETED (Apr 17, 2026)

### Session 2 — Batch 3 (Latest)
1. **Feedback/Issue Widget** — Floating "Help & Feedback" button (bottom-left) on all pages. Users pick category (Bug, Payment, Order, Feature Request, General), describe issue. Admin inbox at /admin/feedback-inbox with stats + status management.
2. **Vendor-Category Assignment System** — Assign vendors to categories with type (Product/Service/Both) + preferred flag. Single Source auto-routes, Competitive shows all vendors.
3. **Order Splitting** — POST /api/admin/vendor-assignments/split-order auto-groups order items by vendor capability based on category assignments. Unassigned items flagged for manual routing.

### Session 2 — Batch 2
4. Go-Live Reset (Testing → Controlled → Full Live modes)
5. Impersonate Users (Admin/Ops act as vendor/sales)
6. "Customize this" CTA on products → related services
7. Credit Terms enforcement at checkout
8. Operations Nav consolidated

### Session 2 — Batch 1
9. Quote Creation branded preview
10. Marketplace "No Listing Found" fix
11. Profit display fix (floors at 0)

### Session 1
12. Dashboard Profit Tracking (KPI + dual-line chart)
13. Admin-Only Credit Terms
14. Service Site Visit 2-Stage Flow
15. Statement of Accounts Branding
16. Multi-Country Config + Document Numbering
17. Order Status Restrictions (Sales blocked)

---

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`

## REMAINING

### P0
- Promotions wired from categories (admin override promo = all distributable margin)
- Services in Quote Creation (add service items, "Request for Quote")
- Number formatting (full thousand separators on detail views)
- Impersonate return flow ("Return to Admin" banner)

### P1
- Light micro-interactions
- Service card subcategory content fix
- Full vendor-order routing automation in Operations
