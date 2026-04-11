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
- **Dynamic Branded Graphics Generator (Content Studio)** — Template engine at `/admin/content-studio` with 4 layouts (Product Focus, Promo Focus, Service Focus, Minimal Brand), 4 themes (Light/Dark/Promo/Minimal), 2 formats (Square/Vertical). Uses html2canvas for WYSIWYG export. Auto-generates captions. ALL branding (logo, phone, email, brand name) pulled dynamically from Settings Hub.
- **Save & Publish to Content Center** — Renders branded creative, uploads to storage, creates content_center entry. Supports Save Draft and Publish.
- **Sales Content Hub** — Mobile-first page at `/staff/content-hub` with always-visible Download/Copy Caption buttons.

### Admin Configuration (Complete)
- **Business Settings** — Company identity, contact, banking, tax with logo + stamp upload
- **Settings Hub** — Sidebar-based layout (240px sidebar, 960px content). 15 sections. Consistent typography.
- **Settings Centralization** — Settings Hub is single source of truth. No scattered settings.

### Team Performance (Complete)
- **Team Overview** at `/admin/team/overview` — KPI cards + sales team table
- **Leaderboard** at `/admin/team/leaderboard` — Ranked sales staff by revenue
- **Alerts** at `/admin/team/alerts` — Real overdue follow-up alerts from CRM data

### Canonical UI Consolidation Pass (Complete — Feb 2026)
- **Content Creator merged into Content Studio** — Single canonical concept. Old `/admin/content-center` route redirects to `/admin/content-studio`.
- **Duplicate Promotions Engine removed** — Single canonical Promotions Manager. Old `/admin/promotion-engine` route redirects to `/admin/promotions-manager`.
- **Affiliates page converted to data table** — Desktop-first table layout with StandardDrawerShell for creation.
- **Affiliate Payouts page converted to data table** — Filter tabs, row-click detail drawer with action buttons in sticky footer.
- **Standard Drawer Migration** — AdminPromotionsPage, AdminProductsServicesPage, CRMPageV2 all migrated from Sheet to StandardDrawerShell (fixed header, scrollable body, sticky footer).
- **Dynamic Branding Rule enforced** — All branding/contact data in Content Studio comes from Settings Hub. No hardcoded values. Logo resolves from uploaded image path, falls back to TriadSVG.

### Data Integrity
- Strict payer/customer name separation
- Vendor privacy
- Real admin name resolution
- MongoDB _id exclusion

## Key API Endpoints
- `POST /api/admin/content-center/publish` — Save & Publish branded creative
- `GET /api/content-engine/template-data/products` — Template-ready product data
- `GET /api/content-engine/template-data/branding` — Dynamic branding from Settings Hub
- `GET /api/supervisor-team/staff-list` — Staff list for team pages
- `GET/PUT /api/admin/settings-hub` — Settings Hub
- `GET/PUT /api/admin/business-settings` — Business config

## Upcoming Tasks (P1)
- Weekly Digest Browser View — Shareable operational web report

## Backlog (P2)
- Twilio WhatsApp Integration (blocked on API keys)
- Resend Email Integration (blocked on API key)
- Backend-side creative rendering for bulk generation
- AI-assisted Auto Quote Suggestions
- Advanced Analytics Dashboard
- Mobile-first optimization

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`
