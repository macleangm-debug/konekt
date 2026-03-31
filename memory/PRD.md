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
- Unified public intake → Requests module
- Admin Requests Inbox + CRM bridge

### Phase 1 Stabilization — COMPLETED 2026-03-31
- **Login/session privacy**: Token validated via /api/auth/me on mount, stale tokens cleared, /login always shown for unauthenticated
- **Market settings backend**: Centralized TZ defaults (phone: +255 759 110 453, email: sales@konekt.co.tz, currency: TZS, date: DD/MM/YYYY)
- **African phone prefixes**: 55 countries with TZ +255 format, default to market
- **Service forms → Requests**: Office Branding and all service pages now POST to /api/public-requests (not guest_leads)
- **Contact page**: Market settings for phone/email/address, Business Pricing card contrast fixed (dark text on light bg)
- **Request quote dropdown**: Added Office Equipment + Promotional Materials categories
- **Success state standardization**: All public forms show reference number + larger activation banner with "Activate Account" CTA
- **Footer consolidation**: All 3 footer components (PublicFooter, PremiumFooterV2, Footer.js) use market settings

### Service Architecture
```
/app/backend/services/
├── market_settings_resolver.py         # Market defaults (phone/email/currency)
├── public_request_intake_service.py    # Public intake → Requests
├── request_crm_bridge_service.py       # Request → CRM Lead
├── order_write_service.py              # Centralized order creation
├── notification_dispatch_service.py    # Notification dispatch
├── payer_customer_separation_service.py
├── margin_calculator.py                # Hybrid margin engine
└── ...
```

## Key API Endpoints
- `GET /api/market-settings` — Market config (phone/email/currency)
- `GET /api/auth/me` — Token validation
- `POST /api/public-requests` — Public request (6 types)
- `POST /api/public-requests/contact` — Contact form
- `POST /api/admin/requests/{id}/convert-to-lead`
- `POST /api/guest/orders` — Guest checkout

## Upcoming Tasks
### Phase 2 — CRM/Inbox Fixes (P1)
- Convert-to-lead → CRM visibility (converted leads appear in CRM table)
- Request drawer "Open in CRM" button + details in readable text
- CRM table reorder (Date | Name | Company | Source | Owner | Stage)

### Phase 3 — Marketplace + Service UX (P1)
- Standard service page template (hero/included/how-it-works/FAQ/CTA)
- Marketplace sync (public + account same product source)
- Country selector redesign (unavailable → expansion waitlist)

### Backlog (P2)
- Twilio WhatsApp / Resend email (blocked on API keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization

## Testing Status
- Iteration 149: 100% (20/20 + frontend) — Phase 1 Stabilization
- Iteration 148: 100% (20/20) — Public Intake Consolidation
- Iteration 147: 100% (25/25) — Post-Refactoring E2E
- Iteration 146: 100% (42/42) — Backend Stability Refactoring
