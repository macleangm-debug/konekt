# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) that is deployable as a single-business-per-deployment model. The application must support dynamic branding, role-based dashboards, multichannel notifications, and a comprehensive admin settings hub — so any business can run their own instance without code changes.

## Architecture
- **Frontend:** React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend:** FastAPI (Python) + MongoDB (Motor async driver)
- **Auth:** JWT-based with role separation (admin, customer, vendor/partner, sales, staff, affiliate)
- **Notifications:** In-App + Resend Email (live) + Twilio WhatsApp (ready)
- **Payments:** Stripe sandbox + Bank transfer proof upload

## Core Concepts
- **Single source of truth for branding:** `admin_settings` collection, key `settings_hub`
- **Public branding endpoint:** `GET /api/public/branding` (no auth) serves safe projection
- **Public payment info:** `GET /api/public/payment-info` (no auth) serves bank details for customers
- **Admin settings hub:** `GET/PUT /api/admin/settings-hub` (admin auth required) manages all config
- **BrandingProvider:** React context fetches branding on mount with fallback values, non-blocking

## What's Been Implemented

### Phase 1: Core Platform (Previous sessions)
- Role-based dashboards (Admin, Customer, Vendor, Sales, Affiliate)
- Product catalog, cart, checkout flow
- Order management with fulfillment tracking
- Invoice generation and payment proof upload
- Vendor order assignment and privacy controls
- Commission and settlement system
- Customer points and referral program

### Phase 2: Communications & Preferences (Previous session)
- CountryAwarePhoneField system-wide
- Notification Preferences UI per user
- Multichannel Notification Dispatch (In-App, Email via Resend, WhatsApp via Twilio)
- Live Resend email integration verified

### Phase 3: Business Settings Hub & Dynamic Branding (Current session - Apr 2026)
- Public branding endpoint (`/api/public/branding`) — safe projection, no auth
- Public payment info endpoint (`/api/public/payment-info`) — bank details for customers
- Admin Settings Hub with auth protection (`/api/admin/settings-hub`)
- BrandingProvider React context — fetches on mount, fallback values, non-blocking
- Frontend de-hardcoding of "Konekt" across 50+ components (Navbar, Footer, Auth pages, Chat widgets, Partner pages, Landing pages, Public sections)
- Backend de-hardcoding of "Konekt" in email templates, AI assistant, account creation emails
- Legacy `useBrandingSettings` hook now delegates to BrandingContext (single source)
- `branding_settings_routes.py` now reads from Settings Hub as canonical source

## Prioritized Backlog

### P0 (Critical)
- All P0 items completed

### P1 (High)
- Discount Analytics Dashboard
- Wire up Twilio WhatsApp integration (when API keys are provided)
- Remaining "Konekt" references in admin document templates (VendorPartnerPresentation)

### P2 (Medium/Future)
- WhatsApp automation flows
- Email template refinement with logo images
- Sales Leaderboard / Gamification
- Marketing campaigns + automation
- Mobile-first optimization
- Favicon dynamic loading from settings hub
- CSS custom properties from branding colors (runtime theme switching)
