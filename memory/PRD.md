# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) for Tanzania. Role-based views for Customer, Admin, Vendor/Partner, and Sales.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB
- **Payments**: Stripe (sandbox), Bank Transfer

## What's Implemented

### Core Platform
- Role-based auth, product catalog, checkout, invoicing, Stripe sandbox
- Backend stability centralization (Packs 1-7)
- Unified public intake -> Requests module
- Admin Requests Inbox + CRM bridge

### Phase 1 Stabilization — COMPLETED 2026-03-31
- Login/session privacy, market settings backend, African phone prefixes
- Service forms -> unified Requests, contact page market settings
- Request quote dropdown categories, success state standardization, footer consolidation

### Phase 2 CRM/Inbox Fixes — COMPLETED 2026-03-31
- Convert-to-lead CRM visibility (fixed collection mismatch: `leads` -> `crm_leads`)
- Request traceability fields (`source_request_id`, `source_request_type`, `converted_from_request`)
- "Open in CRM" button in Request drawer, CRM table reorder, CRM drawer pattern

### Phase 3 Marketplace + Service UX — COMPLETED 2026-03-31
**Pack 3.1 — Service UX Standardization**
- All service detail pages use `ServicePageTemplate` (Hero → Includes → ForWho → Process → Benefits → FAQ → Bottom CTA)
- NO inline forms on service pages — all CTAs route to `/request-quote?type=service_quote&service=<slug>`
- `DynamicServiceDetailPage` and `ServiceDetailContent` both use the template
- Service group pages show "Learn More" + "Request Quote" per service

**Pack 3.2 — Marketplace Unification**
- Single API source: `/api/marketplace/products/search` for both public and account marketplace
- Guest mode: shows "Quote" button per product → routes to `/request-quote?type=product_bulk`
- Logged-in mode: shows "Order" + "Quote" buttons
- 41 products visible from unified catalog

**Pack 3.3 — Country Selector + Expansion Flow**
- Tanzania marked as "Available" with region selection (Dar es Salaam, Arusha, Mwanza, Dodoma)
- Kenya, Uganda, Rwanda, Ghana, Nigeria, South Africa marked as "Coming Soon"
- Clicking Coming Soon country → redirects to `/launch-country?country=XX`
- Expansion page pre-selects the country from query param

### Key Design Principle: All Roads Lead to Requests
```
Service page → /request-quote?type=service_quote&service=<slug>
Marketplace quote → /request-quote?type=product_bulk&service=<product_name>
Contact page → /request-quote (type=contact_general)
Business pricing → /request-quote (type=business_pricing)
```

## Key API Endpoints
- `GET /api/marketplace/products/search` — Unified product catalog (single source of truth)
- `GET /api/market-settings` — Market config
- `POST /api/public-requests` — Public request (all types)
- `POST /api/admin/requests/{id}/convert-to-lead` — Convert request to CRM lead
- `GET /api/admin/crm/leads` — List CRM leads
- `GET /api/admin/crm-deals/leads/{id}` — Lead detail with related docs

## Upcoming Tasks
### Lead-to-Quote CRM Drawer Action (P1)
- "Create Quote" action in CRM drawer
- Prefill from linked request + contact/company info
- Preserve traceability: `source_lead_id`, `source_request_id`, `created_from_crm: true`

### Backlog (P2)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization
- Twilio WhatsApp / Resend email (blocked on API keys)

## Testing Status
- Iteration 151: 100% (14/14 backend + all frontend) — Phase 3 Marketplace + Service UX
- Iteration 150: 100% (13/13 + all frontend) — Phase 2 CRM/Inbox
- Iteration 149: 100% (20/20 + frontend) — Phase 1 Stabilization
- Iteration 148-146: 100% — Backend Stability Refactoring
