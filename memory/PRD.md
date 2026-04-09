# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) for the Tanzanian market with role-based access (Admin, Customer, Vendor/Partner, Sales, Affiliate), multi-vendor support, procurement infrastructure, and document branding.

## Core Architecture
- **Stack**: React + FastAPI + MongoDB
- **Portals**: Admin (`/admin`), Customer (`/account`), Vendor (`/partner`), Sales (`/staff`), Affiliate (`/partner/affiliate-dashboard`)
- **Auth**: JWT-based with role separation
- **Design Rule**: No new routes unless absolutely necessary — extend existing endpoints

## Completed Features

### Core Platform (Phase A)
- Unified login, role-based routing, admin dashboard, customer marketplace, vendor workspace, sales workspace

### Payment & Approval (Phase B)
- Stripe sandbox, payment proof workflow, automated vendor orders, payment queue with Customer/Payer separation

### Document System (Phase C)
- Canonical HTML-to-PDF (Invoices, Quotes, Delivery Notes, Statements, POs), Connected Triad SVG stamp

### Purchase Orders & Status Propagation (Phase D)
- Multi-vendor POs, role-mapped status propagation, sales override with audit notes

### Status Timeline & UI Audit (Phase E)
- Status Timeline in admin drawer, deep UI audit, status propagation audit

### Notification Center (Phase H)
- Event-triggered in-app notifications, 10 event types, role-based filtering, CTA deep links

### Dashboard & Input Standardization (Current Phase)
- **Admin Dashboard V2**: 6 KPIs, 4 Snapshot sections, 3 charts
- **Customer Dashboard V3**: 4 KPIs, Active Orders, Reminders, Referral, 2 charts
- **Sales Dashboard V2** (Apr 9, 2026): KPIs, Today's Sales Actions, Actionable Pipeline (6 stages with values), Commission Summary (Expected/Pending/Paid), CRM, Content to Share, Commission Table, 3 Trend Charts
- **Vendor Dashboard V2** (Apr 9, 2026): KPIs (Active/Completed/Delayed/Settlements), Work Requiring Action, 7-stage Fulfillment Pipeline, Recent Assignments (vendor-safe), 2 Charts (Fulfillment Volume, Delivery Performance)
- **Affiliate Dashboard V2** (Apr 9, 2026): KPIs (Earned/Pending/Paid/Promos), Earnings Summary, Referral Tools (promo code + link + copy CTAs), Products to Share with commission, Earnings Table, 2 Charts (Earnings, Conversions)
- **CountryAwarePhoneField** (Apr 9, 2026): System-wide canonical phone input. Flag + country code + prefix selector, auto-strip leading zero, helper text, 10 East African countries. Desktop: inline dropdown. Mobile: self-contained bottom sheet. **PhoneNumberField** converted to thin wrapper — all 53 usages now use CountryAwarePhoneField internally. One raw input in AffiliatePayoutsPage fixed.
- **MobileBottomSheet**: Shared component for mobile selections

## Key API Endpoints
- `GET /api/admin/dashboard/kpis` — Admin dashboard
- `GET /api/dashboard-metrics/customer` — Customer dashboard
- `GET /api/staff/sales-dashboard` — Sales dashboard (extended)
- `GET /api/partner-portal/dashboard` — Vendor dashboard (extended)
- `GET /api/affiliate/earnings-summary` — Affiliate dashboard (extended)
- `GET /api/affiliate/product-promotions` — Affiliate products
- `GET /api/notifications` — Notifications

## Backlog
- P1: Notification Preferences (per-user event toggles)
- P2: Discount Analytics Dashboard
- P2: Twilio WhatsApp/SMS integration (blocked on API key)
- P2: Resend email live mode (blocked on API key)
- P2: Mobile-first optimization
- P3: Sales Leaderboard / Gamification
