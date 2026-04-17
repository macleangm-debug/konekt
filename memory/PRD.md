# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: 336 ITERATIONS, 100% PASS RATE

---

## COMPLETED (Apr 17, 2026 — Session 2)

### Batch 1 Fixes
1. **Quote Creation Preview** — Fixed CanonicalDocumentRenderer props (docType, toBlock, lineItems, subtotal, tax, total). Preview now shows company branding, logo, bank details, signature immediately. Client info + items populate live as added.
2. **Marketplace "No Listing Found"** — Removed misleading empty state when no filters active. Service cards always visible below product grid.
3. **Profit Display Fix** — Dashboard profit floors at TZS 0 when no revenue (no misleading negative from test commissions)
4. **Operations Nav Consolidation** — Merged all Ops items: Orders & Fulfillment, Site Visits, Deliveries, Purchase Orders, Supply Review
5. **Go-Live Reset** — New feature in Settings Hub > Launch Controls. Testing Mode / Controlled Launch / Full Live modes. "Go Live" button clears all test data (orders, quotes, invoices, customers, commissions) while preserving settings, catalog, admin accounts.

### Session 1 Features
6. **Dashboard Profit Tracking** — profit_month KPI + Revenue & Profit dual-line trend chart
7. **Admin-Only Credit Terms** — CreditTermsSection on Customer 360 Profile, PUT endpoint
8. **Service Site Visit 2-Stage Flow** — Full workflow: Initiate → Fee Quote → Visit → Findings → Service Quote
9. **Statement of Accounts Branding** — Branded view toggle using CanonicalDocumentRenderer
10. **Multi-Country Config** — CountriesTab with TZ, KE, UG
11. **Document Numbering** — Configurable prefixes (QT-TZ-000001)
12. **Order Status Restrictions** — Sales blocked (403), Request Status endpoint

---

## TAXONOMY: Products (37 cats) | Services (7 cats) — zero orphans

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`

---

## REMAINING TASKS

### P0 — Critical
1. Upload first real product listing E2E (Product Upload Wizard)
2. Execute first live Group Deal
3. Activate internal sales + external affiliates
4. Full E2E order flow test

### P1 — Important
5. Number formatting (thousand separators across all financial displays)
6. Phone prefix on all form inputs
7. Vendor Ops account switching (Ops acts as vendor)
8. Services in Quote Creation (add service items, "Request for Quote" for unpriced)
9. Credit terms enforcement at checkout
10. "Customize this" CTA on product pages → linked services

### P2 — Polish
11. Light micro-interactions (hover lift, skeleton loaders)
12. Service card subcategory content (some categories show empty when expanded)
13. Full Operations automation (SLA timers, vendor scoring)
