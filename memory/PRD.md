# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform with role-based access (Admin, Customer, Vendor, Sales), CRM pipeline management, payment processing, quote generation, and operational workflows.

## Core Architecture
- **Frontend:** React (CRA) + TailwindCSS + Shadcn/UI
- **Backend:** FastAPI + MongoDB
- **Auth:** JWT-based with role-based routing
- **Payments:** Stripe sandbox integration

## What's Been Implemented

### Phase 1 — Platform Foundation (Complete)
- Multi-role authentication (Admin, Customer, Vendor, Sales)
- Product catalog with categories
- Order management with payment proofs
- Stripe sandbox payment gateway
- Vendor order generation on payment approval
- Strict payer/customer separation

### Phase 2 — CRM & Pipeline Intelligence (Complete)
- CRM lead management with pipeline stages
- Quote Request Flow (pre-filled service context, 3-step form)
- Payment Review Drawer (inline proof previews)
- Pipeline Intelligence Layer (auto-stage movement, stale deal detection, conversion metrics)

### Phase 3 — P0 Core Operations (Complete — Apr 10, 2026)
- **CRM Create Quote Drawer**: Guided quote creation with catalog product search, service type selection, effective_cost = negotiated_cost || base_price, 30% margin auto-calculation, negotiated cost toggle, item type lock-in (product vs service). Rendered via React Portal to escape Sheet focus trap.
- **Dashboard Empty States**: StaffPerformancePage, SalesPerformancePage, AdminSalesRatingsPage (leaderboard + trend), DormantClientAlertsPage — all show "No data available yet" with icon when empty.
- **Document Tables Standardization**: QuotesRequestsPage, PurchaseOrdersPage, DeliveryNotesPage — all use identical table structure: Document #, Client/Vendor, Date, Amount, Status, Actions.

## Key Technical Decisions
- `effective_cost = negotiated_cost || base_price` — margin calculations use this, not raw base price
- QuoteBuilderDrawer uses `createPortal(document.body)` to escape Shadcn Sheet focus trap
- Sheet drawer closes when QuoteBuilder opens to release focus
- DEFAULT_MARGIN_PCT = 30 (30% markup on effective_cost)
- Admin token stored as `konekt_admin_token` in localStorage

## Prioritized Backlog

### P1 — Growth Layer
- Instant Quote Estimation on CanonicalServicePage (price range before requesting quote)
- Category-Based Margin Rules (target margin, min margin per category)
- Deliveries Logistics Structure (assign logistics handlers/vendors)

### P2 — Future
- AI-assisted auto-generated quotes
- Sales follow-up automation (WhatsApp/Email nudges)
- Twilio WhatsApp integration (blocked on API keys)
- Resend email integration (blocked on API key)
- One-click reorder / Saved Carts
- Advanced Analytics dashboard
- Mobile-first optimization
