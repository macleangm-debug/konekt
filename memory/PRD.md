# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) for Tanzania. Role-based views for Customer, Admin, Vendor/Partner, and Sales. Canonical routing, automated order assignment at payment approval, invoice/order data enrichment. Live payment gateway integration.

## Architecture
- **Frontend**: React with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI (Python 3.11) with Motor (async MongoDB)
- **Database**: MongoDB (Konekt DB)
- **Payments**: Stripe (sandbox), KwikPay (pending keys)

## Active Approval Path
`POST /api/admin/payments/{proof_id}/approve` → `admin_facade_routes.py` → JWT-resolved admin name → `LiveCommerceService.approve_payment_proof()` in `live_commerce_service.py`

## Key Technical Concepts
- **Strict Payer/Customer Separation:** `customer_name` comes ONLY from customer/account/business records. `payer_name` comes ONLY from payment proof/submission. Never fallback to each other.
- **Vendor Privacy:** Vendors see ONLY `vendor_order_no`, tax-inclusive `base_price`, work details, and Konekt Sales Contact. No customer identity, no Konekt margins.
- **Margin Engine Override Priority:** 1. Individual product rule → 2. Product Group rule → 3. Global rule.
- **Delivery Workflow Split:** Vendor controls up to `ready_for_pickup`. Sales controls from `picked_up` → `in_transit` → `delivered` → `completed`.

## What's Implemented

### Core Platform (Completed)
- React + FastAPI + MongoDB full-stack
- Role-based auth (Customer, Admin, Vendor, Sales)
- Product catalog, checkout, invoicing
- Stripe sandbox payments

### Data Integrity Layer (Completed)
- Strict payer/customer separation in orders, invoices, payment queue
- Real admin name in approved_by via JWT resolution
- Vendor order auto-generation at payment approval
- Sales assignment auto-resolution

### Margin + Delivery + Notifications Pack (Completed - March 2026)
1. **Payment Queue Data Enrichment** — Customer (registered name) and Payer (proof submitter) shown separately
2. **Clickable Notifications** — Payment Approved → /account/orders, Payment Rejected → /account/invoices
3. **Compact Admin Orders Table** — 7 columns only (Date, Order #, Customer, Payer, Total, Payment, Fulfillment). Source/Sales/Vendor/Approved By in drawer.
4. **Product Delivery Logistics Workflow** — Vendor: assigned → work_scheduled → in_progress → ready_for_pickup. Sales: picked_up → in_transit → delivered → completed
5. **Sales Delivery Override** — Sales team takes over logistics after vendor marks Ready for Pickup
6. **Hybrid Margin Engine** — Percentage, fixed_amount, tiered pricing. Priority: individual product > product group > global default

## Key API Endpoints
- `POST /api/admin/payments/{id}/approve` — Handled by LiveCommerceService
- `GET /api/admin/orders-ops` — Canonical admin orders
- `GET /api/vendor/orders` — Strictly filtered vendor orders
- `POST /api/vendor/orders/{id}/status` — Vendor status updates (up to ready_for_pickup)
- `POST /api/sales/delivery/{id}/update-status` — Sales logistics updates
- `GET /api/sales/delivery/{id}/logistics-status` — Get available next statuses
- `GET /api/admin/margin-rules` — List margin rules
- `POST /api/admin/margin-rules` — Create margin rule
- `POST /api/admin/margin-rules/calculate` — Calculate price with margin priority
- `PUT /api/admin/margin-rules/{id}` — Update margin rule
- `DELETE /api/admin/margin-rules/{id}` — Delete margin rule

## Database Collections
- `orders` — Core transaction with approved_by, assigned_vendor_id
- `vendor_orders` — Created synchronously with payment approval
- `users` — admin, customer, vendor, sales roles
- `payment_proofs` — Source of truth for payer_name
- `margin_rules` — Margin engine rules (scope: product/group/global)
- `notifications` — With target_url for clickable navigation

## Upcoming Tasks (P1)
- Admin data entry configuration: system logo, TIN, BRN, bank account details
- End-to-end Stripe test with real test cards

## Backlog (P2)
- Twilio WhatsApp integration (blocked on API keys)
- Resend email integration (blocked on API key)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization
- KwikPay live payment gateway (blocked on API keys)

## Testing Status
- Iteration 142: All 6 features 100% pass (20/20 backend tests, all frontend verified)
- Previous: Iterations 135-141 all passed (14 E2E business journey tests)
