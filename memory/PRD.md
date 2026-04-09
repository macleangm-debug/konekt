# Konekt B2B E-Commerce Platform — PRD

## Product Vision
White-label, single-business-per-deployment B2B commerce platform with dynamic branding, margin protection, and role-based access control.

## Core Architecture
- **Frontend**: React + Tailwind + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Payments**: Stripe (Sandbox)
- **Branding**: Dynamic via AdminSettingsHub → `/api/public/business-context`

## Roles
- Admin, Sales/Staff, Customer, Vendor/Partner, Affiliate

## What's Implemented (Complete)

### Phase 1 — Core Platform
- Multi-role auth (JWT), registration, login
- Product catalog, quote workflow, order pipeline
- Invoice generation & PDF export
- Payment proof upload + admin approval queue
- Vendor orders auto-generated on payment approval
- Strict payer/customer name separation
- Affiliate/referral system

### Phase 2 — White-Label & Branding
- Global de-hardcoding of "Konekt" references
- AdminSettingsHub: business profile, branding, notifications
- `/api/public/business-context` public endpoint
- `BrandingProvider` React context for dynamic brand loading
- Admin Settings Preview Panel (live visual UI preview)
- PDF generation uses dynamic branding (logo, colors, footer)

### Phase 3 — Margin Protection & Discount Analytics
- Discount Analytics Dashboard (KPIs, Charts, Tables)
- Margin-Risk Engine: Safe/Warning/Critical classification
- Admin Discount Approval Auto-Warning Overlay
- Sales Quote Auto-Warning Overlay — live risk preview in discount request modal
  - Extended existing `POST /api/staff/discount-requests` with `mode: "preview"` (no new routes)

### Phase 4 — Document Visual Review (Apr 9, 2026)
- Created shared `DocumentFooterSection` component
- Both Quote and Invoice preview pages render: Bank Details, Authorized Signature, Company Stamp, Footer Bar
- PDF generation footer uses dynamic brand name
- Fixed Invoice detail API bug (admin_facade_routes queried wrong field)

### Phase 5 — Admin Sidebar Cleanup & Governance (Apr 9, 2026)
- **Sidebar cleanup**: Added Discount Analytics (Commerce), Delivery Notes + Purchase Orders (Operations)
- **Reports** renamed to **Reports & Analytics**
- **Stripe E2E**: Validated checkout session creation, status polling, real Stripe URLs, TZS→USD conversion
- **Admin Risk Behavior Alert System**: Proactive governance layer
  - Detects repeated Critical (≥3 in 7 days) or Warning (≥5 in 7 days) discount requests per sales rep
  - Creates `discount_risk_alerts` documents with de-duplication
  - Sends admin notifications to all admin users
  - Alert banner displayed on Discount Analytics page with dismiss capability
  - Endpoints: `GET /api/admin/discount-analytics/alerts`, `PUT /api/admin/discount-analytics/alerts/{id}/dismiss`
  - Uses existing discount request data, margin-risk classification, notification system — no new route files

### Integrations
- Stripe Payments (sandbox test key from env — working E2E)
- Resend Email (requires user API key)
- Twilio WhatsApp (requires user API key — not yet configured)

## Backlog

### P1 — Upcoming
- End-to-end Stripe test with real payment cards (user-facing flow)

### P2 — Future
- Sales Leaderboard / Gamification
- Twilio WhatsApp integration (pending API keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization
