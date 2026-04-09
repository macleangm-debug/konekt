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
- Stripe sandbox, payment proof workflow, automated vendor orders, payment queue

### Document System (Phase C)
- Canonical HTML-to-PDF, Connected Triad SVG stamp

### Purchase Orders & Status Propagation (Phase D)
- Multi-vendor POs, role-mapped status propagation, sales override with audit notes

### Status Timeline & UI Audit (Phase E)
- Status Timeline in admin drawer, deep UI audit

### Notification Center (Phase H)
- Event-triggered in-app notifications, 10 event types, role-based filtering, CTA deep links

### Dashboard & Input Standardization (Current Phase)
- **Admin Dashboard V2**: 6 KPIs, 4 Snapshots, 3 charts
- **Customer Dashboard V3**: 4 KPIs, Active Orders, Reminders, Referral, 2 charts
- **Sales Dashboard V2**: KPIs, Today's Sales Actions, Pipeline, Commission Summary/Table, CRM, Content, 3 Charts
- **Vendor Dashboard V2**: KPIs, Work Requiring Action, 7-stage Pipeline, Assignments, 2 Charts
- **Affiliate Dashboard V2**: KPIs, Earnings Summary, Referral Tools, Products to Share, Earnings Table, 2 Charts
- **CountryAwarePhoneField**: System-wide canonical phone input (53 instances upgraded)
- **MobileBottomSheet**: Shared mobile selection component

### Notification Preferences + Multi-Channel (Apr 9, 2026)
- **Per-user preferences**: Per event type, per channel (in_app, email, whatsapp)
- **Role-based defaults**: Customer (6 events), Sales (2), Vendor (1), Affiliate (2), Admin (2)
- **Event groups**: Order Updates, Payments, Alerts, Assignments, Earnings, Approvals
- **Multi-channel dispatch service**: Checks user preferences → dispatches to in_app + email (Resend) + WhatsApp (Twilio)
- **Email delivery**: Branded HTML templates via Resend (ready, needs RESEND_API_KEY + RESEND_FROM_EMAIL)
- **WhatsApp delivery**: Clean messages via Twilio (ready, needs TWILIO_ACCOUNT_SID + AUTH_TOKEN + WHATSAPP_FROM)
- **Preferences UI**: Reusable `NotificationPreferencesSection` embedded in Customer My Account, Vendor Dashboard, Admin Notification Settings
- **Channel availability**: Shows configured/not-configured status per channel
- **Dispatch logging**: All notification dispatches logged to `notification_dispatch_logs`
- **Safe fallback**: Missing API keys → graceful skip (no crashes)
- Extended existing `/api/notifications` routes only — no new routes

## Key API Endpoints
- `GET /api/notifications/preferences` — User's notification preferences (role-based defaults)
- `PUT /api/notifications/preferences` — Update preferences per event/channel
- `GET /api/staff/sales-dashboard` — Sales dashboard
- `GET /api/partner-portal/dashboard` — Vendor dashboard
- `GET /api/affiliate/earnings-summary` — Affiliate dashboard

## Backlog
- P1: Discount Analytics Dashboard
- P2: Twilio WhatsApp live activation (needs API keys in .env)
- P2: Resend email live activation (needs API keys in .env)
- P2: Mobile-first optimization
- P3: Sales Leaderboard / Gamification
