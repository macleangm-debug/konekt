# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: 345 ITERATIONS — 100% PASS RATE

---

## COMPLETED (Apr 17-20, 2026) — Full Country Wiring

### Country Filtering (Complete)
- **Marketplace country selector** — TZ/KE/UG dropdown in marketplace header
- **Product filtering** — Products filtered by vendor's country. TZ includes legacy products
- **Non-live redirect** — Selecting KE/UG redirects to branded expansion page
- **Dashboard KPIs** — Filter by ?country= param
- **User registration** — country_code derived from phone prefix
- **Orders/Invoices** — Tagged with country_code
- **Vendors/Partners** — Already have country_code field
- **Settings Hub** — Per-country settings with selector

### Full Feature List (All Tested & Verified)
1. Dashboard Profit Tracking + Revenue & Profit dual-line chart
2. Admin-Only Credit Terms on Customer Profiles
3. Service Site Visit 2-Stage Flow (fee quote → visit → service quote)
4. Statement of Accounts with branded CanonicalDocumentRenderer
5. Multi-Country Config + Document Numbering
6. Order Status Restrictions (Sales blocked, Request Status endpoint)
7. Quote Creation with branded live preview
8. Marketplace fix (service cards, no false empty state)
9. Go-Live Reset (Testing → Live mode with data cleanup)
10. Impersonate Users (Admin/Ops act as vendor/sales) + Return Banner
11. "Customize this" CTA on products → linked services
12. Credit Terms at Checkout (skip payment within credit limit)
13. Feedback/Issue Widget + Admin Inbox with real-time badge
14. Vendor-Category Assignments + Order Auto-Splitting
15. Number & Currency Format Settings (configurable separators)
16. Admin Override Promo (all distributable margin as discount)
17. Services in Quote Creation (products + services search)
18. Micro-interactions (card lift, button press, stagger animations)
19. Vendor Order Auto-Routing (auto-creates vendor_orders)
20. Country Switcher (admin header + marketplace)
21. Anti-Bot Protection (honeypot + timing + rate limiting)
22. Multi-Country Data Isolation (country_code on all entities)
23. Country Expansion Pages (non-live countries show interest form)
24. Marketplace Country Filtering (products by vendor country)

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
