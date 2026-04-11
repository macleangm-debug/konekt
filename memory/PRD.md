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
- Payment queue with admin approval, vendor order auto-generation

### Growth & Conversion Layer (Complete)
- Unified Pricing Policy Engine (margin tiers + distribution splits)
- safeDisplay.js system-wide for empty table cells
- Promotions CRUD with backend tier-cap validation
- Instant Quote Estimation on product/service pages
- Live Margin Simulator in Settings Hub

### Content & Distribution Layer (Complete)
- **Content Creator Campaign System** — Campaign-driven content generation with multi-format assets, smart suggestions, media-first sharing workspace at `/admin/content-center`
- **Dynamic Branded Graphics Generator (Content Studio)** — Template-based social media creative generator at `/admin/content-studio`. Supports 4 themes (Light, Dark Premium, Promotional, Clean Minimal), 2 formats (Square 1080x1080, Vertical 1080x1920). Generates branded creatives with logo, product/service name, pricing, promo badges, CTA, contact details. Uses html2canvas for client-side rendering. Auto-generates 4 caption types (Short, Social, WhatsApp/Sales, Story).
- **Sales Content Hub** — Mobile-first content sharing page at `/staff/content-hub`. Shows products with images, always-visible Download and Copy Caption buttons. WhatsApp/Sales caption is the DEFAULT. Preview drawer with all caption types and copy buttons.

### Admin Configuration (Complete)
- **Business Settings** — Company identity, contact, banking, tax settings with logo and stamp upload
- **Settings Hub** — Redesigned from top tabs to sidebar-based layout with 15 sections. Left sidebar navigation, focused content panel (max-w-3xl), consistent typography.

### Data Integrity
- Strict payer/customer name separation
- Vendor privacy (no customer identity, no margins visible)
- Real admin name resolution in approval flows

## Key Technical Concepts
- **Canonical Pricing Policy**: Margin tiers and distribution splits merged
- **Campaign-Driven Content**: All content linked to promotion/product/service
- **Template-Based Graphics**: Frontend canvas rendering with html2canvas
- **Settings Hub**: Single source of truth for all system configuration

## Key API Endpoints
- `GET /api/content-engine/template-data/products` — Enriched product data for templates
- `GET /api/content-engine/template-data/services` — Service data for templates
- `GET /api/content-engine/template-data/branding` — Branding data for templates
- `GET/PUT /api/admin/settings-hub` — Settings Hub
- `GET/PUT /api/admin/business-settings` — Business config
- `POST /api/files/upload` — File upload
- `POST /api/admin/payments/{id}/approve` — Payment approval

## Upcoming Tasks (P1)
- Settings Cleanup & Lockdown — Audit all settings, remove unused ones, enforce canonical usage
- Weekly Digest Browser View — Shareable operational web report

## Future/Backlog (P2)
- Twilio WhatsApp Integration (blocked on API keys)
- Resend Email Integration (blocked on API key)
- AI-assisted Auto Quote Suggestions
- Advanced Analytics Dashboard
- Mobile-first optimization
- Backend-side creative rendering for scheduled/bulk generation

## 3rd Party Integrations
- Stripe (Payments) — Test key from environment
- Object Storage (Images) — Emergent integrations
- html2canvas — Client-side image rendering

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`
