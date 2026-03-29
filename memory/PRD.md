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
- Admin order management with enriched data

### Phase 2: Data Enrichment & Assignment (Done)
- Automated vendor assignment from product catalog at payment approval
- Automated sales rep assignment via round-robin at payment approval
- Payer name / customer name separation (from payment proofs)
- Notification generation on payment approval (customer, admin, vendor, sales)
- 3 demo sales users seeded
- Modular backend services in /backend/services/

### Phase 3: Stripe Payment Gateway — Sandbox (Done)
- Stripe checkout session creation for invoice payments
- Payment status polling (frontend + backend)
- payment_transactions collection for audit trail
- Pay Invoice button on customer invoice drawer
- Payment success/cancel URL handling with banner messages
- Stripe webhook handler at /api/webhook/stripe

### Phase 4: Surgical Fix Pack (Done — March 29, 2026)
1. **Admin customer_name vs payer_name separation** — Both columns in admin orders table, distinct values
2. **Vendor assignment persistence** — vendor_orders created with vendor_order_no, base_price at approval
3. **approved_by / approved_at** — Written on both invoice and order at approval time, visible in admin table
4. **Vendor order visibility** — Orders appear in /partner/orders from vendor_orders collection
5. **Vendor privacy** — Customer identity (name/phone/email) excluded from vendor API/UI
6. **Dashboard link cleanup** — All /dashboard/* links normalized to /account/*

### Phase 5: 5-Point Acceptance Verification (Done)
1. ✅ Customer invoice shows payer name correctly
2. ✅ Customer payment approval notification appears and links to invoice
3. ✅ Customer order drawer shows real assigned sales person + contact
4. ✅ Admin sees customer name, payer name, assigned sales, assigned vendor, approved by
5. ✅ Vendor sees orders (privacy-compliant: no customer identity)

## Go-Live Readiness Status (11/18)
### Passing
- company_name, company_email, company_phone, address, currency, tax_rate, payment_terms, bank_name, sku_prefix, payment_gateway, payment_gateway_keys

### Needs Admin Action
- logo, tax_number, business_registration_number
- bank_account_name, bank_account_number
- resend_key, sender_email (Resend API key required)

## Key API Endpoints
- `POST /api/payments/stripe/checkout/invoice` — Create Stripe checkout session
- `GET /api/payments/stripe/checkout/status/{session_id}` — Poll payment status
- `POST /api/webhook/stripe` — Stripe webhook
- `GET /api/admin/orders-ops` — Admin enriched orders (customer, payer, sales, vendor, approved_by)
- `POST /api/admin-flow-fixes/finance/approve-proof` — Payment approval orchestrator
- `GET /api/vendor/orders` — Vendor orders (privacy-compliant)
- `GET /api/customer/invoices` — Customer invoices with payer_name
- `GET /api/customer/orders` — Customer orders with sales contact
- `GET /api/customer/notifications` — Customer notifications
- `GET /api/admin/go-live-readiness` — Launch readiness checklist

## Upcoming Tasks (P1)
- End-to-end payment flow testing with real Stripe test cards
- Resend email integration (requires user API key)
- Final admin configuration (logo, TIN, bank details)

## Backlog (P2)
- Configure Twilio WhatsApp (blocked on API keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization
- KwikPay live payment gateway (blocked on API keys)
