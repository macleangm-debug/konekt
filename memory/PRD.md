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
- **Public endpoints:** `/api/public/business-context` (consolidated), `/api/public/branding`, `/api/public/payment-info`
- **Admin settings hub:** `GET/PUT /api/admin/settings-hub` (admin auth required)
- **BrandingProvider:** React context fetches branding on mount with fallback values, non-blocking
- **Margin-risk classification:** Safe / Warning / Critical — uses same thresholds as pricing engine

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
- Live Resend email integration verified

### Phase 3: Business Settings Hub & Dynamic Branding (Apr 2026)
- Public branding endpoint (`/api/public/branding`) — safe projection, no auth
- Public payment info endpoint (`/api/public/payment-info`) — bank details for customers
- Consolidated endpoint (`/api/public/business-context`) — single request for all public data
- Admin Settings Hub with JWT auth protection
- BrandingProvider React context with fallback values, non-blocking render
- Frontend de-hardcoding of "Konekt" across 80+ components
- Backend de-hardcoding in email templates, AI assistant, account emails
- Legacy hooks delegate to BrandingContext (single source)

### Phase 4: Settings Preview Panel & Discount Analytics (Apr 2026)
- **Settings Preview Panel** — Navbar, Footer, Email, Invoice previews using current form state
- **Discount Analytics Dashboard** at `/admin/discount-analytics`:
  - 6 KPI cards (Total Discounts, Avg %, Discounted Orders, Revenue, Margin Impact, Approval Rate)
  - Discount Trend chart, Discount vs Revenue chart
  - Top Discounted Products chart, Sales Discount Behavior table
  - High Risk Discounts table with Safe/Warning/Critical badges
  - Discount Requests table
  - Date range filter + CSV export
- Backend endpoints: `/api/admin/discount-analytics/kpis`, `/trend`, `/top-products`, `/sales-behavior`, `/high-risk`, `/requests`

## Prioritized Backlog

### P1 (High)
- Wire up Twilio WhatsApp integration (when API keys are provided)
- Auto-warning during discount request approval (show margin impact before approval)
- Admin sidebar navigation cleanup for discount analytics discoverability

### P2 (Medium/Future)
- WhatsApp automation flows
- Email template refinement with uploaded logo images
- Sales Leaderboard / Gamification
- Marketing campaigns + automation
- Mobile-first optimization
- Favicon dynamic loading from settings hub
- CSS custom properties for runtime theme switching
- Margin-risk trend over time analytics
- Admin threshold settings for safe/warning/critical levels
