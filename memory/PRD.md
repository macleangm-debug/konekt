# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) for the Tanzanian market. Features: multi-role auth (Customer, Admin, Vendor/Partner, Sales/Staff), product catalog with taxonomy, invoicing, payment processing (Stripe + Bank Transfer), order fulfillment pipeline, affiliate/referral system, promotional engine, sales enablement tools, and content engine.

## Core Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB (via Motor async driver)
- **Auth**: JWT-based with strict role separation (Admin != Staff), full_name in JWT
- **Payments**: Stripe sandbox + Bank Transfer with admin approval queue

## Implemented Features (Completed)

### Foundation (Phase 1-44)
- Multi-role auth, product catalog, invoicing, Stripe, order pipeline, vendor assignment, affiliate system
- Staff Auth Separation, Admin Navigation Unification, canonical routing

### Phase 45: Promotions Engine
- CRUD promotions with margin validation, PDP/Cart/Checkout integration

### Phase A: Bank Transfer E2E + Marketplace Cards
- Guest order safe handling, unified ProductCardCompact

### Phase C: Sales Dashboard
- V2 with KPIs, Pipeline, Actions, CRM, Commission Table. JWT full_name fix.

### Phase D: Content Engine
- Dynamic promo content generation, Admin Content Center, Sales Content Block

### Phase E: Sales Discount Request Workflow (April 8, 2026)
- Sales requests discounts -> Admin approves/rejects -> stamps on quote/order
- Margin floor protection via canonical margin_engine
- Iteration 205: 100% pass (19/19)

### Phase C.5: Quick Reorder (April 8, 2026)
- Reorder button on My Orders, validates products, re-runs pricing/promo engine
- CartDrawerContext with localStorage persistence
- Iteration 206: 100% pass (11/11)

### Auth Security Pack (April 8, 2026)
- Forgot/Reset Password: one-time tokens (30-min expiry), neutral responses
- Rate limiting: login, register, forgot-password, reset-password
- Honeypot anti-bot on register
- Resend email service in dry-run mode
- Audit logging in auth_audit_log collection
- Iteration 207: 100% pass (18/18)

### Phase F: Canonical Drawer UI (April 8, 2026)
- **StandardDrawerShell**: One canonical drawer component used across all portals
  - Consistent header (title + subtitle + badge + close button)
  - Scrollable body with flex layout
  - Sticky footer for action buttons
  - Backdrop with blur, ESC key close, body scroll lock
- **Migrated drawers**: AdminDiscountRequests, CustomerOrders, CustomerInvoices, SalesOrderDrawerV2, AssignmentDecisionDrawer, DetailDrawer (wrapper)
- **Remaining inline drawers** (lower priority): AdminContentCenter, OrdersPageOps, CustomersPageMerged, VendorListPage, QuotesPageV2
- Iteration 208: 100% pass (all drawers + regression)

## Current Status
- Backend: Healthy, all APIs operational
- Frontend: All views functional with canonical drawer UI
- Testing: Iterations 205-208 — 100% pass rate consistently

## Prioritized Backlog

### P0 - Upcoming
- Phase F: Document Branding Unification (invoices, quotes, delivery notes, statements)
  - One canonical settings source for logo, business identity, contact, banking, footer
  - All documents pull from this source

### P1 - Next
- Deep UI audit for production readiness
- Migrate remaining inline drawers to StandardDrawerShell

### P2 - Future
- Phase G: Discount Analytics Dashboard
- Twilio WhatsApp/SMS (blocked on API key)
- Resend email — switch from dry-run to live (blocked on API key)
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization

## Key Technical Rules
1. **Payer/Customer Separation**: customer_name from account. payer_name from payment proof.
2. **Vendor Privacy**: Only vendor_order_no, base_price, work details, Konekt Sales Contact.
3. **Staff != Admin**: Completely isolated portals.
4. **Canonical Pricing**: Promotions Engine is backend source of truth.
5. **Quick Reorder**: Same cart API, pricing resolver, promotion logic. No old prices.
6. **Discount Requests**: Sales cannot apply directly. Request -> Admin approve -> stamp.
7. **Auth Security**: Never reveal email existence. Token one-time with expiry. Rate limit all.
8. **Drawer Standard**: ALL drawers must use StandardDrawerShell. No inline drawer implementations.
