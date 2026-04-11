# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a full-featured B2B e-commerce platform for Tanzania. Features include multi-role portals (Admin, Customer, Vendor/Partner, Sales), product/service catalog, order management, payment proofs, invoicing, CRM, affiliate/referral system, and pricing engine.

## Architecture
- **Frontend:** React + Tailwind CSS + Shadcn/UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Integrations:** Stripe (Sandbox Payments), Object Storage (Emergent), Resend (pending), Twilio WhatsApp (pending)

## Core Roles
- **Admin:** Full system access. Pricing, orders, CRM, settings, approvals.
- **Customer:** Browse catalog, orders, invoices, payment uploads.
- **Vendor/Partner:** Product management, vendor orders, delivery status.
- **Sales:** CRM leads, assigned orders, delivery overrides.

## Key Technical Concepts
- **Single Source of Truth (Settings Hub):** All rules (margins, affiliates, follow-ups) come from Settings Hub via `settings_resolver.py`.
- **Unified Pricing Policy Tiers:** One canonical table per tier defining margins AND distribution splits.
- **Strict Payer/Customer Separation:** `customer_name` from account, `payer_name` from payment proof. Never fallback.
- **Vendor Privacy:** Vendors see only their base_cost, work details, and Konekt Sales Contact.

## What's Been Implemented

### Core Platform (Complete)
- Multi-role auth (JWT), role-based routing, login/logout
- Product/Service catalog, Marketplace
- Order lifecycle (create → pay → fulfill)
- Invoice generation & management
- Payment proof upload, review, approval/rejection
- CRM with lead management, Kanban board
- Affiliate & referral system
- Vendor order management & delivery tracking
- Stripe sandbox payments
- Settings Hub (centralized configuration)
- Object storage for vendor images

### Unified Pricing Policy Engine (Implemented 2026-04-11)
- **One canonical table** in Settings Hub: `pricing_policy_tiers`
- Each tier: min_amount, max_amount, total_margin_pct, protected_platform_margin_pct, distributable_margin_pct
- Distribution split per tier: affiliate_pct, promotion_pct, sales_pct, referral_pct, reserve_pct (all % of distributable pool)
- **Referral overrides affiliate** rule enforced
- **Hard validation** — rejects if split > 100% or allocation > distributable pool
- **Wallet protection** — capped at distributable pool, never consumes base_cost or protected margin
- Tanzania market defaults (5 tiers: Small, Lower-Medium, Medium, Large, Enterprise)
- Settings Hub UI: editable tier table, live preview calculator, policy rules display
- API: GET/PUT /api/commission-engine/pricing-policy-tiers, POST /api/commission-engine/preview, POST /api/commission-engine/calculate-order, POST /api/commission-engine/validate-wallet

### safeDisplay Global Utility (Implemented 2026-04-11)
- Created `/app/frontend/src/utils/safeDisplay.js` — context-aware empty cell handler
- Applied to: OrdersPage, PaymentsQueuePage, InvoicesPage, QuotesPage, CRMPageV2, Customer InvoicesPageV2, VendorBulkImportPage
- Functions: `safeDisplay(value, type)`, `safeMoney(value)`, `cellClass(value)`

## Backlog (Prioritized)

### P0 (Critical)
- Promotions CRUD Admin UI (MUST build ONLY after backend pricing policy is locked — NOW READY)
- Instant Quote Estimation UI (expose safe pricing to customers)

### P1 (Important)
- Content Creator Media Visibility & Dynamic Campaign System
- Admin Business Config (Logo, TIN/BRN, bank details, stamp)
- Weekly Digest Browser View
- End-to-end Stripe test with real test cards
- Continue applying safeDisplay to remaining 250+ admin pages

### P2 (Backlog)
- Twilio WhatsApp (blocked on API key)
- Resend email (blocked on API key)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics Dashboard
- Mobile-first optimization

## Test Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Partner: `demo.partner@konekt.com` / `Partner123!`

## Test Reports
- Iterations 257-261: All 100% pass
