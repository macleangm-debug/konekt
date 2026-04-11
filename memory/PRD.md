# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) with unified login, role-based portals (Admin, Customer, Vendor, Sales), payment processing, product/service catalog, order management, and a growth/conversion engine.

## Core Architecture
- **Frontend**: React (CRA) + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Payments**: Stripe (sandbox mode)
- **Storage**: Object storage via Emergent integrations
- **Auth**: JWT-based with role routing

## User Personas
- **Admin**: Full platform management, settings, pricing, content
- **Customer**: Browse, order, track, pay
- **Vendor/Partner**: Fulfill orders, update delivery status
- **Sales/Staff**: Dispatch, logistics, content sharing

## What's Been Implemented

### Core Platform (Complete)
- Unified `/login` with role-based routing
- Admin portal with dashboard, orders, payments, catalog management
- Customer portal with orders, invoices, account management
- Vendor/Partner portal with filtered order views
- Sales/Staff portal with dispatch and CRM tools

### Commerce Engine (Complete)
- Product & Service catalog with categories
- Cart, Checkout, Order creation flow
- Stripe sandbox payment gateway
- Bank transfer with payment proof upload
- Payment queue with admin approval workflow
- Vendor order auto-generation on payment approval

### Growth & Conversion Layer (Complete)
- **Unified Pricing Policy Engine** — Merged margin tiers + distribution splits
- **safeDisplay.js** — System-wide empty cell fallback for all tables
- **Promotions CRUD** — Admin UI with backend tier-cap validation
- **Instant Quote Estimation** — Customer-facing price range on product/service pages
- **Live Margin Simulator** — Admin tool in Settings Hub Pricing Policy tab
- **Content Creator Campaign System** — Campaign-driven content generation with multi-format assets (square/vertical), multiple caption types (short/social/whatsapp/story), smart suggestions, media-first sharing workspace

### Admin Configuration (Complete)
- **Business Settings** — Company identity (TIN, BRN, VRN), contact details, banking details, document/tax settings
- **Logo Upload** — File upload with preview for company branding
- **Company Stamp/Seal Upload** — File upload for invoices/compliance documents

### Data Integrity
- Strict payer/customer name separation
- Vendor privacy (no customer identity, no margins visible)
- Real admin name resolution in approval flows
- MongoDB _id exclusion from all API responses

## Key Technical Concepts
- **Canonical Pricing Policy**: Margin tiers and distribution splits merged. Promotions/affiliates/referrals only consume from distributable_margin pool
- **Instant Quote**: Shows price range without exposing internal margins
- **Campaign-Driven Content**: All content linked to promotion/product/service. Multiple formats and caption variants per campaign
- **safeDisplay**: Every table cell uses context-aware fallback (text, company, phone, etc.)

## Key API Endpoints
- `POST /api/admin/payments/{id}/approve` — Payment approval (LiveCommerceService)
- `GET /api/admin/orders-ops` — Admin orders
- `GET /api/vendor/orders` — Vendor filtered orders
- `GET/POST /api/admin/content-center/campaigns` — Content campaigns
- `GET /api/content-engine/suggestions` — Smart suggestions
- `GET/PUT /api/admin/business-settings` — Business config
- `POST /api/files/upload` — File upload

## DB Collections
- `orders`, `vendor_orders`, `users`, `payment_proofs`
- `products`, `services`, `promotions`
- `content_center` — Campaign content assets
- `business_settings` — Company configuration
- `uploaded_files` — File storage references

## Upcoming Tasks (P1)
- Weekly Digest Browser View — Turn weekly digest into shareable operational web report

## Future/Backlog (P2)
- Twilio WhatsApp Integration (blocked on API keys)
- Resend Email Integration (blocked on API key)
- AI-assisted Auto Quote Suggestions
- Advanced Analytics Dashboard
- Mobile-first optimization
- Sales-facing Content Feed page

## 3rd Party Integrations
- Stripe (Payments) — Test key from environment
- Object Storage (Images) — Emergent integrations
- Resend (Emails) — Requires user API key
- Twilio (WhatsApp) — Requires user API key

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `demo.customer@konekt.com` / `Demo123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
