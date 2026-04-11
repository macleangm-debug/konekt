# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) with unified login, role-based portals (Admin, Customer, Vendor, Sales), payment processing, product/service catalog, order management, and a growth/conversion engine.

## Core Architecture
- **Frontend**: React (CRA) + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Payments**: Stripe (sandbox mode)
- **Storage**: Object storage via Emergent integrations
- **Auth**: JWT-based with role routing

## What's Been Implemented

### Core Platform (Complete)
- Unified `/login` with role-based routing
- Admin, Customer, Vendor/Partner, Sales/Staff portals
- Product & Service catalog with categories
- Cart, Checkout, Order creation flow
- Stripe sandbox + bank transfer with payment proof upload
- Payment queue with admin approval

### Growth & Conversion Layer (Complete)
- Unified Pricing Policy Engine (margin tiers + distribution splits)
- Promotions CRUD with canonical wiring (single `promotions` collection for all surfaces)
- Instant Quote Estimation
- Live Margin Simulator in Settings Hub

### Content & Distribution Layer (Complete)
- **Content Studio** — 4 layouts, 4 themes, 2 formats. WYSIWYG html2canvas export. ALL branding from Settings Hub.
- **Save & Publish** pipeline
- **Sales Content Hub** — Mobile-first share feed

### Admin Configuration (Complete)
- **Settings Hub** — Sidebar layout, 15 sections, single source of truth
- **Business Settings** — Company identity, contact, banking, tax

### Team Performance (Redesigned — Feb 2026)
- **Backend endpoint** `/api/admin/team-performance/summary` — aggregates orders, leads, quotes, commissions, ratings
- **Team Overview** — 6 KPI cards + 9-column performance table with weighted scoring
- **Leaderboard** — Top 3 podium + full ranking table with Score
- **Alerts** — Actionable table with severity icons, type filters, real CRM data

### Canonical UI Consolidation Pass (Complete — Feb 2026)
- Content Creator merged into Content Studio
- Duplicate Promotions Engine removed
- Affiliates & Affiliate Payouts converted to data tables
- Standard Drawer Migration (Promotions, Products, CRM, Affiliates, Payouts)

### Critical Stabilization Pass (Complete — Feb 2026)
- **StandardDrawerShell** — Rewritten with React Portal for true full-viewport coverage (full height, full overlay, scrollable body, sticky footer)
- **Promotions wiring audit** — Fixed `platform_promotion_engine.py` to query canonical `promotions` collection. Inactive promos disappear everywhere.
- **Affiliate form cleanup** — Removed Commission Type/Value from creation (shows Settings defaults as read-only)
- **CRM width fix** — Contained to `max-w-7xl`, consistent heading typography
- **Content Studio hierarchy** — Increased font sizes, logo size, Minimal layout image area

## Key API Endpoints
- `POST /api/admin/content-center/publish` — Save & Publish branded creative
- `GET /api/content-engine/template-data/products` — Template-ready product data
- `GET /api/content-engine/template-data/branding` — Dynamic branding from Settings Hub
- `GET /api/admin/team-performance/summary` — Comprehensive team performance data
- `GET/PUT /api/admin/settings-hub` — Settings Hub
- `GET/PUT /api/admin/business-settings` — Business config

## Upcoming Tasks (P1)
1. Partner Ecosystem page redesign — clear management table
2. Weekly Digest Browser View — shareable executive report

## Backlog (P2)
- Twilio WhatsApp Integration (blocked on API keys)
- Resend Email Integration (blocked on API key)
- Backend-side creative rendering for bulk generation
- Advanced Analytics Dashboard

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`
