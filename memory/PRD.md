# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: 346 ITERATIONS — 100% PASS RATE

---

## ALL FEATURES COMPLETE (Apr 17-20, 2026)

### Country Intelligence (Latest - Batch 10)
1. **Auto-detect user country** — Browser timezone → /api/geo/detect-country → auto-sets marketplace country (Africa/Dar_es_Salaam→TZ, Africa/Nairobi→KE, Africa/Kampala→UG)
2. **Admin Country Reports** — /admin/country-reports with period selector (week/month/quarter/year). Shows revenue, profit, margin, orders, quotes, invoices, new customers, outstanding — broken down by TZ/KE/UG. Export to JSON.
3. **Reports API** — GET /api/admin/reports/summary, /vendors, /customers with period and country params.
4. **Marketplace auto-detect** — On first load, detects user's timezone and auto-selects their country in the marketplace selector.

### Full Feature Manifest (24 Features, All Verified)
1. Dashboard Profit Tracking + Revenue & Profit dual-line chart
2. Admin-Only Credit Terms on Customer Profiles
3. Service Site Visit 2-Stage Flow
4. Statement of Accounts branded rendering
5. Multi-Country Config + Document Numbering
6. Order Status Restrictions (Sales blocked)
7. Quote Creation with branded live preview
8. Marketplace service cards fix
9. Go-Live Reset (Testing → Live mode)
10. Impersonate Users + Return Banner
11. "Customize this" CTA on products
12. Credit Terms at Checkout
13. Feedback/Issue Widget + Admin Inbox + Badge
14. Vendor-Category Assignments + Order Auto-Splitting
15. Number & Currency Format Settings
16. Admin Override Promo (all distributable margin)
17. Services in Quote Creation
18. Micro-interactions (card lift, button press, stagger)
19. Vendor Order Auto-Routing
20. Country Switcher (admin + marketplace)
21. Anti-Bot Protection (honeypot + timing + rate limiting)
22. Multi-Country Data Isolation (country_code on entities)
23. Country Expansion Pages (non-live markets)
24. Country Reports + Geo Auto-Detection

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
