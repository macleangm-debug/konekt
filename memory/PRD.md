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
- Desktop lists = tables, cards only for mobile/media
- Promotions are policy-driven: admin defines name/scope/dates, system calculates discount from pricing policy tiers

## What's Been Implemented

### Core Platform (Complete)
- Unified `/login` with role-based routing
- Admin, Customer, Vendor/Partner, Sales/Staff portals
- Product & Service catalog with categories
- Cart, Checkout, Order creation flow
- Stripe sandbox + bank transfer with payment proof upload

### Growth & Conversion Layer (Complete)
- Unified Pricing Policy Engine (margin tiers + distribution splits)
- Promotions: policy-driven (no manual discount). Admin defines name/scope/dates/stacking. Runtime calculates safe discount.
- Affiliates: identity + payout details form. Commission auto from affiliate_settings (12%).
- Instant Quote Estimation, Live Margin Simulator

### Content & Distribution Layer (Complete)
- Content Studio: 4 layouts, 4 themes, 2 formats. WYSIWYG. Dynamic branding from Settings Hub.
- Save & Publish pipeline, Sales Content Hub

### Admin Configuration (Complete)
- Settings Hub: 15 sections, sidebar layout, single source of truth
- Business Settings: Company identity, contact, banking, tax

### Team Performance (Complete)
- `/api/admin/team-performance/summary` aggregates orders, leads, quotes, commissions, ratings
- Team Overview: 6 KPIs + 9-column table
- Leaderboard: Top 3 podium + ranked table with Score
- Alerts: Actionable table with Reference, Owner/Rep (resolved names), severity filters, CTAs

### Stabilization & Correction Passes (Complete)
- StandardDrawerShell: React Portal, full-viewport, system-wide (Payment Proofs, Sales Hub, CRM, Promotions, Products, Affiliates, Payouts)
- Promotions wiring: canonical `promotions` collection only. Removed legacy discount validation.
- Affiliate CRUD: GET/POST/DELETE /api/admin/affiliates. Auto-commission from settings.
- CRM width: max-w-7xl, proper typography
- Content Studio: increased font/logo/image sizes

## Key API Endpoints
- `POST /api/admin/content-center/publish` — Save & Publish
- `GET /api/content-engine/template-data/products` — Template product data
- `GET /api/content-engine/template-data/branding` — Dynamic branding
- `GET /api/admin/team-performance/summary` — Team KPIs, reps, alerts
- `GET/POST/DELETE /api/admin/affiliates` — Affiliate CRUD
- `POST /api/admin/promotions` — Policy-driven promotion creation
- `GET/PUT /api/admin/settings-hub` — Settings Hub

## Upcoming Tasks (in order)
1. Affiliate Application Flow (public apply → admin review → approve/reject)
2. Partner Ecosystem Page Redesign
3. Weekly Digest Browser View

## Backlog (P2)
- Global phone number format standardization
- Twilio WhatsApp / Resend Email (blocked on keys)
- Backend creative rendering for scale
- Advanced Analytics Dashboard

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`
