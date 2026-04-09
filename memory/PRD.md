# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform that is deployable as a single-business-per-deployment model. The application must support dynamic branding, role-based dashboards, multichannel notifications, discount analytics with margin-risk intelligence, and a comprehensive admin settings hub — so any business can run their own instance without code changes.

## Architecture
- **Frontend:** React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend:** FastAPI (Python) + MongoDB (Motor async driver)
- **Auth:** JWT-based with role separation (admin, customer, vendor/partner, sales, staff, affiliate)
- **Notifications:** In-App + Resend Email (live) + Twilio WhatsApp (ready)
- **Payments:** Stripe sandbox + Bank transfer proof upload

## Core Concepts
- **Single source of truth for branding:** `admin_settings` collection, key `settings_hub`
- **Public endpoints:** `/api/public/business-context`, `/api/public/branding`, `/api/public/payment-info`
- **Admin settings hub:** `GET/PUT /api/admin/settings-hub` (admin auth required)
- **BrandingProvider:** React context fetches branding on mount with fallback values, non-blocking
- **Margin-risk classification:** Safe (<80% budget) / Warning (80-100%) / Critical (>100%) — uses same margin engine

## What's Been Implemented

### Phase 1: Core Platform (Previous sessions)
- Role-based dashboards (Admin, Customer, Vendor, Sales, Affiliate)
- Product catalog, cart, checkout flow
- Order management with fulfillment tracking
- Invoice generation and payment proof upload
- Vendor order assignment and privacy controls
- Commission and settlement system
- Customer points and referral program

### Phase 2: Communications & Preferences
- CountryAwarePhoneField system-wide
- Notification Preferences UI per user
- Multichannel Notification Dispatch (In-App, Email via Resend, WhatsApp via Twilio)

### Phase 3: Business Settings Hub & Dynamic Branding (Apr 2026)
- Public branding endpoint, payment-info endpoint, consolidated business-context endpoint
- Admin Settings Hub with JWT auth protection
- BrandingProvider React context with fallback values, non-blocking render
- Frontend de-hardcoding of "Konekt" across 80+ components
- Backend de-hardcoding in email templates, AI assistant, account emails

### Phase 4: Settings Preview + Discount Analytics (Apr 2026)
- **Settings Preview Panel** — Navbar, Footer, Email, Invoice previews using current form state
- **Discount Analytics Dashboard** — 6 KPIs, 4 charts, 2 tables, date range filter, CSV export
- **Auto-Warning Overlay** — Risk panel in discount approval drawer:
  - Shows risk_level (Safe/Warning/Critical) from margin engine
  - Shows remaining margin, distributable margin, max safe discount
  - Warning: amber alert, admin can approve
  - Critical: red alert, requires explicit checkbox confirmation before approval
  - Uses `_classify_discount_risk()` — identical thresholds to pricing engine

## Prioritized Backlog

### P1 (High)
- Wire up Twilio WhatsApp integration (when API keys provided)
- Admin sidebar navigation cleanup for analytics discoverability

### P2 (Medium/Future)
- WhatsApp automation flows
- Email template refinement with uploaded logo images
- Sales Leaderboard / Gamification
- Marketing campaigns + automation
- Mobile-first optimization
- CSS custom properties for runtime theme switching
- Margin-risk trend over time analytics
- Admin threshold settings for safe/warning/critical levels
