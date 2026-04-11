# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a full-featured B2B e-commerce platform for Tanzania. Features include multi-role portals (Admin, Customer, Vendor/Partner, Sales), product/service catalog, order management, payment proofs, invoicing, CRM, affiliate/referral system, and pricing engine.

## Architecture
- **Frontend:** React + Tailwind CSS + Shadcn/UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Integrations:** Stripe (Sandbox Payments), Object Storage (Emergent), Resend (pending), Twilio WhatsApp (pending)

## Core Roles
- **Admin:** Full system access. Pricing, orders, CRM, settings, approvals, promotions, margin simulation.
- **Customer:** Browse catalog, orders, invoices, payment uploads, apply promo codes, see instant price estimates.
- **Vendor/Partner:** Product management, vendor orders, delivery status.
- **Sales:** CRM leads, assigned orders, delivery overrides.

## Key Technical Concepts
- **Single Source of Truth (Settings Hub):** All rules come from Settings Hub via `settings_resolver.py`.
- **Unified Pricing Policy Tiers:** One canonical table per tier defining margins AND distribution splits.
- **Promotion Allocation Rule:** Promotions consume ONLY from the promotion share of distributable pool.
- **Strict Payer/Customer Separation:** Never fallback between payer_name and customer_name.
- **Vendor Privacy:** Vendors see only their base_cost, work details, and Konekt Sales Contact.

## What's Been Implemented

### Core Platform (Complete)
- Multi-role auth (JWT), role-based routing
- Product/Service catalog, Marketplace
- Order lifecycle, Invoice generation, Payment proofs
- CRM with Kanban board, Affiliate & referral system
- Vendor order management & delivery tracking
- Stripe sandbox payments, Settings Hub, Object storage

### Unified Pricing Policy Engine (2026-04-11)
- Canonical `pricing_policy_tiers` table: 5 Tanzania-default tiers
- Distribution split per tier (affiliate, promotion, sales, referral, reserve)
- Referral overrides affiliate, hard validation, wallet protection

### Promotions CRUD Admin UI (2026-04-11)
- Full CRUD: create/list/update/deactivate/activate/delete
- Backend validation: dates, usage limits, stacking rules, allocation caps
- 3 scopes: global, category, product
- 4 stacking rules: no_stack, stack_with_cap, reduce_when_affiliate, referral_priority
- Customer-facing /api/promotions/apply returns safe output only
- Admin UI at /admin/promotions-manager

### Instant Quote Estimation UI (2026-04-11)
- Public API: POST /api/quote-estimate, POST /api/quote-estimate/range
- Customer-safe: shows estimated price/range, promo-aware, tier-aware
- NEVER exposes margins, distributable pool, or allocation math
- InstantQuoteEstimator component integrated into product & service detail pages
- Pre-fills quote requests with estimated values

### Margin Simulator (2026-04-11)
- Inside Settings Hub → Pricing Policy tab
- Multi-item simulation with affiliate/referral/sales toggles + wallet
- Full breakdown: margins, distributable pool, all allocations, platform net
- Live recalculation (400ms debounce) as admin types
- Wallet validation shows cap at distributable pool

### safeDisplay Global Utility (2026-04-11)
- Applied to Orders, Payments, Invoices, Quotes, CRM, Customer Invoices, Vendor Import

## Backlog (Prioritized)

### P1 (Important)
- Content Creator Media Visibility & Dynamic Campaign System
- Admin Business Config (Logo, TIN/BRN, bank details, stamp)
- Weekly Digest Browser View
- Continue applying safeDisplay to remaining admin pages

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
- Iterations 257-263: All 100% pass
