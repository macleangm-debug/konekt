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
- Global de-hardcoding of "Konekt" references (DONE)
- AdminSettingsHub: business profile, branding, notifications
- `/api/public/business-context` public endpoint
- `BrandingProvider` React context for dynamic brand loading
- Admin Settings Preview Panel (live visual UI preview)
- PDF generation uses dynamic branding (logo, colors, footer)

### Phase 3 — Margin Protection & Discount Analytics
- Discount Analytics Dashboard (KPIs, Charts, Tables) (DONE)
- Margin-Risk Engine: Safe/Warning/Critical classification (DONE)
- Admin Discount Approval Auto-Warning Overlay (DONE)
- **Sales Quote Auto-Warning Overlay** — live risk preview in discount request modal (DONE — Apr 9, 2026)
  - Extended existing `POST /api/staff/discount-requests` with `mode: "preview"` (no new routes)
  - Shows: risk badge, remaining margin, max safe discount, contextual message
  - Debounced (500ms) live calculation as sales rep enters discount value

### Phase 4 — Document Visual Review (DONE — Apr 9, 2026)
- Created shared `DocumentFooterSection` component
- Both Quote and Invoice preview pages now render:
  - Bank Transfer Details (bank, account, branch, reference)
  - Authorized Signature placeholder (CFO title + company)
  - Company Stamp placeholder (circular dashed)
  - Footer Bar (contact info, TIN, BRN)
- PDF generation footer uses dynamic brand name (not hardcoded)
- Fixed Invoice detail API bug (admin_facade_routes queried wrong field)

### Integrations
- Stripe Payments (sandbox test key from env)
- Resend Email (requires user API key)
- Twilio WhatsApp (requires user API key — not yet configured)

## Backlog

### P1 — Upcoming
- Admin sidebar cleanup for analytics discoverability
- End-to-end Stripe test with real test cards

### P2 — Future
- Sales Leaderboard / Gamification
- Admin alert system for repeated risky discount behavior
- Twilio WhatsApp integration (pending API keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization
