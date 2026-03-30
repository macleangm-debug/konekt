# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) for Tanzania. Role-based views for Customer, Admin, Vendor/Partner, and Sales. Canonical routing, automated order assignment at payment approval, invoice/order data enrichment. Live payment gateway integration.

## Architecture
- **Frontend**: React with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI (Python 3.11) with Motor (async MongoDB)
- **Database**: MongoDB (Konekt DB)
- **Payments**: Stripe (sandbox), KwikPay (pending keys)

## Key Technical Concepts
- **Strict Payer/Customer Separation:** `customer_name` from business/account records only. `payer_name` from payment proof only.
- **Vendor Privacy:** Vendors see ONLY VAT-inclusive `base_price`, work details, sales contact. No customer identity, no Konekt margins.
- **Margin Engine Priority:** Individual product > Product Group > Global (default 20%).
- **Delivery Workflow Split:** Vendor→ready_for_pickup. Sales→picked_up→in_transit→delivered→completed.
- **Vendor Release:** Only show released work. Products: full payment. Services: advance threshold. Admin override.
- **Vendor Capabilities:** One account model, capability approvals (products/services/promo).
- **Payment Confirmation Required:** Checkout requires explicit confirmation before submission.

## What's Implemented

### Core Platform (Completed)
- React + FastAPI + MongoDB full-stack
- Role-based auth (Customer, Admin, Vendor, Sales)
- Product catalog, checkout, invoicing, Stripe sandbox

### Checkout 2-Column Layout (Completed - March 2026)
- Payment Method + Payment Confirmation side-by-side on desktop, stacked on mobile
- Payment confirmation checkbox REQUIRED to submit order
- Bank transfer details displayed inline

### Margin + Delivery + Notifications Pack (Completed)
- Payment queue customer/payer separation
- Clickable notifications (Approved→orders, Rejected→invoices)
- Compact admin orders table (7 columns)
- Delivery logistics workflow (vendor→ready, sales→logistics)
- Hybrid margin engine (percentage, fixed_amount, tiered)

### Vendor Release + Capabilities Pack (Completed)
- Vendor capability governance (admin approves products/services/promo)
- Payment release policy engine
- Vendor visibility filter (only released work)
- Vendor price privacy (VAT-inclusive cost only)
- Default 20% product margin seed

### Sales Service Workflow + Customer Invite Pack (Completed)
- Sales customer creation + invite flow
- Account activation (/activate-account?token=...)
- Service quote engine (vendor cost → auto margin → selling price)
- Quote→invoice automation with phased payment terms
- Email sending MOCKED (requires Resend for production)

## Key API Endpoints
- `POST /api/admin/payments/{id}/approve` — Payment approval
- `GET /api/admin/orders-ops` — Admin orders
- `GET /api/vendor/orders` — Filtered vendor orders
- `POST /api/vendor/orders/{id}/status` — Vendor status (up to ready_for_pickup)
- `POST /api/sales/delivery/{id}/update-status` — Sales logistics
- `GET/POST /api/admin/margin-rules` — Margin rules CRUD
- `POST /api/admin/margin-rules/calculate` — Price calculation
- `GET/POST /api/admin/vendor-capabilities` — Capability governance
- `GET/POST /api/admin/payment-release-policies` — Release policies
- `POST /api/sales/customers/create-with-invite` — Customer invite
- `POST /api/auth/activate` — Account activation
- `POST /api/sales/service-quotes` — Service quotes
- `POST /api/sales/service-quotes/{id}/accept` — Quote→invoice
- `POST /api/guest/orders` — Guest order creation

## Upcoming Tasks (P1)
- Production Operations Tooling + Print Asset QA
- Sales Dashboard UI (Leads, Customers, Quotes, Orders, Workspace)
- Admin data entry configuration (logo, TIN, BRN, bank details)

## Backlog (P2)
- Twilio WhatsApp (blocked on API keys)
- Resend email integration (blocked on API key)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization

## Testing Status
- Iteration 144: 100% (24/24 backend + all frontend) — Full E2E comprehensive
- Iteration 143: 100% (20/20) — Vendor Release + Sales Workflow
- Iteration 142: 100% (20/20) — Margin + Delivery + Notifications
- Iterations 135-141: 100% — Core platform E2E
