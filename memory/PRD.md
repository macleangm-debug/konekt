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
- **Quote ↔ Service Task Linking**: Service-type quote lines link to service tasks. Partner cost flows through pricing engine → quote line → invoice. Partner cost is INTERNAL, customer/invoice sees selling price only.
- **Unified Service Execution**: Logistics and Service partners use the same pricing engine.
- **Global Confirmation Modal**: Never use `window.confirm`.

## What's Been Implemented

### Core Operations (DONE)
- Stripe sandbox payment integration
- CRM Quote Builder Drawer with auto-calculated margins
- Document Tables standardization (Quotes, Invoices, POs, Delivery Notes)
- Dashboard Empty States, Global Confirmation Modal

### Service Task Execution — Phase 1 (DONE)
- Service Task data model and backend APIs
- Partner Assigned Work Page UI with cost input
- Task creation, assignment, cost submission, status updates

### P0 Full Wiring Audit (DONE — April 10, 2026)
- Payment Queue status normalization, payment_proof_id fallback, payer/source fields
- Orders payer_name waterfall (order → invoice → billing → proof)
- Customer portal enrichment (payment_status_label, fulfillment_status)
- Admin invoices strict payer separation

### P1 Notifications (DONE — April 10, 2026)
- Payment approved → /account/orders, rejected → /account/invoices
- Partner task assigned → /partner/assigned-work?task={id}
- Partner cost submitted → admin notification + quote-specific notification
- Overdue cost endpoint (>48h)

### Partner Data Access Control (DONE — April 10, 2026)
- Backend enforcement via _resolve_partner_type()
- Logistics types see delivery details, service types see null

### Admin Dashboard Widget (DONE — April 10, 2026)
- Partner Response Pipeline widget (Awaiting, Overdue, To Review counts)
- Admin Service Tasks Page with filters, search, detail drawer

### Quote ↔ Service Task Auto-Linking (DONE — April 10, 2026)
- **POST /api/admin/service-tasks/from-quote-line**: Creates task from service-type quote line
  - Validates service/logistics type only
  - Prevents duplicate tasks (409 Conflict)
  - Pre-populates task with quote context (client, delivery, service type)
  - Marks quote line with service_task_id + cost_source=awaiting_partner
- **Cost Propagation Pipeline**: When partner submits cost:
  - Pricing engine runs (platform_settings.commercial_rules.minimum_company_margin_percent)
  - Quote line auto-updated: effective_cost=partner_cost, unit_price=selling_price, total recalculated
  - Quote subtotal/total recalculated
  - Traceability: cost_source=partner_submitted, service_task_id set
  - Admin/sales notified with "Review Quote" CTA
- **GET /api/admin/quotes-v2/{quote_id}/linked-tasks**: Shows task status per quote
- **Frontend**: Quote detail modal shows Type column, Task status column, "Assign Partner" dropdown for unlinked service lines
- **Data Protection**: Partner sees only partner_cost. Invoice uses unit_price (selling price) only.

## Backlog (Prioritized)

### P1
- Automated partner assignment matching rules (service type, region, availability)
- Global Readability Hardening (contrast, font weights, typography)
- Logistics partner specific UI extensions

### P2
- Category-Based Margin Rules
- Admin data entry config (logo, TIN, BRN, bank details)
- Sales follow-up automation
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
- `POST /api/admin/service-tasks/from-quote-line` — Create task from quote line
- `GET /api/admin/quotes-v2/{quote_id}/linked-tasks` — Linked tasks view
- `PUT /api/partner-portal/assigned-work/{task_id}/submit-cost` — Partner cost + pricing engine + quote propagation
- `GET /api/admin/service-tasks/stats/summary` — Task KPIs
- `GET /api/admin/service-tasks/overdue-costs` — Overdue cost submissions

## Test Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `demo.customer@konekt.com` / `Demo123!`
- Partner: `demo.partner@konekt.com` / `Partner123!`
