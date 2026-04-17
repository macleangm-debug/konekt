# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: 335 ITERATIONS, 100% PASS RATE

---

## COMPLETED IN SESSION (Apr 17, 2026)

### 1. Dashboard Profit Tracking (DONE)
- Added `profit_month` KPI to admin dashboard (Revenue - Base Costs - Commissions)
- Revenue & Profit Trend chart shows dual-line graph (6 months)
- Profit formula: sell_price - vendor_cost - distributed_commissions

### 2. Admin-Only Credit Terms (DONE)
- Credit terms section on Customer 360 Profile (Overview tab)
- Fields: credit_terms_enabled, payment_term_type (prepaid/net_30/net_60/net_90/custom), payment_term_days, credit_limit
- Admin-only badge — Sales cannot set credit terms
- PUT /api/admin/customers-360/{id}/credit-terms endpoint
- Credit terms returned in 360 detail response

### 3. Service Site Visit 2-Stage Flow (DONE)
- Full workflow: Initiate → Fee Payment → Visit Scheduled → In Progress → Findings Submitted → Service Quote Generated
- POST /api/site-visits/initiate creates site_visit + visit-fee quote (SVQ-prefix)
- Ops workflow: PATCH status, POST submit-findings, POST generate-service-quote
- Service quote applies pricing engine margins to vendor base cost
- SiteVisitsPage.jsx with stage filters, progress bars, detail drawer
- Route: /admin/site-visits under Operations nav

### 4. Statement of Accounts Branding (DONE)
- StatementPage.jsx updated with branded view toggle
- Branded view uses CanonicalDocumentRenderer for consistent document styling
- Export Branded PDF button for CanonicalDocumentRenderer output
- Regular table view still available as default

### 5. Multi-Country Configuration (DONE - Previous Session)
- CountriesTab in Settings Hub with TZ, KE, UG configs
- Currency, VAT rate, phone prefix, doc prefix, timezone per country

### 6. Document Numbering (DONE - Previous Session)
- DocNumberingTab in Settings Hub
- Configurable prefixes/digits for QT, IN, ORD, DN, PO, SKU
- document_numbering.py generates format like QT-TZ-000001

### 7. Order Status Restrictions (DONE - Previous Session)
- Sales blocked from updating order status (403)
- Request Status endpoint for sales to ask Ops for updates

---

## TAXONOMY: Products (37 cats) | Services (7 cats) — zero orphans

## SERVICE CARDS — LIVE ON MARKETPLACE
- 6 service categories with subcategories
- Site visit location field for Facilities, Technical, Office Branding categories
- Fulfillment badges: Site Visit, On-site, Digital, Delivery/Pickup

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`

---

## UPCOMING TASKS

### P0 — Deployment Critical
1. Upload first real product listing end-to-end (Product Upload Wizard at /admin/vendor-ops/new-product)
2. Execute first live Group Deal (Group Deals admin at /admin/group-deals)
3. Activate internal sales and external affiliates
4. End-to-end order flow test (quote → invoice → payment → order → delivery)

### P1 — Post-Launch
1. "Customize this" CTA on product pages → linked service categories
2. Guided checkout flow (delivery address, pickup option)
3. Client credit terms enforcement in checkout (skip payment if within credit limit)
4. Per-product fulfillment_type override

### P2 — Backlog
1. Light micro-interactions (card hover lift, button click feedback, skeleton loaders)
2. Full Operations automation (SLA timers, vendor scoring, advanced tracking)
3. Delivery/service handover tracking
4. Statement of Accounts PDF auto-send scheduling

## RECOMMENDED REPORTS FOR LAUNCH
1. **Profit & Loss Report** — Monthly/quarterly P&L showing revenue, COGS (base costs), gross margin, commissions, net profit
2. **Order Profitability Report** — Per-order breakdown: sell price, base cost, margin, commissions, net profit
3. **Sales Performance Report** — Rep-level revenue, deals closed, commission earned, conversion rate
4. **Affiliate Performance Report** — Attribution, conversions, commission payable, ROI per affiliate
5. **Accounts Receivable Aging** — Outstanding invoices by age bucket (current, 30d, 60d, 90d+)
6. **Client Lifetime Value Report** — Revenue per client, order frequency, average order value
7. **Inventory Turnover Report** — Stock movement, fast/slow movers, reorder alerts
8. **Site Visit Pipeline Report** — Visits by stage, conversion rate to service quotes, avg visit-to-quote time
