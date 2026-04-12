# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) with unified login, role-based portals, payment processing, catalog, order management, growth/conversion engine.

## Core Architecture
- React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage

## System Principles
- Settings Hub = single source of truth. No scattered settings.
- Promotions: policy-driven. No manual discount values. Discounts = TZS amounts.
- StandardDrawerShell via Portal everywhere. Desktop = tables.
- Affiliate attribution: auto-captured, auto-applied at checkout.
- Categories: canonical structure required on all items. No "Uncategorized".
- Phone: normalized +XXXXXXXXXXXXX format via PhoneNumberField everywhere.

## Completed Features

### Core: Auth, catalog, checkout, orders, Stripe + bank payments, payment proofs
### Growth: Pricing engine, policy-driven promotions, affiliates (identity + payout, auto-commission), affiliate application flow, attribution system
### Content: Content Studio (WYSIWYG, 4 layouts, dynamic branding), Sales Content Hub
### Admin: Settings Hub (15 sections), Business Settings
### Team: Overview (6 KPIs + table), Leaderboard, Alerts (actionable table with CTAs)
### Partner Ecosystem: KPI row (7 metrics), coverage/gap analysis, management table, drawer
### Weekly Digest: Executive report with KPIs, revenue breakdown (by canonical category), operations health, sales, ecosystem, alerts, action items
### Categories: Canonical `/api/categories` endpoint, 25 categories with subcategories, enforced on products/services
### Phone: Global PhoneNumberField (country prefix + normalization) on affiliate forms and applications
### UI/UX: StandardDrawerShell (Portal), CRM contained, all % display removed, drawer audit complete

## Key API Endpoints
- `GET /api/categories` — Canonical categories with subcategories
- `GET /api/admin/weekly-digest/snapshot` — Executive digest
- `GET /api/admin/partner-ecosystem/summary` — Partner KPIs + coverage
- `GET /api/admin/team-performance/summary` — Team data
- `POST /api/affiliate-applications` — Public application
- `GET/POST/DELETE /api/admin/affiliates` — Affiliate CRUD
- `POST /api/admin/promotions` — Policy-driven promotion

## Upcoming / Backlog
- Global phone standardization on remaining forms (customers, vendors, partners)
- Twilio WhatsApp / Resend Email (blocked on keys)
- Backend creative rendering, Advanced Analytics Dashboard
- Data Integrity Dashboard (missing categories, formats, mappings)

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`
