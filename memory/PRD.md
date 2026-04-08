# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) for the Tanzanian market. Multi-role auth, product catalog, invoicing, payments (Stripe + Bank Transfer), order fulfillment, affiliate system, promotions, sales enablement, content engine, and procurement workflow.

## Core Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB (Motor async)
- **Auth**: JWT with strict role separation (Admin/Staff/Vendor/Customer)
- **Payments**: Stripe sandbox + Bank Transfer with admin approval queue

## Implemented Features

### Foundation (Phases 1-44)
- Multi-role auth, product catalog, invoicing, Stripe, order pipeline, vendor assignment, affiliate system

### Phase 45: Promotions Engine
- CRUD promotions with margin validation, PDP/Cart/Checkout integration

### Phase A: Bank Transfer E2E + Marketplace Cards

### Phase C/C.5: Sales Dashboard + Quick Reorder

### Phase D: Content Engine

### Phase E: Sales Discount Request Workflow (Apr 8)
- Iteration 205: 100% pass (19/19)

### Auth Security Pack (Apr 8)
- Iteration 207: 100% pass (18/18)

### Phase F: Document Branding Unification (Apr 8)
- **All 5 document types** (Invoice, Quote, Delivery Note, Statement, Purchase Order) use canonical branding from `business_settings.invoice_branding`
- **Connected Triad logo** in all document headers (programmatic SVG, not JPEG/text)
- **Company stamp redesigned**: Proper official circular seal with Connected Triad center, arc text, navy monochrome, KONEKT wordmark, registration/TIN details
- **Brand colors on documents**: Navy primary accent, gold contact bar, neutral body
- **Document Preview Panel**: Live Invoice + Quote preview inside Settings Hub
- **Drawer migrations**: All drawers use StandardDrawerShell (OrdersPageOps, CustomersPageMerged, VendorListPage, AdminContentCenterPage)
- Iterations 209-211: 100% pass

### Block 2: Purchase Order System (Apr 8)
- **PO document template**: Same canonical design as Invoice/Quote, uses vendor pricing (not customer price)
- **Multi-vendor support**: Items grouped by vendor_id, one PO per vendor (existing logic in live_commerce_service.py)
- **No separate PO dashboard**: PO is a document output within existing order workflow
- **Admin**: Order drawer shows Vendor Purchase Orders section with download buttons
- **Vendor**: Order drawer shows Download Purchase Order (PDF) button
- **Routes**: GET /api/pdf/purchase-orders/{id} and /preview
- Iteration 212: 100% pass (9/9 backend + full frontend)

### Block 3: Status Propagation & Sales Override (Apr 8)
- **Role-based status mapping**:
  - Admin: full internal status chain
  - Vendor: assigned fulfillment statuses
  - Sales: full operational + intervention ability
  - Customer: simplified safe labels (processing, in fulfillment, dispatched, delivered, delayed)
- **Audit trail**: Every status change records previous_status, new_status, updated_by, role, note, timestamp, source
- **Sales override**: PUT /api/sales/orders/{id}/status-override with mandatory note + source label
- **Source labels**: vendor_update, sales_follow_up, admin_adjustment, vendor_confirmed, system_auto
- **Status propagation service**: `services/status_propagation_service.py`
- Iteration 212: 100% pass

## Current Status
- Backend: Healthy, all APIs operational
- Frontend: All views canonical, document branding unified
- Testing: Iterations 205-212 — 100% pass rate

## Prioritized Backlog

### P1 - Next
- Deep UI audit for production readiness
- Status propagation audit across all role views

### P2 - Future
- Phase G: Discount Analytics Dashboard
- Twilio WhatsApp/SMS (blocked on API key)
- Resend email live mode (blocked on API key)
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization

## Key Technical Rules
1. Payer/Customer Separation: customer_name from account, payer_name from payment proof
2. Vendor Privacy: Only vendor_order_no, base_price, work details, Konekt Sales Contact
3. Staff != Admin: Isolated portals
4. Canonical Pricing: Promotions Engine is backend source of truth
5. Discount Requests: Sales request → Admin approve → stamp on document
6. Auth Security: Never reveal email existence. One-time tokens, rate limiting
7. Drawer Standard: ALL drawers must use StandardDrawerShell
8. Document Branding: Single source: `business_settings.invoice_branding`. All 5 doc types use `_get_branding()`
9. Connected Triad: All documents use programmatic SVG logo, not text-only or JPEG
10. Status Mapping: Internal status → role-appropriate display via `map_status_for_role()`
11. Audit Trail: Every status change must have updated_by, role, note, timestamp, source
12. PO Rule: No separate PO dashboard. PO is a document within order workflow
13. Sales Override: Mandatory note + source label for every status intervention
