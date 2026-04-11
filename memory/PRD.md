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
- Promotions simplified — admin defines name/scope/dates only, discount auto-calculated from pricing policy
- Instant Quote Estimation
- Live Margin Simulator in Settings Hub

### Content & Distribution Layer (Complete)
- **Content Studio** — 4 layouts, 4 themes, 2 formats. WYSIWYG html2canvas export. ALL branding from Settings Hub.
- **Save & Publish** pipeline
- **Sales Content Hub** — Mobile-first share feed (drawer migrated to StandardDrawerShell)

### Admin Configuration (Complete)
- **Settings Hub** — Sidebar layout, 15 sections, single source of truth
- **Business Settings** — Company identity, contact, banking, tax

### Team Performance (Redesigned)
- **Backend endpoint** `/api/admin/team-performance/summary` — aggregates orders, leads, quotes, commissions, ratings
- **Team Overview** — 6 KPI cards + 9-column performance table with weighted scoring
- **Leaderboard** — Top 3 podium + full ranking table with Score
- **Alerts** — Actionable table with Reference, Owner/Rep (resolved names), severity filters, contextual CTAs

### Canonical UI Consolidation (Complete)
- Content Creator merged into Content Studio
- Duplicate Promotions Engine removed
- Affiliates & Affiliate Payouts converted to data tables
- Standard Drawer Migration complete system-wide

### Critical Stabilization Pass (Complete)
- **StandardDrawerShell** — React Portal, full-viewport, z-index 9998/9999
- **Promotions wiring** — canonical `promotions` collection only (orphaned `platform_promotions` bypassed)
- **Affiliate form** — Identity + Payout details only. Commission from settings. No manual override.
- **CRM width** — Contained to `max-w-7xl`
- **Content Studio hierarchy** — Increased font/logo/image sizes

### Correction Pass (Complete)
- **Global drawer enforcement** — PaymentProofsAdminPage, SalesContentHubPage migrated to StandardDrawerShell
- **Affiliate form completion** — Phone, payout method (mobile money/bank), conditional fields
- **Promotions simplification** — Removed discount_type/discount_value inputs entirely. Runtime-calculated only.
- **Alerts redesign** — Reference column, resolved owner names, contextual CTA buttons

## System Principles
- No manual economics in forms — all pricing/commission from Settings
- No scattered settings — Settings Hub is single source of truth
- No custom drawers — StandardDrawerShell via Portal everywhere
- Desktop lists = tables, cards only for mobile/media

## Key API Endpoints
- `POST /api/admin/content-center/publish` — Save & Publish branded creative
- `GET /api/content-engine/template-data/products` — Template-ready product data
- `GET /api/content-engine/template-data/branding` — Dynamic branding from Settings Hub
- `GET /api/admin/team-performance/summary` — Team KPIs, reps, alerts
- `GET/PUT /api/admin/settings-hub` — Settings Hub
- `GET/PUT /api/admin/business-settings` — Business config

## Upcoming Tasks (in order)
1. Affiliate Application Flow (public apply → admin review → approve/reject)
2. Partner Ecosystem Page Redesign (KPI row + management table + coverage)
3. Weekly Digest Browser View (shareable executive report)

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
