# Konekt B2B E-Commerce Platform — Product Requirements

## Core Vision
A B2B e-commerce platform with strict role-based views (Customer, Admin, Vendor/Partner, Sales) featuring quote management, payment processing, service task execution, and full operational data integrity.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor async)
- **Auth**: JWT-based custom authentication
- **Payments**: Stripe sandbox integration

## Key Technical Principles
- **Strict Payer/Customer Separation**: `customer_name` from account/business records ONLY. `payer_name` from payment proof/submission ONLY.
- **Partner Data Access Control**: Service partners NEVER see client identity. Only logistics/distributor/delivery partners see delivery details. Enforced at API level.
- **Quote <-> Service Task Linking**: Service-type quote lines link to service tasks. Partner cost flows through pricing engine -> quote line -> invoice. Partner cost is INTERNAL, customer/invoice sees selling price only.
- **Automated Partner Assignment**: Auto-assigns based on `partner_service_capabilities` (service_key match) or `partners.categories` fallback. Sets `auto_assigned: true/false`. If false, escalates via Unassigned Tasks Alert widget.
- **Unified Service Execution**: Logistics and Service partners use the same pricing engine.
- **Global Confirmation Modal**: Never use `window.confirm`.

## What's Been Implemented

### Core Operations (DONE)
- Stripe sandbox payment integration
- CRM Quote Builder Drawer with auto-calculated margins
- Document Tables standardization (Quotes, Invoices, POs, Delivery Notes)
- Dashboard Empty States, Global Confirmation Modal

### Service Task Execution (DONE)
- Service Task data model and backend APIs
- Partner Assigned Work Page UI with cost input
- Task creation, assignment, cost submission, status updates

### P0 Full Wiring Audit (DONE)
- Payment Queue status normalization, payer/source fields
- Orders payer_name waterfall
- Customer portal enrichment (payment_status_label, fulfillment_status)
- Admin invoices strict payer separation

### P1 Notifications (DONE)
- Payment approved -> /account/orders, rejected -> /account/invoices
- Partner task assigned -> /partner/assigned-work?task={id}
- Partner cost submitted -> admin notification + quote-specific notification
- Overdue cost endpoint (>48h)

### Partner Data Access Control (DONE)
- Backend enforcement via _resolve_partner_type()
- Logistics types see delivery details, service types see null

### Quote <-> Service Task Auto-Linking (DONE)
- POST /api/admin/service-tasks/from-quote-line
- Cost Propagation Pipeline: partner cost -> margin engine -> quote line -> totals
- GET /api/admin/quotes-v2/{quote_id}/linked-tasks

### Automated Partner Assignment & Unassigned Tasks Alert System (DONE — April 10, 2026)
- **_auto_assign_partner**: Matches by service_key in partner_service_capabilities (preferred_routing, priority_rank, quality_score), then falls back to partners.categories. Both success (auto_assigned=true, partner assigned, notification sent) and failure (auto_assigned=false, assignment_failure_reason set, admin alert created) paths verified.
- **Dashboard Widget**: Partner Response Pipeline shows Unassigned (amber), Awaiting (blue), To Review (cyan), Overdue (red pulse) counts. CTA deep-links to /admin/service-tasks?filter=unassigned.
- **Service Tasks Page**: Added Unassigned filter tab with amber styling. Deep link ?filter=unassigned works. Task detail drawer shows auto-assignment success/failure info.
- **Notifications**: unassigned_task_alert for admin, service_task_assigned for partner.
- **Response fix**: create_service_task and from-quote-line endpoints now re-fetch from DB after auto-assignment to return accurate state.

### Global Readability Hardening (DONE — April 10, 2026)
- **Shared Components**: StatusBadge font-medium -> font-semibold, MetricCard label darker (slate-600), StandardDrawerShell subtitle darker (slate-500), PaymentStatusBadge font-medium -> font-semibold, StandardSummaryCardsRow label darker (slate-500).
- **Admin Pages**: All table headers darkened from text-slate-400/500 to text-slate-600 across OrdersPage, PaymentsQueuePage, CRMPageV2, AdminDashboardV2, AdminServiceTasksPage, and 20+ other admin pages.
- **Partner Pages**: VendorDashboardPage KPI labels hardened.
- **Customer Pages**: InvoicesPageV2 labels hardened.
- **Global CSS**: Contextual table header hardening (slate-700, semibold), table cell contrast, badge strengthening, form label/input contrast.

## Backlog (Prioritized)

### P1
- Category-Based Margin Rules
- Logistics partner specific UI extensions

### P2
- Sales follow-up automation
- Admin data entry config (logo, TIN, BRN, bank details)
- Instant Quote Estimation UI

### HOLD
- Product Delivery Logistics Workflow
- Hybrid Margin Engine

### Future
- Twilio WhatsApp / Resend Email (blocked on API keys)
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization

## Key API Endpoints
- `POST /api/admin/service-tasks` — Create task (auto-assigns if no partner_id)
- `POST /api/admin/service-tasks/from-quote-line` — Create task from quote line
- `GET /api/admin/quotes-v2/{quote_id}/linked-tasks` — Linked tasks view
- `PUT /api/partner-portal/assigned-work/{task_id}/submit-cost` — Partner cost + pricing engine + quote propagation
- `GET /api/admin/service-tasks/stats/summary` — Task KPIs (includes unassigned count)
- `GET /api/admin/service-tasks/overdue-costs` — Overdue cost submissions

## Test Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Partner: `demo.partner@konekt.com` / `Partner123!`
