# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a full-featured B2B e-commerce platform for Tanzania. Features include multi-role portals (Admin, Customer, Vendor/Partner, Sales), product/service catalog, order management, payment proofs, invoicing, CRM, affiliate/referral system, and pricing engine.

## Architecture
- **Frontend:** React + Tailwind CSS + Shadcn/UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Integrations:** Stripe (Sandbox Payments), Object Storage (Emergent), Resend (pending), Twilio WhatsApp (pending)

## Core Roles
- **Admin:** Full system access. Pricing, orders, CRM, settings, approvals, promotions.
- **Customer:** Browse catalog, orders, invoices, payment uploads, apply promo codes.
- **Vendor/Partner:** Product management, vendor orders, delivery status.
- **Sales:** CRM leads, assigned orders, delivery overrides.

## Key Technical Concepts
- **Single Source of Truth (Settings Hub):** All rules (margins, affiliates, follow-ups) come from Settings Hub via `settings_resolver.py`.
- **Unified Pricing Policy Tiers:** One canonical table per tier defining margins AND distribution splits. Source of truth for margins, promotions, affiliate, referral, sales, and wallet rules.
- **Strict Payer/Customer Separation:** `customer_name` from account, `payer_name` from payment proof.
- **Vendor Privacy:** Vendors see only their base_cost, work details, and Konekt Sales Contact.
- **Promotion Allocation Rule:** Promotions consume ONLY from the promotion share of the distributable pool. Never touches vendor base cost or protected platform margin.

## What's Been Implemented

### Core Platform (Complete)
- Multi-role auth (JWT), role-based routing
- Product/Service catalog, Marketplace
- Order lifecycle, Invoice generation, Payment proofs
- CRM with Kanban board
- Affiliate & referral system
- Vendor order management & delivery tracking
- Stripe sandbox payments
- Settings Hub (centralized)
- Object storage for vendor images

### Unified Pricing Policy Engine (2026-04-11)
- Canonical `pricing_policy_tiers` table in Settings Hub
- 5 Tanzania-default tiers (35% → 15% margin scaling)
- Distribution split per tier: affiliate, promotion, sales, referral, reserve
- Referral overrides affiliate rule
- Hard validation (no silent scaling)
- Wallet protection (capped at distributable pool)
- Settings Hub UI with editable tiers + live preview calculator

### Promotions CRUD Admin UI (2026-04-11)
- Backend: Full CRUD (create/list/update/deactivate/activate/delete)
- Backend validation: dates, usage limits, stacking rules, allocation caps
- Scope support: global, category, product
- Stacking rules: no_stack, stack_with_cap, reduce_when_affiliate, referral_priority
- Customer-facing /api/promotions/apply returns ONLY safe output (no internal margins)
- Discount automatically capped at tier's promotion allocation at order time
- Admin UI at /admin/promotions-manager with table, stats, filters, search, create/edit drawer
- Sidebar: Under Growth & Affiliates

### safeDisplay Global Utility (2026-04-11)
- Applied to: Orders, Payments, Invoices, Quotes, CRM, Customer Invoices, Vendor Import

## Backlog (Prioritized)

### P0 (Critical)
- Instant Quote Estimation UI (expose safe pricing to customers)
- Margin Simulator (inside Pricing Policy tab — admin decision support)

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
- Iterations 257-262: All 100% pass
