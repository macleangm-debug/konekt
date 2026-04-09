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
- **Admin Dashboard V2**: 6 KPIs, 4 Snapshot sections, 3 charts (Orders Trend, Revenue Trend, Status Distribution)
- **Customer Dashboard V3**: 4 KPIs, Active Orders, Reminders, Referral Rewards, 2 charts
- **Sales Dashboard V2** (Apr 9, 2026): KPIs (Revenue, Pipeline, Commission), Today's Sales Actions (top priority), Actionable Pipeline (6 clickable stages with values), Commission Summary (Expected/Pending/Paid), CRM, Content to Share, Commission Table, 3 Trend Charts
- **Vendor Dashboard V2** (Apr 9, 2026): KPIs (Active Jobs, Completed, Delayed, Settlements), Work Requiring Action (top priority), Fulfillment Pipeline (7 stages), Recent Assignments (vendor-safe), 2 Trend Charts (Fulfillment Volume, Delivery Performance), Quick Actions
- **Affiliate Dashboard V2** (Apr 9, 2026): KPIs (Total Earned, Pending, Paid Out, Active Promos), Earnings Summary (Expected/Pending/Paid), Referral Tools (promo code + link + copy CTAs), Products to Share (10 products with commission, copy caption, share link), Recent Earnings Table, 2 Trend Charts (Earnings, Conversions)
- **CountryAwarePhoneField**: Standard phone input with flag + country code
- **MobileBottomSheet**: Shared component for mobile selections

## Key API Endpoints
- `GET /api/admin/dashboard/kpis` — Admin dashboard
- `GET /api/dashboard-metrics/customer?user_id=X` — Customer dashboard
- `GET /api/staff/sales-dashboard` — Sales dashboard (extended with commission_summary, pipeline values, charts)
- `GET /api/partner-portal/dashboard` — Vendor dashboard (extended with vendor_kpis, pipeline, work_requiring_action, charts)
- `GET /api/affiliate/earnings-summary` — Affiliate dashboard (extended with earnings breakdown, charts)
- `GET /api/affiliate/product-promotions` — Affiliate products with commissions and share links
- `GET /api/notifications` — User notifications (role-filtered)

## Backlog
- P1: System-wide phone input replacement pass (CountryAwarePhoneField everywhere)
- P1: Notification Preferences (per-user event toggles)
- P2: Discount Analytics Dashboard
- P2: Twilio WhatsApp/SMS integration (blocked on API key)
- P2: Resend email live mode (blocked on API key)
- P2: Mobile-first optimization
- P3: Sales Leaderboard / Gamification (after all dashboards and consistency passes are complete)
