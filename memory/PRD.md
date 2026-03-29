# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) for Tanzania. Role-based views for Customer, Admin, Vendor/Partner, and Sales. Canonical routing, automated order assignment at payment approval, invoice/order data enrichment. Live payment gateway integration.

## Architecture
- **Frontend**: React with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI (Python 3.11) with Motor (async MongoDB)
- **Database**: MongoDB (Konekt DB)
- **Payments**: Stripe (sandbox), KwikPay (pending keys)
- **Email**: Resend (pending API key)
- **Messaging**: Twilio WhatsApp (pending API keys)

## Core Roles & Routes
| Role     | Login Route | Portal Root      |
|----------|-------------|------------------|
| Customer | /login      | /account/*       |
| Admin    | /login      | /admin/*         |
| Vendor   | /login      | /partner/*       |
| Sales    | /login      | (assigned data)  |

## Completed Features

### Phase 1: Core Platform (Done)
- Unified /login with role-based redirect
- Canonical /account/* for customers, /admin/* for admins, /partner/* for vendors
- Product catalog, service catalog, quotes, invoices, orders

### Phase 2: Data Enrichment & Assignment (Done)
- Automated vendor/sales assignment at payment approval
- Payer name / customer name STRICT separation
- Notification generation on payment approval
- 3 demo sales users seeded, modular services in /backend/services/

### Phase 3: Stripe Payment Gateway — Sandbox (Done)
- Stripe checkout session, status polling, webhook handler
- Pay Invoice button, payment success/cancel URL handling

### Phase 4: Surgical Fix Pack (Done — March 29, 2026)
- approved_by/approved_at on invoice and order at approval
- vendor_orders created with vendor_order_no, base_price
- Vendor privacy: no customer identity in API/UI
- Dashboard link cleanup: /dashboard/* → /account/*

### Phase 5: File-by-File Surgical Patch (Done — March 29, 2026)
- **STRICT payer/customer separation**: Removed ALL customer_name→payer fallbacks from customer_invoice_routes.py, admin_facade_routes.py, order_ops_routes.py
- **Checkout payer prefill**: Payer name auto-prefilled from customer account with "Change" button
- **Admin invoice list**: customer_name and payer_name are distinct columns
- **Admin orders**: customer_name, payer_name, sales, vendor, approved_by all enriched
- **Vendor privacy**: Only vendor-safe fields returned (no customer identity)

### Acceptance Gates — ALL GREEN
| Gate | Status |
|------|--------|
| Checkout payer prefill from account | ✅ |
| Customer invoice payer column | ✅ |
| Customer order drawer sales contact | ✅ |
| Admin invoice customer vs payer | ✅ |
| Admin order enrichment (all fields) | ✅ |
| Admin UI Payer + Approved By columns | ✅ |
| Vendor orders vendor-safe only | ✅ |
| Vendor UI no Customer column | ✅ |
| Payer/customer value separation | ✅ |

## Key API Endpoints
- `POST /api/payments/stripe/checkout/invoice` — Stripe checkout session
- `GET /api/payments/stripe/checkout/status/{session_id}` — Poll payment status
- `POST /api/webhook/stripe` — Stripe webhook
- `GET /api/admin/orders-ops` — Admin enriched orders
- `GET /api/admin/invoices/list` — Admin enriched invoices
- `POST /api/admin-flow-fixes/finance/approve-proof` — Payment approval orchestrator
- `GET /api/vendor/orders` — Vendor orders (privacy-compliant)
- `GET /api/customer/invoices` — Customer invoices
- `GET /api/customer/orders` — Customer orders with sales contact
- `GET /api/customer/notifications` — Customer notifications

## Go-Live Readiness (11/18)
### Needs Admin Action
- logo, tax_number, business_registration_number, bank_account_name/number
- resend_key, sender_email (Resend API key required)

## Upcoming Tasks (P1)
- End-to-end Stripe payment test with real test cards
- Resend email integration (requires user API key)
- Final admin configuration (logo, TIN, bank details)

## Backlog (P2)
- Twilio WhatsApp (blocked on API keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization
- KwikPay live payment gateway (blocked on API keys)
