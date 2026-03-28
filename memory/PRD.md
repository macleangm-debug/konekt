# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform for Konekt with strict role-based views (Customer, Admin, Vendor, Sales), canonical routing, automated order assignment at payment approval, and proper UI/UX data presentation.

## Architecture
- **Frontend**: React (Vite) + Tailwind + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor)
- **Roles**: Customer (`/account/*`), Admin (`/admin/*`), Vendor/Partner (`/partner/*`), Sales (`/staff/*`)
- **Auth**: JWT-based login at `/login`

## Canonical Routing Rules
- `/dashboard/*` → Redirects to `/account/*`
- `/partner/fulfillment` → Redirects to `/partner/orders`
- Admin orders API: `/api/admin/orders-ops` (list + detail + status + release)
- Admin invoices API: `/api/admin/invoices` (enriched handler in `admin_routes.py`)
- Vendor orders API: `/api/vendor/orders`
- Customer invoices: `/api/customer/invoices`
- Customer orders: `/api/customer/orders`

## Key DB Schema
- `orders`: Core transaction. Has both `_id` (ObjectId) and `id` (UUID)
- `vendor_orders`: Created upon payment approval, linked to `order_id`
- `invoices`: Has `order_id` linking back to orders. Stores `payer_name` from proof submission
- `notifications`: Unified collection for all roles
- `payment_proofs`: Stores `payer_name` from customer proof submissions
- `payment_proof_submissions`: Alternate proof storage
- `sales_assignments`: Maps sales users to orders
- `quotes`: Internal auto-approved quotes for product traceability

## Completed Work

### Session 6 — Route & API Cleanup
- Vendor Orders Cleanup Pass
- 6-Item UI Cleanup Pass
- Route/API Cleanup Audit
- P0 Route Deletion & Assignment

### Session 7 — Final Canonical Flow Fix Pack (2026-03-28)
1. payer_name on admin/customer invoice tables
2. Payment status labels (human-readable)
3. "Approved Payment" state
4. Customer order sales contact card
5. Vendor order creation at approval
6. Internal auto-approved product quote
7. Stale route cleanup
8. Notification routing fix

### Session 7b — Exact Patch Manifest v2 (2026-03-28)
1. **customer_invoice_routes.py** — `_enrich_invoice` made async; payer_name resolves from proof → submission → billing → customer (correct priority)
2. **admin_routes.py** — list_invoices enrichment: customer_name fallback to email/billing when user lookup fails
3. **order_ops_routes.py** — List endpoint: full enrichment with customer_email/phone, sales_name/email/phone, vendor_email/phone, payer_name, approved_at/by + reverse invoice lookup
4. **order_ops_routes.py** — Detail endpoint: reverse invoice lookup, payment_proof payer from proofs collection, flat enriched fields
5. **order_ops_routes.py** — `serialize_doc` fixed: preserves existing UUID `id` over ObjectId conversion
6. **order_ops_routes.py** — Added `release-to-vendor` endpoint to canonical orders-ops
7. **adminApi.js** — `getOrderDetail` unified to `/api/admin/orders-ops/{id}` (was `/api/admin/orders/{id}`)
8. **Verified**: PartnerFulfillmentPage deleted, no stale fulfillment aliases, no /dashboard links in /account pages

## Required Response Fields (from manifest)

### Admin Invoices
customer_name, payer_name, payment_status_label, invoice_status, linked_ref

### Admin Orders (list + detail)
customer_name, customer_email, customer_phone, sales_name, sales_email, sales_phone, vendor_name, vendor_email, vendor_phone, payer_name, approved_at, approved_by

### Vendor Orders
vendor_order_no, sales_name, sales_phone, sales_email, base_price, status, priority

### Customer Invoices
payer_name, payment_status_label

## Prioritized Backlog

### P1 — Upcoming
- Connect live payment gateway (KwikPay/Stripe)
- Final Launch Verification Checklist execution

### P2 — Future
- Configure Twilio WhatsApp credentials (blocked on API keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization
