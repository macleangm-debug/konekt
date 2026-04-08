# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) for the Tanzanian market. Features: multi-role auth (Customer, Admin, Vendor/Partner, Sales/Staff), product catalog with taxonomy, invoicing, payment processing (Stripe + Bank Transfer), order fulfillment pipeline, affiliate/referral system, promotional engine, sales enablement tools, and content engine.

## Core Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB (via Motor async driver)
- **Auth**: JWT-based with strict role separation (Admin != Staff), full_name included in JWT
- **Payments**: Stripe sandbox + Bank Transfer with admin approval queue

## Implemented Features (Completed)

### Phase 1-40: Foundation
- Multi-role authentication (Customer, Admin, Vendor, Sales)
- Product catalog with group/category/subcategory taxonomy
- Invoice generation and management
- Stripe sandbox payment integration
- Order pipeline (quote -> invoice -> payment -> fulfillment)
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

### Phase C: Sales Dashboard Overhaul
- Sales Dashboard V2 with KPIs, Pipeline, Actions, CRM, Commission Table
- JWT Enhancement (full_name for staff)

### Phase D: Content Engine
- Dynamic promotional content generation from canonical pricing/promos
- Admin Content Center Page
- Sales Dashboard Content Block

### Phase E: Sales Discount Request Workflow (April 8, 2026)
- Backend: discount_request_service.py with create, list, approve, reject, margin floor validation
- Admin Queue: table + drawer with margin impact, KPIs, filters, approve/reject
- Staff Interface: list + modal for creating/tracking requests
- Approval stamps approved_discount on source quote/order
- Testing: Iteration 205 - 100% pass (19/19 backend)

### Phase C.5: Quick Reorder (April 8, 2026)
- Backend: POST /api/customer/orders/{order_id}/reorder
- Validates product availability, re-runs pricing + promotion engine
- Frontend: "Reorder" button on every order row in My Orders
- AccountCartPage rebuilt from stub to use CartDrawerContext with localStorage persistence
- Testing: Iteration 206 - 100% pass (11/11 backend)

### Auth Security Pack (April 8, 2026)
- **Forgot Password**: POST /api/auth/forgot-password with neutral response, 30-min token expiry
- **Reset Password**: POST /api/auth/reset-password with one-time token, password validation
- **Rate Limiting**: login (10/5min), register (5/10min), forgot-password (3/5min), reset-password (5/5min)
- **Honeypot**: Hidden 'website' field on register - bots silently rejected
- **Email Service**: Resend wired in dry-run mode (logs to console until API key added)
- **Audit Logging**: auth_audit_log collection tracks password reset events
- **Frontend**: /forgot-password, /reset-password pages matching Konekt brand
- **Login page**: "Forgot password?" link added
- **Register page**: Hidden honeypot field added
- Testing: Iteration 207 - 100% pass (18/18 backend, all frontend verified)

## Current Status
- Backend: Healthy, all APIs operational
- Frontend: All views functional
- Testing: Iterations 205-207 - 100% pass rate consistently
- Email: Resend in dry-run mode (awaiting API key)

## Prioritized Backlog

### P1 - Upcoming
- Phase F: Canonical Drawer UI standardization
- Phase F: Document Branding Unification (invoices, quotes, delivery notes, statements)
- Deep UI audit for production readiness

### P2 - Future
- Phase G: Discount Analytics Dashboard
- Twilio WhatsApp/SMS notifications (blocked on API key)
- Resend email integration - switch from dry-run to live (blocked on API key)
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization

## Key Technical Rules
1. **Strict Payer/Customer Separation**: customer_name from account/business. payer_name from payment proof.
2. **Vendor Privacy**: Vendors see only their vendor_order_no, base_price, work details, and Konekt Sales Contact.
3. **Staff != Admin**: Sales/Staff use StaffLayout + StaffAuthContext. Completely isolated from admin portal.
4. **Canonical Pricing**: Promotions Engine is backend-only source of truth.
5. **Quick Reorder**: Must use same cart API, pricing resolver, and promotion logic. No old prices.
6. **Discount Requests**: Sales cannot apply discounts directly. Must request -> admin approves -> stamp on quote.
7. **Auth Security**: Never reveal email existence. Token is one-time use with expiry. Rate limit all auth endpoints.
