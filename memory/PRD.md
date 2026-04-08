# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) for the Tanzanian market. Features: multi-role auth (Customer, Admin, Vendor/Partner, Sales/Staff), product catalog with taxonomy, invoicing, payment processing (Stripe + Bank Transfer), order fulfillment pipeline, affiliate/referral system, promotional engine, sales enablement tools, and content engine.

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

### Phase A: Bank Transfer E2E + Marketplace Cards
- Bank Transfer E2E Fix (guest order safe handling)
- Marketplace Card Redesign (unified ProductCardCompact, fixed-height blocks)
- Admin Dashboard Fix & Finance Queue Enrichment

### Phase C: Sales Dashboard Overhaul
- Sales Dashboard V2 with KPIs, Pipeline, Actions, CRM, Commission Table
- JWT Enhancement (full_name for staff)

### Phase D: Content Engine
- Dynamic promotional content generation from canonical pricing/promos
- Admin Content Center Page
- Sales Dashboard Content Block
- Affiliate Content Feed

### Phase E: Sales Discount Request Workflow (April 8, 2026)
- Backend: `discount_request_service.py` with create, list, approve, reject, margin floor validation
- Routes: `discount_request_routes.py` (staff + admin endpoints)
- Margin Floor Protection via canonical `margin_engine.py`
- Admin Queue: table + drawer with margin impact, KPIs, filters, approve/reject
- Staff Interface: list + modal for creating/tracking requests
- Approval stamps `approved_discount` on source quote/order
- Testing: Iteration 205 — 100% pass (19/19 backend, all frontend)

### Phase C.5: Quick Reorder (April 8, 2026)
- Backend: `POST /api/customer/orders/{order_id}/reorder` in existing customer_orders_routes.py
- Validates product existence, re-runs `resolve_checkout_item_price` for current pricing/promotions
- Returns cart-ready items with promo_applied, promo_label, warnings for unavailable products
- Frontend: "Reorder" button on every order row in My Orders table
- Rebuilt AccountCartPage from hardcoded stub to read from CartDrawerContext
- CartDrawerContext upgraded with localStorage persistence
- UX: notification banners for success/warnings, auto-redirect to /account/cart
- Testing: Iteration 206 — 100% pass (11/11 backend, all frontend)

## Current Status
- Backend: Healthy, all APIs operational
- Frontend: All views functional
- Testing: Iterations 205-206 — 100% pass rate

## Prioritized Backlog

### P0 - Upcoming (Auth Security Pack)
- Forgot Password / Reset Password (email-based, one-time token, 15-30min expiry)
- Signup anti-bot protection (honeypot, rate limiting, email verification)
- Resend email service wired in dry-run mode

### P1 - Next
- Phase F: Canonical Drawer UI standardization
- Phase F: Document Branding Unification (invoices, quotes, delivery notes, statements)

### P2 - Future
- Phase G: Discount Analytics Dashboard
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
5. **Quick Reorder Rules**: Must use same cart API, pricing resolver, and promotion logic. No shortcuts. No old prices.
6. **Discount Requests**: Sales cannot apply discounts directly. Must request → admin approves → stamp on quote. Margin floor always enforced.
7. **Guest Orders**: No invoice pre-approval. `_handle_guest_approval()` updates existing order on payment approval.
