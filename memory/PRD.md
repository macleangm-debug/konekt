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
- **Login/session privacy**: Token validated via /api/auth/me on mount, stale tokens cleared
- **Market settings backend**: Centralized TZ defaults (phone, email, currency, date format)
- **African phone prefixes**: 55 countries with TZ +255 default
- **Service forms -> Requests**: All service pages POST to /api/public-requests
- **Contact page**: Market settings for phone/email/address
- **Request quote dropdown**: Added Office Equipment + Promotional Materials categories
- **Success state standardization**: All public forms show reference number + activation banner
- **Footer consolidation**: All footer components use market settings

### Phase 2 CRM/Inbox Fixes — COMPLETED 2026-03-31
- **Convert-to-lead CRM visibility**: Fixed collection mismatch — bridge service now writes to `crm_leads` (was `leads`). Migrated 6 old leads at startup.
- **Request traceability**: CRM leads store `source_request_id`, `source_request_type`, `source_request_reference`, `converted_from_request: true`
- **"Open in CRM" button**: Request inbox drawer shows gold "Open in CRM" button for converted requests, navigates to CRM with auto-open drawer
- **CRM table reorder**: Date Created | Lead Name | Company | Source | Owner | Stage | Status | Last Activity | Next Follow-up | Actions
- **CRM drawer pattern**: Row click opens Shadcn Sheet drawer instead of navigating to LeadDetailPage. Drawer includes: lead info grid, timeline, related documents, add note, schedule follow-up, update stage
- **Backward compatibility**: Old leads migrated from `leads` to `crm_leads` on startup. All CRM intelligence routes support both ObjectId and custom id lookups.

### Service Architecture
```
/app/backend/services/
├── market_settings_resolver.py         # Market defaults (phone/email/currency)
├── public_request_intake_service.py    # Public intake -> Requests
├── request_crm_bridge_service.py       # Request -> CRM Lead (writes to crm_leads)
├── order_write_service.py              # Centralized order creation
├── notification_dispatch_service.py    # Notification dispatch
├── payer_customer_separation_service.py
├── margin_calculator.py                # Hybrid margin engine
└── ...
```

## Key API Endpoints
- `GET /api/market-settings` — Market config
- `GET /api/auth/me` — Token validation
- `POST /api/public-requests` — Public request (6 types)
- `POST /api/admin/requests/{id}/convert-to-lead` — Convert request to CRM lead
- `GET /api/admin/crm/leads` — List CRM leads
- `GET /api/admin/crm-deals/leads/{id}` — Lead detail with related docs
- `POST /api/admin/crm-intelligence/leads/{id}/note` — Add note
- `POST /api/admin/crm-intelligence/leads/{id}/follow-up` — Schedule follow-up
- `POST /api/admin/crm-intelligence/leads/{id}/status` — Update stage

## Upcoming Tasks
### Phase 3 — Marketplace + Service UX (P1)
- Standard service page template (hero/included/how-it-works/FAQ/CTA)
- Marketplace sync (public + account same product source)
- Country selector redesign (unavailable -> expansion waitlist)

### Backlog (P2)
- Twilio WhatsApp / Resend email (blocked on API keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization

## Testing Status
- Iteration 150: 100% (13/13 backend + all frontend) — Phase 2 CRM/Inbox
- Iteration 149: 100% (20/20 + frontend) — Phase 1 Stabilization
- Iteration 148: 100% (20/20) — Public Intake Consolidation
- Iteration 147: 100% (25/25) — Post-Refactoring E2E
- Iteration 146: 100% (42/42) — Backend Stability Refactoring
