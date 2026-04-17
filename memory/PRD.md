# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: 340 ITERATIONS — ALL FEATURES VERIFIED

---

## COMPLETED (Apr 17, 2026) — 5 Batches

### Batch 5 (Latest)
1. **Micro-interactions** — Card hover lift (card-lift CSS), button press feedback (auto on data-testid buttons), staggered list entrance animations, skeleton shimmer
2. **Service card subcategory fix** — Categories without subcategories now show "Request Quote" button instead of empty state
3. **Active country config API** — GET /api/admin/active-country-config returns currency, VAT, phone prefix for the currently active country
4. **Vendor-order routing foundations** — Active country propagation ready for full multi-country expansion

### Batch 4
5. Number & Currency Format Settings (thousand separators, currency position, live preview)
6. Admin Override Promo (gives away entire distributable margin)
7. Services in Quote Creation (SystemItemSelector searches products + services)
8. Impersonation Return Banner

### Batch 3
9. Feedback/Issue Widget (floating + admin inbox)
10. Vendor-Category Assignments + Order Auto-Splitting
11. Go-Live Reset

### Batch 2
12. Go-Live Mode + Impersonate Users + "Customize this" CTA
13. Credit Terms at Checkout + Operations Nav

### Batch 1
14. Quote Creation branded preview + Marketplace fix + Profit display

### Session 1
15. Dashboard Profit Tracking + Admin Credit Terms + Site Visit 2-Stage Flow
16. Statement Branding + Multi-Country + Document Numbering + Order Restrictions

---

## Key URLs
- Admin Dashboard: /admin
- Quote Creation: /admin/quotes/new
- Vendor Assignments: /admin/vendor-assignments
- Site Visits: /admin/site-visits
- Feedback Inbox: /admin/feedback-inbox
- Settings Hub: /admin/settings-hub
- Marketplace: /marketplace

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
