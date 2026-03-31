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
- **Unified Public Intake** — All public forms → Requests module → Sales/Admin inbox
- **Guest Activation** — Guest checkout/requests auto-create invited accounts
- **Centralized Services** — All business logic flows through /services layer (Packs 1-7)

## What's Implemented

### Core Platform
- React + FastAPI + MongoDB full-stack, role-based auth, product catalog, checkout, invoicing, Stripe sandbox

### Backend Stability Centralization (Packs 1-7)
- Pack 1-3: Order Write, Timeline, Assignment, Status services
- Pack 4: Notification Dispatch with click target registry
- Pack 5: Payer/Customer Separation (hardened, DB-backed)
- Pack 6: Request→Quote Conversion
- Pack 7: Guest Identity Link (hardened)

### Public Intake Consolidation — COMPLETED 2026-03-31
- **All public forms → unified `requests` collection**: Contact, Quote, Business Pricing
- **Endpoints**: `/api/public-requests` + `/api/public-requests/contact`
- **6 request types**: contact_general, service_quote, business_pricing, product_bulk, promo_custom, promo_sample
- **CRM Bridge**: Convert request → lead via `/api/admin/requests/{id}/convert-to-lead`
- **Admin Requests Inbox Page**: New `/admin/requests-inbox` with search, type filter, detail panel, convert-to-lead actions
- **Sales Access**: Requests Inbox visible in Sales sidebar (support module added to sales role)
- **Frontend Utilities**: `formatters.js` (DD/MM/YYYY, TZS), `PhoneNumberField`, `CurrencyInput`
- **Business Pricing CTA**: Contact page routes to `/request-quote?type=business_pricing`
- **URL-driven types**: `/request-quote?type=business_pricing` shows correct title

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
├── notification_dispatch_service.py    # Notification dispatch
├── payer_customer_separation_service.py # Customer/payer separation
├── request_conversion_service.py       # Request→Quote conversion
├── guest_checkout_activation_service.py # Guest account linking
├── margin_calculator.py                # Hybrid margin engine
└── ...
```

## Key API Endpoints
- `POST /api/public-requests` — Public request (6 types)
- `POST /api/public-requests/contact` — Contact form
- `GET /api/admin/requests` — All requests
- `POST /api/admin/requests/{id}/convert-to-lead` — CRM bridge
- `PUT /api/admin/requests/{id}/status` — Update CRM stage
- `POST /api/guest/orders` — Guest checkout
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
- Iteration 148: 100% (20/20) — Public Intake Consolidation
- UAT Manual Testing: 22/22 PASS (2026-03-31) — Full role-based validation
- Iteration 147: 100% (25/25) — Post-Refactoring E2E
- Iteration 146: 100% (42/42) — Backend Stability Refactoring
- Iteration 145: 100% (25/25) — Guest Checkout + Requests + Sample Flow
