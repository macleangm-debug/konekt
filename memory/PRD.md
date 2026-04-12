# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) with unified login, role-based portals, payment processing, catalog, order management, growth/conversion engine.

## Core Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth

## System Principles
- Settings Hub = single source of truth
- Promotions: policy-driven, no manual discount
- StandardDrawerShell via Portal everywhere
- Categories: canonical, required on all items
- Phone: normalized +XXXXXXXXXXXXX via PhoneNumberField (58 countries, searchable)
- Discounts display as TZS amounts, never percentages
- Affiliate attribution: auto-captured, auto-applied

## Completed Features (All Tested)
- **Core**: Auth, catalog, checkout, orders, Stripe + bank payments
- **Growth**: Pricing engine, policy-driven promotions, affiliates (identity + payout), affiliate application flow, attribution
- **Content**: Content Studio (WYSIWYG, 4 layouts, dynamic branding), Sales Content Hub
- **Admin**: Settings Hub (15 sections), Business Settings
- **Team**: Overview (6 KPIs + table), Leaderboard, Alerts (actionable table with CTAs)
- **Partner Ecosystem**: KPI row (7 metrics), coverage/gap analysis, management table, drawer
- **Weekly Digest**: Executive report with KPIs, revenue breakdown (canonical categories), operations, sales, ecosystem, alerts, action items
- **Categories**: `/api/categories` endpoint, 25 categories with subcategories
- **Phone**: Global PhoneNumberField (58 countries, flag+name+dial, search, keyboard nav, mobile bottom sheet)
- **UI/UX**: StandardDrawerShell (Portal), CRM contained, all % display removed, drawer audit complete

## Key API Endpoints
- `GET /api/categories` — Canonical categories
- `GET /api/admin/weekly-digest/snapshot` — Executive digest
- `GET /api/admin/partner-ecosystem/summary` — Partner KPIs
- `GET /api/admin/team-performance/summary` — Team data
- `POST /api/affiliate-applications` — Public application
- `GET/POST/DELETE /api/admin/affiliates` — Affiliate CRUD
- `POST /api/admin/promotions` — Policy-driven promotion

## Upcoming
- Category regression audit (ensure all products/services have canonical categories)
- Launch cleanup (remove dead routes, duplicate pages, legacy components)

## Backlog (P2)
- Twilio WhatsApp / Resend Email (blocked on keys)
- Backend creative rendering, Advanced Analytics Dashboard, Data Integrity Dashboard

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`
