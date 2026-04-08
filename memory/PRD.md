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
- **Backend Service**: `discount_request_service.py` with create, list, approve, reject, margin floor validation
- **Backend Routes**: `discount_request_routes.py` with staff and admin endpoints
- **Margin Floor Protection**: Uses canonical `margin_engine.py` to validate discounts don't breach vendor base price or Konekt operational margin. Discount budget limited to distributable margin × discount pool percentage.
- **Admin Queue**: GET /api/admin/discount-requests with KPIs (total, pending, approved, rejected), status filters, detail drawer with margin impact analysis
- **Staff Interface**: GET/POST /api/staff/discount-requests for creating and tracking requests
- **Approval Stamp**: Approved discounts stamp `approved_discount` object on the source quote/order document
- **Frontend**: Admin Discount Requests Page (table + drawer + approve/reject), Staff Discount Requests Page (table + modal), navigation items in both admin and staff sidebars
- **Testing**: Iteration 205 — 100% pass rate (19/19 backend, all frontend verified)

## Current Status
- Backend: Healthy, all APIs operational
- Frontend: All views functional
- Testing: Iteration 205 — 100% pass rate

## Prioritized Backlog

### P1 - Upcoming
- Phase C.5: Quick Reorder (Add "Reorder" button on My Orders, push items to cart with re-evaluated pricing)

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
7. **Discount Requests**: Sales cannot apply discounts directly. Must request → admin approves → stamp on quote. Margin floor always enforced.
