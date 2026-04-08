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
  - Customer → `konekt_token` → `/account/*` (AuthProvider + CustomerRoute)
  - Partner → `partner_token` → `/partner/*` (PartnerLayout with role-based nav)

## Key Business Rules
1. **Pricing Engine Lock**: Vendor Price + Operational Margin + Distributable Margin = Final Price
2. **Distribution Split**: Distributable pool: Affiliate (40%), Sales (30%), Discount (30%)
3. **Promotion Safety**: Promotions draw ONLY from distributable pool. Operational margin NEVER touched. Unsafe promotions are BLOCKED (not warned).
4. **Stacking Control**: Platform promo + affiliate discount don't freely stack. Admin chooses: no_stack, cap_total, or reduce_affiliate.
5. **Unified Pricing Resolution**: ALL flows (guest checkout, account checkout, affiliate-linked, sales quotes, admin quotes) use the same promotion resolver. No separate per-page math.

## Admin Navigation (Canonical — adminNavigation.js, single source of truth)
Dashboard | Commerce (Orders, Quotes, Payments, Invoices) | Catalog (Catalog, Vendors, Supply Review) | Customers (Customers, CRM) | Partners (Partner Ecosystem) | Growth & Affiliates (Affiliates, Payouts, Margin, **Promotions**) | Operations (Deliveries, Requests) | Reports | Settings (Settings Hub, Users)

## Implemented Features

### Phases 40-43: Foundation (Complete)
Brand system, mobile UX, track order, admin nav, margin engine, distribution splits, sales/affiliate dashboards

### Phase 44A-B: Partner Enablement (Complete)
Wallet system, payout accounts, withdrawals, affiliate/sales promotion centers, customer referrals

### Structural Fixes (Complete — Apr 2026)
- PartnerLayout role separation (affiliate/vendor/distributor nav isolation)
- Admin sidebar unified from `adminNavigation.js` (collapsible sections, single Settings)
- Staff Auth Separation (StaffAuthProvider + StaffRoute + StaffLayout, konekt_staff_token)

### Phase 45: Platform Promotions Engine (Complete — Apr 2026)
**Backend:**
- Full CRUD: `/api/promotion-engine/promotions`
- Model: type (percentage/fixed), scope (global/category/product), schedule, stacking policy
- Margin Safety Validator: blocks unsafe promotions on activation + preview
- Stacking Controller: no_stack, cap_total, reduce_affiliate
- Preview: `/api/promotion-engine/preview-with-defaults` — full pricing breakdown with system config
- Active resolver: `/api/promotion-engine/active` — for checkout integration

**Checkout Integration (Complete — Apr 2026):**
- Product enrichment service: `enrich_product_with_promotion()` called from ALL listing APIs
- Marketplace search, product detail, public listing — all return `promotion` field
- Guest checkout: resolves promo pricing per item, stores `promo_applied`, `promo_id`, `original_price`, `promo_discount_per_unit` on order items
- Quote creation: auto-enriches items with active promotions
- Cart: stores promo data when adding from enriched product pages
- Checkout summary: shows "Promotion Savings" line

**Frontend:**
- Marketplace cards: promo badges (e.g. "5.0% OFF"), strikethrough original price
- PDP: promo badge, promo price, strikethrough original, "You save X per unit"
- Checkout summary: promotion savings line
- Account product grid: promo badges + strikethrough
- Admin Promotions page: form with live safety preview, vendor price simulator, status management

## Key API Endpoints
- `POST /api/promotion-engine/promotions` — Create (validates safety on activation)
- `GET /api/promotion-engine/promotions` — List
- `PUT /api/promotion-engine/promotions/{id}` — Update
- `DELETE /api/promotion-engine/promotions/{id}` — Delete
- `POST /api/promotion-engine/preview-with-defaults` — System-aware pricing preview
- `GET /api/promotion-engine/active` — Active promos for checkout
- `GET /api/marketplace/products/search` — Products with promotion enrichment
- `GET /api/marketplace/products/{id}` — Detail with promotion
- `GET /api/public-marketplace/listing/{slug}` — Listing with promotion
- `POST /api/public/checkout` — Guest checkout with promo resolution

## Database Collections
- `platform_promotions`: Promotion campaigns
- `orders`, `vendor_orders`, `users`, `products`, `margin_rules`, `distribution_settings`
- `commissions`, `affiliate_commissions`, `affiliate_payout_requests`, `payout_accounts`
- `admin_settings`

## Upcoming Tasks (P1)
- Affiliate attribution persistence E2E test
- Bank transfer E2E test
- Sales discount request workflow (sales requests → admin approves/rejects)
- Canonical drawer UI (standardize all drawers across quote/invoice/CRM/vendor/discount)
- Document branding unification (invoice, quote, delivery note — all from single canonical source)

## Future Tasks (P2)
- Deep screen-by-screen UI audit for launch readiness
- Twilio WhatsApp/SMS (blocked on API key)
- Sales leaderboard / gamification
- One-click reorder / Saved Carts
