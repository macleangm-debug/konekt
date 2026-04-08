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
8. **Payout Rules**: Minimum payout enforced backend-first. Only approved commissions become withdrawable. Admin approval required for all payouts.

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
- Dynamic Margin Engine with Product > Group > Global override hierarchy
- Distribution split CRUD (affiliate/sales/discount percentages)

### Phase 43: Sales Commission Dashboard + Affiliate Dashboard
- Sales Commission Dashboard (`/staff/commission-dashboard`): KPI cards, per-order table, monthly breakdown
- Affiliate Dashboard (`/partner/affiliate-dashboard`): KPI cards, product promotions table, earnings
- Tiered price bands seeded (4 bands), Distribution split locked at 40/30/30
- Simplified navigation for sales and affiliate

### Phase 44A: Affiliate Payout Foundation (Current — DONE)
- **Wallet System** (`/api/affiliate/wallet`): Pending, Available, Paid Out, Pending Withdrawal — all from real commission data
- **Payout Account Management** (`/api/affiliate/payout-accounts`): Mobile Money + Bank Transfer CRUD
- **Withdrawal Request** (`/api/affiliate/me/payout-request`): Minimum payout enforcement from admin settings, available balance validation
- **Payout History** (`/api/affiliate/payout-history`): Full audit trail with status badges
- **Admin Payout Settings** (Settings Hub → Payout tab): Affiliate/Sales min payout, payout cycle, review mode
- **Single-page design** (`/partner/affiliate-payouts`): Wallet Summary + Withdraw + Payout Accounts + History

## Active API Endpoints
- `POST /api/admin/payments/{id}/approve` — Payment approval
- `GET /api/admin/orders-ops` — Canonical admin orders
- `GET /api/vendor/orders` — Vendor-filtered orders
- `GET /api/staff/commissions/summary|orders|monthly` — Sales commission dashboard
- `GET /api/affiliate/product-promotions` — Products with resolved affiliate earnings
- `GET /api/affiliate/earnings-summary` — Affiliate earnings with status
- `GET /api/affiliate/wallet` — Wallet balances (pending/available/paid_out)
- `GET/POST/DELETE /api/affiliate/payout-accounts` — Payout accounts CRUD
- `POST /api/affiliate/me/payout-request` — Withdrawal request
- `GET /api/affiliate/payout-history` — Payout history
- `GET/PUT /api/admin/settings-hub` — Canonical settings (incl. payout settings)
- `GET/PUT /api/admin/distribution-margin/settings` — Distribution split CRUD

## Database Collections
- `orders`: Core transactions with pricing breakdown
- `vendor_orders`: Partner fulfillment orders
- `users`: All roles (admin, customer, partner, sales)
- `products`: Product catalog with vendor pricing
- `margin_rules`: Pricing rules (scope: global, tier, group, product)
- `distribution_settings`: Global split percentages
- `commissions`: Sales commission records
- `affiliate_commissions`: Affiliate commission records
- `affiliate_payout_requests`: Withdrawal requests with status
- `payout_accounts`: Saved payout methods (mobile_money, bank_transfer)
- `admin_settings`: Settings Hub state (key: settings_hub)

## Upcoming Tasks (P1)
- Phase 44B: Promotion Center (captions, short links, ready-to-post layouts)
- Affiliate attribution persistence E2E test
- End-to-end Stripe bank transfer E2E test
- Deep screen-by-screen UI audit for launch readiness

## Future Tasks (P2)
- Phase 45: Platform Promotions engine (admin campaign tool, safe margin protection, stacking rules)
- Affiliate Manager role/dashboard
- Sales leaderboard (gamification)
- Twilio WhatsApp/SMS notifications (blocked on API key)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Affiliate payout wallet + withdrawal flow (complete system)
