# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) for the Tanzanian market. Features: multi-role auth (Customer, Admin, Vendor/Partner, Sales/Staff), product catalog with taxonomy, invoicing, payment processing (Stripe + Bank Transfer), order fulfillment pipeline, affiliate/referral system, and promotional engine.

## Core Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB (via Motor async driver)
- **Auth**: JWT-based with strict role separation (Admin ≠ Staff), full_name included in JWT
- **Payments**: Stripe sandbox + Bank Transfer with admin approval queue

## Implemented Features (Completed)

### Phase 1-40: Foundation
- Multi-role authentication (Customer, Admin, Vendor, Sales)
- Product catalog with group/category/subcategory taxonomy
- Invoice generation and management
- Stripe sandbox payment integration
- Order pipeline (quote → invoice → payment → fulfillment)
- Vendor order assignment and tracking
- Affiliate/referral commission system

### Phase 41-44: Architecture Fixes
- Staff Auth Separation (StaffAuthProvider, StaffRoute, StaffLayout)
- Admin Navigation Unification (adminNavigation.js)
- Canonical routing per role
- Strict payer_name vs customer_name separation

### Phase 45: Platform Promotions Engine
- Backend CRUD for promotions with margin safety validation
- Admin UI for promotion management
- PDP, Cart, Guest/Account Checkout integration
- Affiliate Attribution Persistence E2E

### Phase A: Bank Transfer E2E + Marketplace Cards (April 8, 2026)
- **Bank Transfer E2E Fix**: Rewrote `approve_payment_proof()` in `live_commerce_service.py` to handle guest orders where `invoice=None`. Added `_handle_guest_approval()` method. Fixed `reject_payment_proof()` for guest orders.
- **Marketplace Card Redesign**: Unified `ProductCardCompact` component used by BOTH public and in-account marketplaces. Fixed-height price/promo block (h-[52px]) and action block (h-[72px]) ensure uniform card heights.
- **Admin Dashboard Fix**: Pending payment count includes all proof statuses.
- **Finance Queue Enrichment**: Guest proofs show order data in admin queue.

### Phase C: Sales Dashboard Overhaul (April 8, 2026)
- **Backend API**: `GET /api/staff/sales-dashboard` aggregates KPIs, pipeline, today's actions, recent orders with commission, and assigned CRM.
- **KPI Row**: Today's Revenue, This Month, Open Pipeline, Commission Earned (TZS-first).
- **Sales Pipeline Funnel**: 6 stages — New → Contacted → Quoted → Approved → Paid → Fulfilled.
- **Today's Actions**: Urgency-sorted actionable items (hot/high/medium) with click-to-call.
- **My Customers (CRM)**: Assigned customer list with status badges.
- **Commission per Order Table**: Per-order commission breakdown with TZS amounts and status.
- **JWT Enhancement**: `create_token` now includes `full_name` for personalized greeting.

## Current Status
- Backend: Healthy, all APIs operational
- Frontend: All marketplace views unified, sales dashboard operational
- Testing: Iteration 203 — 100% pass rate (Backend 14/14, Frontend all verified)

## Prioritized Backlog

### P1 - Upcoming
- Phase C.5: Quick Reorder (Add "Reorder" button on My Orders, push items to cart with re-evaluated pricing)
- Phase D: Content Engine (Dynamic role-based content generation pulling from promotions/pricing source of truth)
- Phase E: Sales Discount Request Workflow (Sales requests → Admin approves/rejects → unlocks in quote)

### P2 - Future
- Phase F: Canonical Drawer UI (standardize all drawers)
- Phase F: Document Branding Unification (invoices, quotes pulling canonical logo/settings)
- Deep UI audit for production readiness
- Twilio WhatsApp/SMS notifications (blocked on API key)
- Resend email integration (blocked on API key)
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization

## Key Technical Rules
1. **Strict Payer/Customer Separation**: `customer_name` from account/business. `payer_name` from payment proof. Never fallback.
2. **Vendor Privacy**: Vendors see only their vendor_order_no, base_price, work details, and Konekt Sales Contact.
3. **Staff ≠ Admin**: Sales/Staff use StaffLayout + StaffAuthContext. Completely isolated from admin portal.
4. **Canonical Pricing**: Promotions Engine is backend-only source of truth. Frontend reads enriched data.
5. **Guest Orders**: No invoice pre-approval. `_handle_guest_approval()` updates existing order on payment approval.
6. **Quick Reorder**: Must use same cart API, pricing resolver, and promotion logic. No shortcuts.
