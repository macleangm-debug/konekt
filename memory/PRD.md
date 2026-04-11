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
- **Content Creator Campaign System** — Media-first sharing workspace at `/admin/content-center` with "Create Branded Post" button linking to Studio
- **Dynamic Branded Graphics Generator (Content Studio)** — Template engine at `/admin/content-studio` with 4 themes (Light/Dark/Promo/Minimal), 2 formats (Square/Vertical). Uses html2canvas. Auto-generates captions.
- **Save & Publish to Content Center** — Renders branded creative, uploads to storage, creates content_center entry. Supports Save Draft (status=draft) and Publish (status=active).
- **Sales Content Hub** — Mobile-first page at `/staff/content-hub` with always-visible Download/Copy Caption buttons. WhatsApp caption as DEFAULT.

### Admin Configuration (Complete)
- **Business Settings** — Company identity, contact, banking, tax with logo + stamp upload
- **Settings Hub** — Sidebar-based layout (240px sidebar, 960px content). 15 sections. Consistent typography.
- **Settings Centralization** — Removed duplicate "Margin & Distribution" from Growth section. Settings Hub is single source of truth.

### Team Performance (Complete)
- **Team Overview** at `/admin/team/overview` — KPI cards + sales team table
- **Leaderboard** at `/admin/team/leaderboard` — Ranked sales staff by revenue
- **Alerts** at `/admin/team/alerts` — Real overdue follow-up alerts from CRM data (31 active alerts)

### Data Integrity
- Strict payer/customer name separation
- Vendor privacy
- Real admin name resolution
- MongoDB _id exclusion

## Key API Endpoints
- `POST /api/admin/content-center/publish` — Save & Publish branded creative
- `GET /api/content-engine/template-data/products` — Template-ready product data
- `GET /api/content-engine/template-data/branding` — Branding data
- `GET /api/supervisor-team/staff-list` — Staff list for team pages
- `GET/PUT /api/admin/settings-hub` — Settings Hub
- `GET/PUT /api/admin/business-settings` — Business config

## Upcoming Tasks (P1)
- Global Drawer Standardization — Migrate remaining 6 drawers to StandardDrawerShell
- Weekly Digest Browser View — Shareable operational web report

## Backlog (P2)
- Convert card-based pages to tables (desktop rule)
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
