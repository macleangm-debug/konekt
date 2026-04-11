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
- Desktop lists = tables, not cards
- Promotions: policy-driven. No manual discount values.
- All discounts display as TZS amounts, never percentages
- Affiliate attribution auto-carried from URL to checkout

## What's Been Implemented

### Core Platform (Complete)
- Unified `/login` with role-based routing
- Admin, Customer, Vendor/Partner, Sales/Staff portals
- Product & Service catalog, Cart, Checkout, Order creation
- Stripe sandbox + bank transfer

### Growth & Conversion (Complete)
- Pricing Policy Engine, Promotions (policy-driven), Affiliates (identity + payout, auto-commission)
- Affiliate attribution: auto-captures ?aff=, ?affiliate=, ?ref=, persists, auto-applied at checkout
- **Affiliate Application Flow**: Public `/partners/apply` → Admin `/admin/affiliate-applications` → Approve/Reject → Auto-creates affiliate with settings-based commission

### Content & Distribution (Complete)
- Content Studio: 4 layouts, 4 themes, 2 formats. WYSIWYG. Dynamic branding.
- Save & Publish pipeline, Sales Content Hub

### Admin Configuration (Complete)
- Settings Hub: 15 sections, sidebar layout, single source of truth
- Business Settings: Company identity, contact, banking, tax

### Team Performance (Complete)
- `/api/admin/team-performance/summary`, Overview, Leaderboard, Alerts (actionable table with CTAs)

### UI/UX Stabilization (Complete)
- StandardDrawerShell: React Portal, full-viewport, system-wide
- CRM: max-w-7xl contained
- All percentage display removed system-wide

## Key API Endpoints
- `POST /api/affiliate-applications` — Public application submission
- `POST /api/affiliate-applications/{id}/approve` — Admin approve (auto-creates affiliate)
- `POST /api/affiliate-applications/{id}/reject` — Admin reject
- `GET/POST/DELETE /api/admin/affiliates` — Affiliate CRUD
- `POST /api/admin/promotions` — Policy-driven promotion creation
- `GET /api/admin/team-performance/summary` — Team performance data

## Upcoming Tasks (in order)
1. Partner Ecosystem Page Redesign
2. Weekly Digest Browser View
3. Global phone number format standardization

## Backlog (P2)
- Twilio WhatsApp / Resend Email (blocked on keys)
- Backend creative rendering for scale
- Advanced Analytics Dashboard

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`
