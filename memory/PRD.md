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
- Iteration 206: 100% pass (11/11)

### Auth Security Pack (April 8, 2026)
- Forgot/Reset Password, rate limiting, honeypot anti-bot, Resend dry-run, audit logging
- Iteration 207: 100% pass (18/18)

### Phase F: Canonical Drawer UI (April 8, 2026)
- StandardDrawerShell: One canonical drawer component across all portals
- Migrated 6+ major drawers initially (AdminDiscountRequests, CustomerOrders, etc.)
- Iteration 208: 100% pass

### Phase F: Document Branding Unification (April 8, 2026)
- All 4 doc types (Invoice, Quote, Delivery Note, Statement) read from `business_settings.invoice_branding`
- Delivery Note PDF: New HTML-based template matching canonical design
- Statement PDF: Migrated from ReportLab to HTML-based canonical design
- Company Logo upload, unified footer, single branding source via `_get_branding(db)`
- Iteration 209: 100% pass (12/12)

### Phase F: Drawer Migrations + Document Preview Panel (April 8, 2026)
- **4 remaining drawer migrations**: OrdersPageOps, CustomersPageMerged, VendorListPage, AdminContentCenterPage — all now use StandardDrawerShell
- **Document Preview Panel**: Live Invoice + Quote preview inside Settings Hub > Document Branding tab
  - Shows company logo, header, items table, subtotal/VAT/total, signatory name, signature, stamp, footer
  - All branding fields update the preview in real-time
  - Tab switching between Invoice and Quote previews
- Iteration 210: 100% pass (all drawers + preview panel verified)

## Current Status
- Backend: Healthy, all APIs operational
- Frontend: All views fully migrated to canonical drawer UI, document preview live
- Testing: Iterations 205-210 — 100% pass rate consistently

## Prioritized Backlog

### P1 - Next
- Deep UI audit for production readiness

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
5. **Discount Requests**: Sales cannot apply directly. Request -> Admin approve -> stamp.
6. **Auth Security**: Never reveal email existence. Token one-time with expiry. Rate limit all.
7. **Drawer Standard**: ALL drawers must use StandardDrawerShell. No inline drawer implementations.
8. **Document Branding**: Single source: `business_settings.invoice_branding`. All 4 doc types use `_get_branding()`.
9. **Document Preview**: Live preview in Settings Hub, no separate routes. Invoice + Quote previews with live branding.
