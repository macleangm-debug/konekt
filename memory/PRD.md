# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) for Tanzania. Role-based views for Customer, Admin, Vendor/Partner, and Sales. Canonical routing, automated order assignment, payment release controls, and production workflow.

## Architecture
- **Frontend**: React with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI (Python 3.11) with Motor (async MongoDB)
- **Database**: MongoDB
- **Payments**: Stripe (sandbox), Bank Transfer, KwikPay (pending)

## Key Technical Concepts
- **Strict Payer/Customer Separation** — Never collapse customer_name and payer_name
- **Vendor Privacy** — VAT-inclusive base cost only, no Konekt margins/public prices
- **Margin Engine Priority** — Individual product > Product Group > Global (default 20%)
- **Delivery Workflow Split** — Vendor→ready_for_pickup, Sales→logistics
- **Vendor Release** — Only show released work based on payment/credit policies
- **Vendor Capabilities** — One account model, admin approves products/services/promo
- **Guest Activation** — Guest checkout/requests auto-create invited accounts
- **Sample Flow** — Request→Sample Quote→Approval→Actual Production Order
- **Centralized Services** — All business logic flows through /services layer (Packs 1-7)

## What's Implemented

### Core Platform
- React + FastAPI + MongoDB full-stack, role-based auth, product catalog, checkout, invoicing, Stripe sandbox

### Checkout 2-Column Layout
- Payment Method + Payment Confirmation side-by-side on desktop, stacked on mobile
- Payment confirmation checkbox REQUIRED

### Margin + Delivery + Notifications Pack
- Payment queue customer/payer separation
- Clickable notifications (Approved→orders, Rejected→invoices)
- Compact admin orders table (7 columns)
- Delivery logistics workflow, sales delivery override
- Hybrid margin engine (percentage, fixed_amount, tiered)

### Vendor Release + Capabilities Pack
- Vendor capability governance (admin approves products/services/promo)
- Payment release policy engine, vendor visibility filter
- Vendor price privacy, default 20% margin seed

### Sales Service Workflow + Customer Invite Pack
- Sales customer creation + invite, account activation
- Service quote engine (vendor cost → auto margin)
- Quote→invoice automation with phased payment terms

### Guest Checkout + Requests + Sample Flow Pack
- Guest checkout auto-creates invited account with activation link
- Request module: 4 types (product_bulk, promo_custom, promo_sample, service_quote)
- Public request buttons + in-account quick request form
- CTA registry for frontend button configs
- Sales/admin request management (list, assign, convert to quote)
- Sample workflow: request → sample quote → approve → actual production order quote
- Payment selection page shows activation banner for guests
- Email sending MOCKED (requires Resend)

### Backend Stability Centralization (Packs 1-7) — COMPLETED 2026-03-30
- **Pack 1 (Order Write Service)**: Centralized order creation via `order_write_service.py` — guest order creation delegated from route to service with safeguard logging
- **Pack 1 (Order Timeline)**: Centralized event logging via `order_timeline_service.py`
- **Pack 1 (Assignment Orchestrator)**: Centralized sales+vendor assignment via `order_assignment_orchestrator_service.py`
- **Pack 1 (Status Policy)**: Role-based status transitions via `order_status_policy_service.py`
- **Pack 2 (Assignment Policy)**: Deterministic assignment resolution via `assignment_policy_service.py` — WIRED
- **Pack 3 (Status Transition)**: Role-based transition rules via `status_transition_policy.py` — WIRED
- **Pack 4 (Notification Dispatch)**: Centralized notification creation via `notification_dispatch_service.py` with click target registry
- **Pack 5 (Payer/Customer Separation)**: Hardened DB-backed resolution via `payer_customer_separation_service.py`
- **Pack 6 (Request Conversion)**: Shared request→quote service via `request_conversion_service.py` with default 20% margin
- **Pack 7 (Guest Identity Link)**: Hardened guest-to-account flow via `guest_checkout_activation_service.py` with `ensure_invited_user` + `create_guest_account_link`

## Service Architecture
```
/app/backend/services/
├── order_write_service.py              # Pack 1: Order creation entry point
├── order_timeline_service.py           # Pack 1: Event logging
├── order_assignment_orchestrator_service.py  # Pack 1: Assignment orchestration
├── order_status_policy_service.py      # Pack 1: Status transitions
├── assignment_policy_service.py        # Pack 2: Deterministic assignment
├── status_transition_policy.py         # Pack 3: Role-based status rules
├── notification_dispatch_service.py    # Pack 4: Notification dispatch
├── payer_customer_separation_service.py # Pack 5: Party identity separation
├── request_conversion_service.py       # Pack 6: Request→Quote conversion
├── guest_checkout_activation_service.py # Pack 7: Guest account linking
├── margin_calculator.py                # Hybrid margin engine
├── sample_flow_engine.py               # Sample workflow states
├── promotional_request_builder.py      # Request builders
└── ... (other services)
```

## Key API Endpoints
- `POST /api/admin/payments/{id}/approve` — Payment approval
- `GET /api/admin/orders-ops` — Admin orders
- `GET /api/vendor/orders` — Filtered vendor orders
- `GET/POST /api/admin/margin-rules` + `/calculate` — Margin engine
- `GET/POST /api/admin/vendor-capabilities` — Capability governance
- `GET/POST /api/admin/payment-release-policies` — Release policies
- `POST /api/sales/customers/create-with-invite` — Customer invite
- `POST /api/auth/activate` — Account activation
- `POST /api/sales/service-quotes` — Service quotes
- `POST /api/requests` — Public + authenticated requests (4 types)
- `GET /api/requests/ctas` — CTA button config
- `GET /api/admin/requests` — List/manage requests
- `POST /api/admin/requests/{id}/create-quote` — Request→quote
- `POST /api/admin/samples/from-request/{id}` — Sample workflow
- `POST /api/admin/samples/{id}/approve` — Sample approval
- `POST /api/admin/samples/{id}/create-actual-order-quote` — Production order
- `POST /api/guest/orders` — Guest order creation

## Upcoming Tasks (P1)
- Production Operations Tooling + Print Asset QA
- Sales Dashboard UI (Leads, Customers, Quotes, Orders, Workspace)
- Admin data entry configuration (logo, TIN, BRN, bank details)

## Backlog (P2)
- Twilio WhatsApp / Resend email (blocked on API keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization

## Testing Status
- Iteration 146: 100% (42/42) — Backend Stability Refactoring (Packs 1-7)
- Iteration 145: 100% (25/25) — Guest Checkout + Requests + Sample Flow
- Iteration 144: 100% (24/24) — Full E2E comprehensive
- Iteration 143: 100% (20/20) — Vendor Release + Sales Workflow
- Iteration 142: 100% (20/20) — Margin + Delivery + Notifications
