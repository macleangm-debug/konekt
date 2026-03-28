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
- Admin orders API: `/api/admin/orders-ops`
- Admin invoices API: `/api/admin/invoices` (enriched handler in `admin_routes.py`)
- Vendor orders API: `/api/vendor/orders`
- Customer invoices: `/api/customer/invoices`
- Customer orders: `/api/customer/orders`

## Key DB Schema
- `orders`: Core transaction
- `vendor_orders`: Created upon payment approval, linked to `order_id`
- `notifications`: Unified collection for all roles, mapped by `user_id`
- `payment_proofs`: Stores `payer_name`, bubbles up to invoices
- `sales_assignments`: Maps sales users to orders
- `quotes`: Internal auto-approved quotes for product traceability

## What's Been Implemented

### Session 1-5 (Previous)
- Full platform build with role-based login/routing
- Admin, Customer, Vendor, Sales dashboards
- Invoice CRUD, Payment proof submission/approval
- CRM, Quotes, Deliveries, Settings

### Session 6 — Route & API Cleanup (Completed)
- Vendor Orders Cleanup Pass (MyOrdersPage, Drawer, API)
- 6-Item UI Cleanup Pass (Admin tables enriched, sign-out moved to header)
- Unresolved Fixes Pass (Customer-safe timeline labels, real notifications mapped)
- Route/API Cleanup Audit (`/dashboard/*` redirected to `/account/*`, fulfillment disabled)
- P0 Route Deletion & Assignment (Unified admin orders onto `/api/admin/orders-ops`)

### Session 7 — Final Canonical Flow Fix Pack (Completed ✅ — 2026-03-28)
1. **payer_name on admin invoices** — Fixed in `admin_routes.py` list_invoices. Enriches from: invoice → payment_proof → billing → customer name.
2. **payer_name on customer invoices** — Fixed in `customer_invoice_routes.py`. Detail endpoint also checks payment_proofs.
3. **Payment status labels** — Human-readable labels: "Paid in Full", "Payment Under Review", "Approved Payment", "Awaiting Payment", "Payment Rejected". Fixed in `admin_routes.py`, `payment_status_wording_service.py`, `PaymentStatusBadge.jsx`, `InvoicesPageV2.jsx`.
4. **"Approved Payment" state** — Backend sets `payment_status: "approved"` at proof approval (not "paid"). Maps to "Approved Payment" label.
5. **Customer order sales contact** — `CustomerAssignedSalesCard.jsx` shows real Konekt sales contact (name, phone, email) on customer order detail.
6. **Vendor order creation at approval** — `admin_flow_fixes_routes.py` creates vendor_orders + notifications for each vendor at proof approval.
7. **Internal auto-approved product quote** — Created at proof approval for product-type orders.
8. **Stale route cleanup** — Fixed all `/dashboard/*` links to `/account/*`. NotificationBell redirect fixed.
9. **Notification routing** — All target_urls use canonical paths: `/account/orders/{id}`, `/partner/orders`, `/staff/orders`.

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
