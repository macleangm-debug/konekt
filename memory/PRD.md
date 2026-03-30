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
- **Strict Payer/Customer Separation:** `customer_name` from business/account records only. `payer_name` from payment proof only. Never collapse.
- **Vendor Privacy:** Vendors see ONLY `vendor_order_no`, VAT-inclusive `base_price`, work details, sales contact. No customer identity, no Konekt margins.
- **Margin Engine Priority:** 1. Individual product rule → 2. Product Group rule → 3. Global rule (default 20%).
- **Delivery Workflow Split:** Vendor controls up to `ready_for_pickup`. Sales controls `picked_up → in_transit → delivered → completed`.
- **Vendor Release:** Vendor only sees work when payment release conditions are met. Products: full payment. Services: advance threshold. Admin can override.
- **Vendor Capabilities:** One vendor account model with approved capabilities (products/services/promo). Unapproved = blocked from creating listings.

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

### Margin + Delivery + Notifications Pack (Completed - March 2026)
1. Payment Queue Data Enrichment — Customer vs Payer separated
2. Clickable Notifications — Approved→/account/orders, Rejected→/account/invoices
3. Compact Admin Orders Table — 7 columns only
4. Product Delivery Logistics Workflow — Vendor→ready_for_pickup, Sales→delivered
5. Sales Delivery Override — Sales controls logistics after vendor marks Ready
6. Hybrid Margin Engine — Percentage, fixed_amount, tiered

### Vendor Release + Capabilities Pack (Completed - March 2026)
7. Vendor Capability Governance — Admin approves products/services/promo per vendor
8. Payment Release Policy Engine — full_upfront, installment, credit_terms, phased_service
9. Vendor Order Visibility Filter — Only released work shown to vendor
10. Vendor Price Visibility — VAT-inclusive base cost only, no Konekt margin/public price
11. Default 20% Product Margin Seed — Auto-seeded on startup
12. Partner Notification Bell — Moved to top-right topbar

### Sales Service Workflow + Customer Invite Pack (Completed - March 2026)
13. Sales Customer Creation + Invite — Sales creates customer, invite token generated
14. Account Activation — /activate-account?token=... → set password → login
15. Service Quote Engine — Vendor cost only input, margin auto-applied, selling price calculated
16. Quote-to-Invoice Automation — Accepted quote auto-creates phased invoice
17. Service Payment Terms — Advance % + Final % with vendor release after advance met
18. Email sending MOCKED (logged to email_logs collection, requires Resend for production)

## Key API Endpoints
- `POST /api/admin/payments/{id}/approve` — Payment approval (LiveCommerceService)
- `GET /api/admin/orders-ops` — Canonical admin orders
- `GET /api/vendor/orders` — Filtered vendor orders (only released work)
- `POST /api/vendor/orders/{id}/status` — Vendor status updates (up to ready_for_pickup)
- `POST /api/sales/delivery/{id}/update-status` — Sales logistics updates
- `GET/POST /api/admin/margin-rules` — Margin rules CRUD + calculate
- `GET/POST /api/admin/vendor-capabilities` — Vendor capability governance
- `GET/POST /api/admin/payment-release-policies` — Payment release policy CRUD
- `POST /api/admin/payment-release-policies/check-release` — Check vendor release eligibility
- `POST /api/sales/customers/create-with-invite` — Sales creates customer + invite
- `POST /api/sales/customers/{id}/resend-invite` — Resend invite
- `GET /api/auth/activate/validate` — Validate activation token
- `POST /api/auth/activate` — Set password + activate account
- `POST /api/sales/service-quotes` — Create service quote (vendor cost → auto margin)
- `POST /api/sales/service-quotes/{id}/send` — Send quote to customer
- `POST /api/sales/service-quotes/{id}/accept` — Accept quote → auto-create invoice

## Upcoming Tasks (P1)
- Admin data entry configuration: system logo, TIN, BRN, bank account details
- End-to-end Stripe test with real test cards
- Sales UI for customer creation, quote creation (vendor cost input), invite management

## Backlog (P2)
- Twilio WhatsApp integration (blocked on API keys)
- Resend email integration (blocked on API key) — will wire customer invite emails
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization
- KwikPay live payment gateway (blocked on API keys)

## Testing Status
- Iteration 143: 100% pass (20/20 backend, all frontend verified) — Vendor release + Sales workflow
- Iteration 142: 100% pass (20/20 backend) — Margin + Delivery + Notifications
- Iterations 135-141: 100% pass — Core platform E2E
