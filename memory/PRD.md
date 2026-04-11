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
- Promotions: policy-driven. Admin defines name/scope/dates. System calculates discount from pricing policy tiers at runtime.
- All discounts display as TZS amounts, never percentages
- Affiliate attribution auto-carried from URL to checkout — no manual re-entry

## What's Been Implemented

### Core Platform (Complete)
- Unified `/login` with role-based routing
- Admin, Customer, Vendor/Partner, Sales/Staff portals
- Product & Service catalog, Cart, Checkout, Order creation
- Stripe sandbox + bank transfer with payment proof upload

### Growth & Conversion (Complete)
- Pricing Policy Engine (margin tiers + distribution splits)
- Promotions: policy-driven creation, runtime discount calculation
- Affiliates: identity + payout form, auto-commission from settings
- Affiliate attribution: auto-captures ?aff=, ?affiliate=, ?ref= URL params, persists in localStorage, auto-applied at checkout
- Instant Quote Estimation, Live Margin Simulator

### Content & Distribution (Complete)
- Content Studio: 4 layouts, 4 themes, 2 formats. WYSIWYG. Dynamic branding.
- Save & Publish pipeline, Sales Content Hub

### Admin Configuration (Complete)
- Settings Hub: 15 sections, sidebar layout, single source of truth
- Business Settings: Company identity, contact, banking, tax

### Team Performance (Complete)
- `/api/admin/team-performance/summary` — aggregated data
- Team Overview: 6 KPIs + 9-column table
- Leaderboard: Top 3 podium + ranked table
- Alerts: actionable table with Reference, Owner/Rep, CTAs

### UI/UX Stabilization (Complete)
- StandardDrawerShell: React Portal, full-viewport, system-wide
- Promotions: removed ALL legacy discount validation + display
- CRM: max-w-7xl contained
- Content Studio: increased font/logo/image sizes
- All percentage display removed: "Auto (policy)", "From settings", "TZS X off"

## Upcoming Tasks (in order)
1. Affiliate Application Flow (public apply → admin review → approve/reject)
2. Partner Ecosystem Page Redesign
3. Weekly Digest Browser View
4. Global phone number format standardization

## Backlog (P2)
- Twilio WhatsApp / Resend Email (blocked on keys)
- Backend creative rendering for scale
- Advanced Analytics Dashboard

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`
