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
- No scattered settings — Settings Hub is single source of truth
- No custom drawers — StandardDrawerShell via Portal everywhere
- Desktop lists = tables. Promotions: policy-driven. Discounts display as TZS amounts.
- Affiliate attribution auto-carried from URL to checkout.

## What's Been Implemented (Summary)

### Core Platform: Auth, catalog, checkout, orders, payments (Stripe + bank), payment proofs
### Growth: Pricing engine, policy-driven promotions, affiliates (identity + payout), affiliate application flow (public → admin review → auto-create), attribution system
### Content: Content Studio (WYSIWYG, 4 layouts, dynamic branding), Sales Content Hub
### Admin Config: Settings Hub (15 sections, sidebar), Business Settings
### Team Performance: Overview (6 KPIs + table), Leaderboard (top 3 + ranking), Alerts (actionable table with CTAs)
### Partner Ecosystem: KPI row (7 metrics), coverage summary (regions/categories/gaps), management table (6 columns), detail drawer
### UI/UX Stabilization: StandardDrawerShell (Portal, full-viewport), CRM contained, all percentage display removed

## Key API Endpoints
- `GET /api/admin/partner-ecosystem/summary` — Partner KPIs, coverage, partners list
- `POST /api/affiliate-applications` — Public application
- `POST /api/affiliate-applications/{id}/approve` — Admin approve
- `GET/POST/DELETE /api/admin/affiliates` — Affiliate CRUD
- `GET /api/admin/team-performance/summary` — Team data
- `POST /api/admin/promotions` — Policy-driven promotion

## Upcoming Tasks
1. Weekly Digest Browser View — shareable executive report
2. Global phone number format standardization

## Backlog (P2)
- Twilio WhatsApp / Resend Email (blocked on keys)
- Backend creative rendering, Advanced Analytics Dashboard

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`
