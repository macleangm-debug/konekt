# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a comprehensive B2B e-commerce platform for business procurement in Tanzania. The platform connects customers with vendors/partners through a managed marketplace, with features including product catalog management, order processing, payment verification, fulfillment tracking, and a dynamic margin engine.

## Core Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python) + MongoDB
- **Payments**: Stripe sandbox integration
- **Auth**: JWT-based with strict role separation:
  - Admin → `konekt_admin_token` → `/admin/*` (AdminAuthProvider + AdminRoute + AdminLayout)
  - Staff/Sales → `konekt_staff_token` → `/staff/*` (StaffAuthProvider + StaffRoute + StaffLayout)
  - Customer → `konekt_token` → `/account/*` (AuthProvider + CustomerRoute + CustomerPortalLayoutV2)
  - Partner → `partner_token` → `/partner/*` (PartnerLayout with role-based nav)

## Key Business Rules
1. **Pricing Engine Lock**: Vendor Price + Operational Margin + Distributable Margin = Final Price
2. **Distribution Split**: Distributable pool split: Affiliate (40%), Sales (30%), Discount (30%)
3. **Tiered Price Bands**: Margin rates vary by vendor price range
4. **Override Hierarchy**: Product > Group > Tier > Global
5. **Promotion Safety**: Promotions draw from distributable pool ONLY. Operational margin NEVER touched.
6. **Stacking Control**: Platform promotion + affiliate discount don't freely stack by default. Admin chooses policy: no_stack, cap_total, reduce_affiliate.

## Admin Navigation (Canonical — adminNavigation.js)
- Dashboard
- Commerce (Orders, Quotes, Payments, Invoices)
- Catalog (Catalog, Vendors, Supply Review)
- Customers (Customers, CRM)
- Partners (Partner Ecosystem)
- Growth & Affiliates (Affiliates, Affiliate Payouts, Margin & Distribution, **Promotions**)
- Operations (Deliveries, Requests)
- Reports
- Settings (Settings Hub, Users)

## Implemented Features

### Phase 40-43: Foundation (Complete)
- Brand system, mobile UX, track order, admin navigation, margin engine, distribution splits, sales/affiliate dashboards

### Phase 44A: Affiliate Payout Foundation (Complete)
- Wallet system, payout account management, withdrawal requests, payout history, admin payout settings

### Phase 44B: Promotion Center (Complete)
- Affiliate Promotion Center, Sales Promotion Center, Customer Referrals

### Structural Fixes (Complete — Apr 2026)
- PartnerLayout role separation (affiliate vs vendor vs distributor)
- AdminLayout sidebar cleanup → unified from adminNavigation.js (single source of truth)
- Staff Auth Separation → dedicated StaffAuthProvider + StaffRoute + StaffLayout

### Phase 45: Platform Promotions Engine (Complete — Apr 2026)
- **Backend**: Full CRUD at `/api/promotion-engine/promotions`
- **Promotion Model**: type (percentage/fixed), scope (global/category/product), schedule, stacking policy
- **Margin Safety Validator**: Blocks promotions that exceed distributable pool. Runs on activation and preview. Not just warned — BLOCKED.
- **Stacking Controller**: no_stack (promo replaces affiliate discount share), cap_total (caps combined deduction), reduce_affiliate (proportional reduction)
- **Pricing Preview**: Admin sees standard price, promo price, discount, remaining margin, remaining distributable, sales/affiliate effect
- **Active Promotions API**: `GET /api/promotion-engine/active` for checkout integration
- **Admin UI**: Full form with live safety preview panel, vendor price simulator (50k-500k), status management (draft→active→paused→ended)

## Key API Endpoints
- `POST /api/promotion-engine/promotions` — Create promotion (validates safety on activation)
- `GET /api/promotion-engine/promotions` — List all promotions
- `PUT /api/promotion-engine/promotions/{id}` — Update (validates safety on activation)
- `DELETE /api/promotion-engine/promotions/{id}` — Delete
- `POST /api/promotion-engine/preview` — Full pricing breakdown with safety check
- `POST /api/promotion-engine/preview-with-defaults` — Preview using system margin/split
- `GET /api/promotion-engine/active` — Active promotions for checkout resolution
- `POST /api/admin/payments/{id}/approve` — Payment approval
- `GET /api/admin/orders-ops` — Admin orders
- `GET /api/vendor/orders` — Vendor orders
- `GET /api/affiliate/wallet` — Affiliate wallet
- `GET /api/account/referrals` — Customer referrals

## Database Collections
- `platform_promotions`: Promotion campaigns (type, scope, stacking, schedule, status)
- `orders`, `vendor_orders`, `users`, `products`, `margin_rules`, `distribution_settings`
- `commissions`, `affiliate_commissions`, `affiliate_payout_requests`, `payout_accounts`
- `admin_settings`

## Upcoming Tasks (P1)
- Checkout integration: Apply active promotions at checkout (guest, in-account, affiliate, sales/admin quotes)
- Affiliate attribution persistence E2E test
- Bank transfer E2E test

## Future Tasks (P2)
- Deep screen-by-screen UI audit for launch readiness
- Twilio WhatsApp/SMS (blocked on API key)
- Sales leaderboard / gamification
- One-click reorder / Saved Carts
