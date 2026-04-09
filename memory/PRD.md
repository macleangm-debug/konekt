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
- PDF generation uses dynamic branding (logo, colors, footer)

### Phase 3 — Margin Protection & Discount Analytics
- Discount Analytics Dashboard (KPIs, Charts, Tables)
- Margin-Risk Engine: Safe/Warning/Critical classification
- Admin + Sales Discount Auto-Warning Overlays
- Configurable alert thresholds in Settings Hub → Discount Governance

### Phase 4 — Document Visual Review (Apr 9, 2026)
- Shared `DocumentFooterSection` (Bank Details, Signature, Stamp, Footer)
- Quote and Invoice preview pages use dynamic footer

### Phase 5 — Governance & Proactive Alerts (Apr 9, 2026)
- Admin Risk Behavior Alert System
- Admin sidebar cleanup: Discount Analytics, Delivery Notes, Purchase Orders
- Stripe E2E validated

### Phase 6 — Sales Performance Management (Apr 9, 2026)
- **Customer Service Rating**: 1-5 stars + optional comment on completed orders
  - One rating per order, stored as subdocument
  - "Remind me later" dismiss option on customer order detail
  - Duplicate prevention
- **Sales Dashboard**: Avg Rating KPI + Recent Ratings (negative highlighted with LOW badge)
- **Sales Leaderboard**: Balanced scoring (Deals 30%, Commission 30%, Rating 25%, Revenue 15% internal)
  - Revenue hidden from sales view (privacy)
  - Performance labels: Top Performer / Strong / Improving / Needs Attention
  - Current user highlighted

### Phase 7 — Admin Team Intelligence (Apr 9, 2026)
- **Admin Sales Ratings & Feedback Page** (under Reports & Analytics)
  - KPI row: Avg Team Rating, Total Ratings, Highest/Lowest Rated Rep
  - Ratings by Sales Rep table (name, avg, count, deals, last rated)
  - Low Rating Alerts (≤2 stars) with admin review + internal notes
  - Rating Trend chart (daily averages)
  - Recent Feedback (positive/neutral/negative sentiment borders)
  - Time filter (30/60/90/180/365 days)

### Integrations
- Stripe Payments (sandbox test key — working E2E)
- Resend Email (requires user API key)
- Twilio WhatsApp (requires user API key — not yet configured)

## Backlog

### P1 — Upcoming
- Coaching system for low-performing reps (based on ratings + alerts)
- Automated weekly performance summary for admin
- End-to-end Stripe test with real payment cards

### P2 — Future
- Twilio WhatsApp integration (pending API keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization
