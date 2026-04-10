# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform with role-based access (Admin, Customer, Vendor, Sales), CRM pipeline management, payment processing, quote generation, unified service execution, and operational workflows.

## Core Architecture
- **Frontend:** React (CRA) + TailwindCSS + Shadcn/UI
- **Backend:** FastAPI + MongoDB
- **Auth:** JWT-based with role-based routing
- **Payments:** Stripe sandbox integration

## What's Been Implemented

### Phase 1 — Platform Foundation (Complete)
- Multi-role authentication (Admin, Customer, Vendor, Sales, Partner)
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
- **CRM Create Quote Drawer**: Guided quote creation with catalog product search, service type selection, effective_cost = negotiated_cost || base_price, 30% margin auto-calculation, negotiated cost toggle, item type lock-in. Rendered via React Portal.
- **Dashboard Empty States**: StaffPerformance, SalesPerformance, AdminSalesRatings, DormantClientAlerts — all show "No data available yet" with icon when empty.
- **Document Tables Standardization**: QuotesRequestsPage, PurchaseOrdersPage, DeliveryNotesPage — identical structure: Document #, Client/Vendor, Date, Amount, Status, Actions.

### Phase 4 — System Stabilization & Service Execution (Complete — Apr 10, 2026)
- **Global Confirmation Modal Enforcement**: Replaced all 9 `window.confirm()` calls across admin pages with the brand-styled `ConfirmModalContext` (danger/warning/neutral/success tones). Applied to: AdminUsers, AdminProducts, AdminOffers, RoutingRules, CountryPricing, ServiceCatalog, BlankProducts, Suppliers.
- **Service Task Data Model + Backend APIs**: Created `service_tasks` collection with full CRUD. Supports both service partners and logistics partners. Endpoints: create task, list/filter tasks, assign partner, admin status override, partner cost submission (triggers margin engine), partner status update, proof upload, notes, timeline. Partner sees ONLY cost layer — never margin or selling price.
- **Partner "Assigned Work" Page**: Full operational page in partner portal. Features: KPI row (Assigned, Awaiting Cost, In Progress, Completed, Delayed), Work Requiring Action section, main task table (Task Ref, Service Type, Client, Deadline, Status, Actions), task detail drawer with cost input, status update buttons, proof section, notes, and activity timeline.

## Key Technical Decisions
- `effective_cost = negotiated_cost || base_price` — margin calculations use this
- QuoteBuilderDrawer uses `createPortal(document.body)` to escape Shadcn Sheet focus trap
- DEFAULT_MARGIN_PCT = 30 (30% markup on effective_cost)
- Service Tasks use unified model for both service and logistics partners
- Partner endpoints sanitize responses: no margin, no selling_price, no internal pricing
- Global ConfirmModalContext wraps entire app via provider in App.js

## Service Task Data Model
```
service_tasks {
  service_type, service_subtype, description, scope, quantity,
  client_name, client_id, order_ref, quote_id,
  delivery_address, contact_person, contact_phone,
  partner_id, partner_name, assigned_by, assignment_mode,
  partner_cost, cost_notes, cost_submitted_at,
  base_price, negotiated_cost, selling_price, margin_pct, margin_amount,
  status, deadline,
  proof_url, proof_notes, proof_uploaded_at,
  timeline[], notes[],
  created_at, updated_at
}
```

## Prioritized Backlog

### P1 — Integration Layer (Next)
- Quote ↔ Service Task integration (partner cost → margin engine → auto-populate quote line)
- Invoice pulls from quote (selling price, not cost)
- Logistics partner flow (delivery-specific statuses: In Transit, Delivered, etc.)
- Automated partner assignment (Mode 1: direct, Mode 2: cost request/bid)
- Partner matching: service type + region + availability

### P1 — Growth Layer
- Instant Quote Estimation on CanonicalServicePage
- Category-Based Margin Rules (target/min margin per category)
- Deliveries Logistics Structure

### P2 — Standards Enforcement
- Document stamp update to Connected Triad
- Bulk actions / checkbox selection for tables
- CSV/Excel export for payments, orders, reports
- Audit trail enhancement (who/what/when)

### P2 — Future
- AI-assisted auto-generated quotes
- Sales follow-up automation (WhatsApp/Email nudges)
- Twilio WhatsApp integration (blocked on API keys)
- Resend email integration (blocked on API key)
- Advanced Analytics dashboard
- Mobile-first optimization
