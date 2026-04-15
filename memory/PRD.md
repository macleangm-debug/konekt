# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email) | Pillow (Image Processing)

## System Status: P0 COMPLETE — PRICING + DOCUMENTS + ACTIVATION FIXED

## P0 Fixes — ALL COMPLETE (313 iterations tested)

### 1. Pricing Engine (Single Source of Truth)
- **Shared utility**: `/app/backend/services/pricing_engine.py`
- **Rule**: `sell_price = pricing_engine(vendor_cost, category, settings)` — never raw vendor price
- **Margin rules**: Category-specific → default (30% target, 15% min) → settings hub fallback
- **Override validation**: Below-minimum overrides auto-adjusted with warning
- **Product creation**: Returns `margin_pct`, `margin_amount`, `pricing_rule_source` fields
- **Applies to**: Products, services, quotes, price request vendor selection

### 2. Campaign Percentage Removed
- **`discount_pct` removed** from campaign creation
- **Replaced with `savings_amount`** = `original_price - discounted_price` (flat TZS)
- Group deal cards show savings as absolute amount, not percentage

### 3. Delivery Note Fix
- **Bank details hidden** (only on invoices/quotes)
- **"Delivered By" + "Received By"** signature areas (replaces generic "Authorized By")
- Company stamp preserved
- Logistics-only document

### 4. Affiliate Activation Bug Fix
- **Resend activation** now works for `status=approved` OR `activation_status=sent/expired`
- Removed strict `status != approved` dependency
- Multiple resends allowed for approved users
- Blocks non-approved applications

## Payment Flow — FIXED (312 iterations)
- Orders only after payment review approval, not at checkout

## Category Display Mode — COMPLETE (312 iterations)
- Rich objects: display_mode, commercial_mode, sourcing_mode per category

## Competitive Quoting — COMPLETE (311 iterations)
## Content Studio — COMPLETE (310 iterations)
## Group Deals Discovery — COMPLETE (309 iterations)
## Product Upload Wizard — COMPLETE (308 iterations)

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!`

## Backlog
- (P1) Catalog + Vendor workspace redesign (KPI strips, rich tables, drawers)
- (P1) Affiliate system UI upgrade (dashboard, drawer, payouts, leaderboard)
- (P1) Finance pages (cash flow, commissions)
- (P1) Supply Review fix (pending approvals, pricing issues)
- (P1) List & Quote catalog frontend (search-first UX)
- (P2) First real product listing + first group deal
- (P2) Micro-interactions
