# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a comprehensive B2B e-commerce platform for business procurement in Tanzania. The platform connects customers with vendors/partners through a managed marketplace, with features including product catalog management, order processing, payment verification, fulfillment tracking, and a dynamic margin engine.

## Core Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python) + MongoDB
- **Payments**: Stripe sandbox integration
- **Auth**: JWT-based (Admin, Customer, Partner, Staff portals)

## Key Business Rules
1. **Pricing Engine Lock**: Vendor Price + Konekt Margin = Base Price. Base Price + Distribution Layer = Final Price.
2. **Distribution Split**: Distributable margin is split: Affiliate (40%), Sales (30%), Discount (30%) — of the distributable pool.
3. **Tiered Price Bands**: Margin rates vary by vendor price range (0-50k=30%, 50k-200k=25%, 200k-1M=20%, 1M+=15%).
4. **Override Hierarchy**: Product > Group > Tier > Global
5. **Data Encapsulation**: Customers never see margin breakdown. Vendors never see customer identity or Konekt margins.
6. **Commission Independence**: Commission status (expected, pending_payout, paid) is separate from order status.
7. **TZS-First**: All sales-facing amounts display TZS amount first, percentage as secondary context.

## Implemented Features

### Phase 40: UI Polish & Brand
- Global SVG Brand Logo (Connected Triad)
- Premium Navbar, PDP, Auth page micro-interactions
- Standard PhoneNumberField across all forms

### Phase 41: Mobile UX + Track Order
- Global Mobile BottomSheetSelect (replaces native dropdowns on mobile)
- Track Order guest-friendly redesign with OrderCodeCard
- Order Confirmation enhancement

### Phase 42: Admin Navigation + Dynamic Margin Engine
- Admin Navigation Audit — removed duplicate domain pages
- Dynamic Margin Engine:
  - Fixed Konekt Margin + Flexible Distributable Pool
  - Product > Group > Global override hierarchy
  - Distribution split CRUD (affiliate/sales/discount percentages)

### Phase 43: Sales Commission Dashboard + Affiliate Dashboard (Current)
- **Sales Commission Dashboard** (`/staff/commission-dashboard`):
  - 4 KPI cards: Total Earned, Expected, Pending Payout, Paid Out (TZS-first)
  - Per-order commission table with independent commission/order status
  - Monthly earnings breakdown (earned, pending, paid, deal count)
  - "How Commission Works" section with 3 rules
- **Affiliate Dashboard** (`/partner/affiliate-dashboard`):
  - 4 KPI cards: Total Earned, Pending Payout, Paid Out, Referrals
  - Promo Code + Referral Link with Copy buttons
  - Products & Promotions table (Sell Price, You Earn, Customer Saves)
  - Recent Earnings table with status badges
- **Margin Strategy Source of Truth**:
  - 4 tiered price bands seeded (0-50k, 50k-200k, 200k-1M, 1M+)
  - Distribution split: affiliate=40%, sales=30%, discount=30% of distributable pool
  - Validation: total split must be <= 100% of pool
- **Navigation Simplification**:
  - Sales sidebar: Dashboard, Orders, Customers, Earnings
  - Affiliate sidebar: Dashboard, Products & Promotions, Earnings, Payouts, Profile

## Active API Endpoints
- `POST /api/admin/payments/{id}/approve` — Payment approval (LiveCommerceService)
- `GET /api/admin/orders-ops` — Canonical admin orders
- `GET /api/vendor/orders` — Vendor-filtered orders
- `GET /api/staff/commissions/summary` — Sales commission KPIs
- `GET /api/staff/commissions/orders` — Per-order commission breakdown
- `GET /api/staff/commissions/monthly` — Monthly commission aggregation
- `GET /api/affiliate/product-promotions` — Products with resolved affiliate earnings
- `GET /api/affiliate/earnings-summary` — Affiliate earnings with status
- `GET /api/affiliate/me` — Affiliate profile (graceful for non-affiliates)
- `GET/PUT /api/admin/distribution-margin/settings` — Distribution split CRUD
- `POST /api/admin/distribution-margin/preview` — Pricing preview calculator
- `POST /api/admin/margin-rules/resolve-distribution` — Full pricing resolution

## Database Collections
- `orders`: Core transactions with pricing breakdown
- `vendor_orders`: Partner fulfillment orders
- `users`: All roles (admin, customer, partner, sales)
- `products`: Product catalog with vendor pricing
- `margin_rules`: Pricing rules (scope: global, tier, group, product)
- `distribution_settings`: Global split percentages
- `commissions`: Sales commission records
- `affiliate_commissions`: Affiliate commission records
- `payment_proofs`: Payment verification data

## Upcoming Tasks (P1)
- Affiliate attribution persistence E2E test
- End-to-end Stripe bank transfer E2E test
- Deep screen-by-screen UI audit for launch readiness

## Future Tasks (P2)
- Twilio WhatsApp/SMS notifications (blocked on API key)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization
- Affiliate payout system (wallet + withdrawal flow)
- Sales leaderboard (gamification layer)
