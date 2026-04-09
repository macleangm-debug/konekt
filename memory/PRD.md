# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) for the Tanzanian market with role-based access (Admin, Customer, Vendor/Partner, Sales), multi-vendor support, procurement infrastructure, and document branding.

## Core Architecture
- **Stack**: React + FastAPI + MongoDB
- **Portals**: Admin (`/admin`), Customer (`/account`), Vendor (`/partner`), Sales (`/staff`)
- **Auth**: JWT-based with role separation

## Completed Features

### Core Platform (Phase A)
- Unified login, role-based routing, admin dashboard, customer marketplace, vendor workspace, sales workspace

### Payment & Approval (Phase B)
- Stripe sandbox, payment proof workflow, automated vendor orders, payment queue with Customer/Payer separation

### Document System (Phase C)
- Canonical HTML-to-PDF (Invoices, Quotes, Delivery Notes, Statements, POs), Connected Triad SVG stamp, Document Preview

### Purchase Orders & Status Propagation (Phase D)
- Multi-vendor POs, role-mapped status propagation, sales override with audit notes

### Status Timeline & UI Audit (Phase E)
- Status Timeline in admin drawer, deep UI audit, status propagation audit

### Notification Center (Phase H)
- Event-triggered in-app notifications, 10 event types, role-based filtering, CTA deep links, enhanced bell components

### Dashboard & Input Standardization (Current Phase)
- **Admin Dashboard V2**: 6 KPI cards, 4 Snapshot sections (Operations, Finance, Commercial, Partners & Team), 3 charts (Orders Trend bar, Revenue Trend line, Status Distribution donut), Recent Orders table, Quick Actions
- **Customer Dashboard V3**: 4 KPI cards (Active Orders, Pending Invoices, Referral Balance, Active Quotes), Active Orders list, Reminders, Referral Rewards, Order History + Spend Trend charts, Quick Actions
- **Sales Dashboard V2** (Apr 9, 2026): Full upgrade with:
  - 4 KPI cards (Today's Revenue, This Month, Open Pipeline, Commission)
  - Today's Sales Actions (top priority, above pipeline): quotes expiring, delayed orders, stale clients (3+ days), promotions ready to share
  - Actionable Pipeline funnel: 6 clickable stages (New → Contacted → Quoted → Approved → Paid → Fulfilled) with count + monetary values
  - Commission Summary cards: Expected / Pending Payout / Paid
  - My Customers CRM sidebar
  - Content to Share (promotion cards, captions, copy CTA, share link)
  - Commission per Order table (order, customer, total, your commission, status)
  - 3 Trend Charts: Pipeline Value (area), Deals Closed (bar), Commission Trend (line)
- **CountryAwarePhoneField**: Flag + country code + prefix selector, auto-strip leading zero, helper text, 10 East African countries
- **MobileBottomSheet**: Shared component for mobile selections (bottom sheet on mobile, dropdown on desktop), slide-up animation

## Key API Endpoints
- `GET /api/admin/dashboard/kpis` — Admin dashboard KPIs, snapshots, charts
- `GET /api/dashboard-metrics/customer?user_id=X` — Customer dashboard with active orders, reminders, referral, charts
- `GET /api/staff/sales-dashboard` — Sales dashboard with KPIs, commission_summary, today_actions, pipeline (with values), charts (pipeline_trend, deals_closed_trend, commission_trend), recent_orders, assigned_customers
- `GET /api/notifications` — User notifications (role-filtered)
- `POST /api/admin/payments/{id}/approve` — Payment approval
- `GET /api/admin/orders-ops` — Admin orders
- `GET /api/customer/orders` — Customer orders (status-mapped)
- `GET /api/vendor/orders` — Vendor orders (privacy-filtered)
- `GET /api/staff/content-feed` — Sales content feed for promotions

## Backlog
- P0: Vendor Dashboard upgrade (fulfillment workload, charts)
- P0: Affiliate Dashboard upgrade (earnings/motivation, charts)
- P1: System-wide phone input replacement pass
- P1: Notification Preferences (per-user event toggles)
- P1: Phase G: Discount Analytics Dashboard
- P2: Twilio WhatsApp/SMS integration (blocked on API key)
- P2: Resend email live mode (blocked on API key)
- P2: Mobile-first optimization
