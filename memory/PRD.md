# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email) | Pillow (Image Processing)

## System Status: REFINEMENT PASS COMPLETE — 323 ITERATIONS, 100% PASS RATE

---

## REFINEMENT PASS — ALL COMPLETE

### 1. Quote Creation Simplification (322)
- SystemItemSelector replaces free-text LineItemsEditor
- Items MUST come from system catalog (no free-text)
- pricing_status tracking: `priced` / `waiting_for_pricing`
- Quote statuses: draft → waiting_for_pricing → ready_to_send → sent → approved → converted
- Send button blocked when pricing incomplete

### 2. Source-of-Truth Enforcement (322)
- All internal flows use system catalog items (product_id required)
- Only public List & Quote catalog retains "Custom Item" fallback (per category config)
- Pricing engine governs all sell prices

### 3. Vendor Ops Simplification (323)
- 4 tabs: Pricing Requests, Orders/Fulfillment, Vendors, Products
- Orders tab: real-time order list with status, payment confirmation, fulfillment lock
- Status update dropdown disabled when fulfillment_locked=true (awaiting payment)
- Uses existing /api/admin/orders-ops endpoint

### 4. Affiliate Admin + Performance/Payout (323)
- Admin form aligned with public application: first_name, last_name, email, phone, location, primary_platform, social links, audience_size, promotion_strategy, product_interests, expected_monthly_sales, why_join
- 3 tabs: Affiliates, Performance, Withdrawals
- Performance: total sales, commission earned, pending, paid, conversions, last activity
- Withdrawals: requested → approved → paid/rejected flow

### 5. Group Deal Wizard (323)
- 5-step wizard: Product Selection → Pricing → Target & Duration → Promotion Settings → Review & Publish
- Step indicator bar with progress visualization
- Product must come from system catalog (ProductSelector)
- Live ProfitCalculator at pricing and review steps
- Validation at each step before proceeding

### 6. Bulk Import (323)
- POST /api/admin/catalog-workspace/bulk-import accepts CSV
- Columns: name, category, subcategory, unit_of_measurement, sku, description, active
- Validates required fields, detects duplicates by name+category
- Returns imported/skipped/errors counts
- UI: Upload CSV button + import results display in Catalog Workspace

---

## PREVIOUS SYSTEMS (all complete)
- Category Config UI (display_mode, commercial_mode, sourcing_mode, 5 toggles per category)
- Commercial Flow (Quote → Invoice + Order, payment-gated fulfillment)
- List & Quote Catalog (/catalog/quote)
- Admin Sidebar (CRM-first business flow)
- Sales Assignment Policy (Customer Ownership / Weighted Availability)
- Mr. Konekt AI Assistant (context + role aware)
- CRM Enhancement (performance summary, assignment source)
- Supply Review, Commission Engine, Finance, Content Studio
- Group Deals Discovery, Competitive Quoting, Product Upload Wizard
- All core: auth, affiliate, ratings, delivery, email

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!`
- Vendor Ops: `vops.test@konekt.co.tz` / `VendorOps123!`

## Remaining / Next
- (P0) Upload first real product listing end-to-end
- (P0) Execute first live Group Deal
- (P0) Activate internal sales + external affiliates batch
- (P2) Light micro-interactions (hover lift, skeleton loaders)
- (Phase 2) Full Vendor Ops automation (SLA timers, vendor scoring)
- (Phase 2) Split orders logic for complex quoting
