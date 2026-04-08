# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) for the Tanzanian market. Features: multi-role auth (Customer, Admin, Vendor/Partner, Sales/Staff), product catalog with taxonomy, invoicing, payment processing (Stripe + Bank Transfer), order fulfillment pipeline, affiliate/referral system, and promotional engine.

## Core Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB (via Motor async driver)
- **Auth**: JWT-based with strict role separation (Admin ≠ Staff)
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

### Phase A: Bank Transfer E2E + Marketplace Cards (Current Session - April 8, 2026)
- **Bank Transfer E2E Fix**: Rewrote `approve_payment_proof()` in `live_commerce_service.py` to handle guest orders where `invoice=None`. Added `_handle_guest_approval()` method for clean separation. Fixed `reject_payment_proof()` for guest orders.
- **Marketplace Card Redesign**: Unified `ProductCardCompact` component used by BOTH public and in-account marketplaces. Fixed-height price/promo block (h-[52px]) and action block (h-[72px]) ensure uniform card heights regardless of promo status.
- **Admin Dashboard Fix**: Pending payment count now includes "uploaded", "submitted", and "pending" statuses.
- **Finance Queue Enrichment**: Guest proofs now show order data (items, totals, order_number) in admin queue.

## Current Status
- Backend: Healthy, all APIs operational
- Frontend: All marketplace views unified
- Testing: Iteration 202 — 100% pass rate (Backend 10/10, Frontend all verified)

## Prioritized Backlog

### P1 - Upcoming
- Phase C: Sales Dashboard Overhaul (KPI row, Today's Sales Actions, Pipeline Guidance, Commission per Order table, TZS-first)
- Phase D: Content Engine (Dynamic role-based content generation pulling from promotions/pricing source of truth)
- Phase E: Sales Discount Request Workflow (Sales requests → Admin approves/rejects → unlocks in quote)

### P2 - Future
- Phase F: Canonical Drawer UI (standardize all drawers)
- Phase F: Document Branding Unification (invoices, quotes pulling canonical logo/settings)
- Deep UI audit for production readiness
- Twilio WhatsApp/SMS notifications (blocked on API key)
- Resend email integration (blocked on API key)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization

## Key Technical Rules
1. **Strict Payer/Customer Separation**: `customer_name` from account/business. `payer_name` from payment proof. Never fallback.
2. **Vendor Privacy**: Vendors see only their vendor_order_no, base_price, work details, and Konekt Sales Contact.
3. **Staff ≠ Admin**: Sales/Staff use StaffLayout + StaffAuthContext. Completely isolated from admin portal.
4. **Canonical Pricing**: Promotions Engine is backend-only source of truth. Frontend reads enriched data.
5. **Guest Orders**: No invoice pre-approval. Order exists directly. `_handle_guest_approval()` updates existing order on payment approval.
