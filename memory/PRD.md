# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) with unified login, role-based portals (Admin, Customer, Vendor, Sales), payment processing, product/service catalog, order management, and a growth/conversion engine.

## Core Architecture
- **Frontend**: React (CRA) + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Payments**: Stripe (sandbox mode)
- **Storage**: Object storage via Emergent integrations
- **Auth**: JWT-based with role routing

## System Principles
- No manual economics in forms — all pricing/commission from Settings
- Settings Hub = single source of truth. No scattered settings.
- StandardDrawerShell via Portal everywhere. Desktop = tables.
- Promotions: policy-driven. Discounts = TZS amounts, never %.
- Affiliate attribution: auto-captured from URL, auto-applied at checkout.

## Completed Features (All Tested & Verified)

### Core Platform
Auth, catalog, checkout, orders, payments (Stripe + bank), payment proofs

### Growth & Conversion
- Pricing Policy Engine, policy-driven promotions (no manual discount)
- Affiliates: identity + payout form, auto-commission from settings
- Affiliate Application Flow: public `/partners/apply` → admin review → auto-create affiliate
- Attribution: ?aff=, ?affiliate=, ?ref= → localStorage → auto-applied at checkout

### Content & Distribution
Content Studio (WYSIWYG, 4 layouts, dynamic branding), Sales Content Hub

### Admin Config
Settings Hub (15 sections, sidebar), Business Settings

### Team Performance
Overview (6 KPIs + 9-col table), Leaderboard (top 3 + ranking), Alerts (actionable table with CTAs)

### Partner Ecosystem
KPI row (7 metrics), coverage summary (regions/categories/gaps), management table, detail drawer

### Weekly Digest Browser View
Executive operations report at `/admin/weekly-digest`:
- Header (week range + timestamp)
- 6 KPI cards (Revenue, Orders, Customers, Affiliates, Partner Util %, Alerts)
- Revenue Breakdown (table + highlights)
- Operations Health (4 color-coded cards)
- Sales Performance (top 3 reps + insights)
- Partner Ecosystem insights + Affiliate Performance
- Alerts Summary (top 3 with CTAs)
- Action Items (deep links to relevant pages)

### UI/UX Stabilization
StandardDrawerShell (Portal, full-viewport), CRM contained, all % display removed

## Key API Endpoints
- `GET /api/admin/weekly-digest/snapshot` — Executive digest data
- `GET /api/admin/partner-ecosystem/summary` — Partner KPIs + coverage
- `GET /api/admin/team-performance/summary` — Team performance data
- `POST /api/affiliate-applications` — Public application
- `GET/POST/DELETE /api/admin/affiliates` — Affiliate CRUD
- `POST /api/admin/promotions` — Policy-driven promotion

## Upcoming Tasks
1. Global phone number format standardization

## Backlog (P2)
- Twilio WhatsApp / Resend Email (blocked on keys)
- Backend creative rendering, Advanced Analytics Dashboard

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`
