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
- **Guest Activation** — Guest checkout/requests auto-create invited accounts
- **Sample Flow** — Request→Sample Quote→Approval→Actual Production Order
- **Centralized Services** — All business logic flows through /services layer (Packs 1-7)
- **Unified Public Intake** — All public forms (contact, quote, business pricing) → Requests module

## What's Implemented

### Core Platform
- React + FastAPI + MongoDB full-stack, role-based auth, product catalog, checkout, invoicing, Stripe sandbox

### Backend Stability Centralization (Packs 1-7)
- Pack 1: Order Write Service, Timeline, Assignment Orchestrator, Status Policy
- Pack 2-3: Assignment + Status Transition policies (wired)
- Pack 4: Notification Dispatch with click target registry
- Pack 5: Payer/Customer Separation (hardened, DB-backed)
- Pack 6: Request→Quote Conversion
- Pack 7: Guest Identity Link (hardened)

### Public Intake Consolidation — COMPLETED 2026-03-30
- **Unified Requests Module**: All public forms write to `requests` collection
- **New endpoints**: `/api/public-requests` (generic) + `/api/public-requests/contact` (contact-specific)
- **6 supported request types**: contact_general, service_quote, business_pricing, product_bulk, promo_custom, promo_sample
- **CRM Bridge**: Admin/Sales can convert any request → CRM lead via `/api/admin/requests/{id}/convert-to-lead`
- **Status Management**: Admin can update request CRM stage via `/api/admin/requests/{id}/status`
- **Contact Page Rewired**: No longer mocked — persists to Requests with reference number
- **Quote Request Page Rewired**: Posts to `/api/public-requests` (not `guest_leads`)
- **URL-driven types**: `/request-quote?type=business_pricing` shows "Request Business Pricing" title
- **Business Pricing CTA Fixed**: Contact page CTA now links to `/request-quote?type=business_pricing`
- **Shared Frontend Utilities**: `formatters.js` (DD/MM/YYYY, TZS money), `PhoneNumberField`, `CurrencyInput`
- **Guest Account Linking**: All public submissions auto-create invited accounts

### Other Completed Work
- Checkout 2-Column Layout
- Margin + Delivery + Notifications Pack
- Vendor Release + Capabilities Pack
- Sales Service Workflow + Customer Invite Pack
- Guest Checkout + Requests + Sample Flow Pack

## Service Architecture
```
/app/backend/services/
├── public_request_intake_service.py    # Public intake → Requests
├── request_crm_bridge_service.py       # Request → CRM Lead
├── order_write_service.py              # Centralized order creation
├── order_timeline_service.py           # Event logging
├── order_assignment_orchestrator_service.py
├── order_status_policy_service.py
├── assignment_policy_service.py
├── status_transition_policy.py
├── notification_dispatch_service.py
├── payer_customer_separation_service.py
├── request_conversion_service.py
├── guest_checkout_activation_service.py
├── margin_calculator.py
├── sample_flow_engine.py
└── ...
```

## Key API Endpoints
### Public Intake (NEW)
- `POST /api/public-requests` — Generic public request (any of 6 types)
- `POST /api/public-requests/contact` — Contact form submission
### Admin CRM (NEW)
- `POST /api/admin/requests/{id}/convert-to-lead` — Request → Lead
- `PUT /api/admin/requests/{id}/status` — Update CRM stage
### Existing
- `POST /api/requests` — Original request endpoint (now accepts 6 types)
- `GET /api/admin/requests` — All request types visible
- `POST /api/guest/orders` — Guest order creation
- `POST /api/admin/margin-rules/calculate` — Margin engine

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
- Iteration 148: 100% (20/20 backend + frontend) — Public Intake Consolidation
- Iteration 147: 100% (25/25) — Post-Refactoring E2E Validation
- Iteration 146: 100% (42/42) — Backend Stability Refactoring
- Iteration 145: 100% (25/25) — Guest Checkout + Requests + Sample Flow
