# Konekt B2B E-Commerce Platform — PRD

## Product Vision
White-label, single-business-per-deployment B2B commerce platform with dynamic branding, margin protection, role-based access control, and sales performance management.

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
- Sales Quote Auto-Warning Overlay (mode: "preview" on existing endpoint)

### Phase 4 — Document Visual Review (Apr 9, 2026)
- Shared `DocumentFooterSection` component (Bank Details, Signature, Stamp, Footer)
- Quote and Invoice preview pages use dynamic footer
- PDF generation footer uses dynamic brand name

### Phase 5 — Governance & Analytics Discoverability (Apr 9, 2026)
- Admin sidebar cleanup: Discount Analytics, Delivery Notes, Purchase Orders added
- Admin Risk Behavior Alert System (proactive governance)
- Stripe E2E validated (session creation, status polling, real Checkout URLs)

### Phase 6 — Sales Performance Management (Apr 9, 2026)
- **Configurable Alert Thresholds**: Settings Hub → Discount Governance section
  - Critical threshold, warning threshold, rolling window, dedup window, enable/disable
  - Alert engine reads from settings at runtime (not hardcoded)
- **Customer Service Rating**: POST /api/customer/orders/{id}/rate
  - 1-5 stars + optional comment, one rating per order
  - Rating stored as subdocument on order
  - Rating prompt on completed order detail page
  - Duplicate prevention
- **Sales Dashboard Rating KPI**: Avg Rating card + Recent Ratings section
- **Sales Leaderboard**: Ranked table (deals, revenue, commission, avg rating)
  - Current user highlighted with "(You)" label
  - Top 3 positions have trophy/medal icons

### Integrations
- Stripe Payments (sandbox test key from env — working E2E)
- Resend Email (requires user API key)
- Twilio WhatsApp (requires user API key — not yet configured)

## Backlog

### P1 — Upcoming
- Admin view of sales ratings in existing analytics/reporting area
- End-to-end Stripe test with real payment cards

### P2 — Future
- Sales Leaderboard / Gamification enhancements
- Twilio WhatsApp integration (pending API keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization
