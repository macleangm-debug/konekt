# Konekt B2B E-Commerce Platform — Product Requirements

## Core Vision
A B2B e-commerce platform with strict role-based views (Customer, Admin, Vendor/Partner, Sales) featuring quote management, payment processing, service task execution, and full operational data integrity.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor async)
- **Auth**: JWT-based custom authentication
- **Payments**: Stripe sandbox integration

## Key Technical Principles
- **Strict Payer/Customer Separation**: `customer_name` from account/business records ONLY. `payer_name` from payment proof/submission ONLY. Never fallback to each other.
- **Vendor Privacy**: Vendors see only their `vendor_order_no`, base_price, work details, and Konekt Sales Contact. No customer identity or margins.
- **Unified Service Execution**: Logistics and Service partners use the same pricing engine. Mode A (partner inputs cost) or Mode B (sales inputs cost).
- **Global Confirmation Modal**: Never use `window.confirm`. All destructive actions use `useConfirmationModal` hook.

## What's Been Implemented

### Core Operations (DONE)
- Stripe sandbox payment integration
- CRM Quote Builder Drawer with auto-calculated margins
- Document Tables standardization (Quotes, Invoices, POs, Delivery Notes)
- Dashboard Empty States (Team Performance, Leaderboard, Alerts)
- Global Confirmation Modal enforcement (replaced 9 native alerts)

### Service Task Execution — Phase 1 (DONE)
- Service Task data model and backend APIs (`service_task_routes.py`)
- Partner Assigned Work Page UI with cost input
- Task creation, assignment, cost submission, status updates
- KPI dashboard for partners

### P0 Full Wiring Audit (DONE — April 10, 2026)
- **Payment Queue**: Status normalization (`pending`/`pending_verification` → `uploaded`), `payment_proof_id` fallback, `payer_phone`/`payer_email`/`source` wired in table + drawer
- **Admin Orders**: Payer name waterfall (order → invoice → billing.invoice_client_name → proof), `customer_name` never null
- **Customer Orders**: Added `payment_status_label`, `fulfillment_status`, `customer_status` to API response
- **Customer Invoices**: Added `total_amount` guarantee, payer resolution with billing fallback
- **Admin Invoices**: Fixed strict payer separation (no customer_name fallback), enriched detail endpoint

### P1 Notifications (DONE — April 10, 2026)
- **Payment approved** → deep link to `/account/orders` with CTA "Track Order"
- **Payment rejected** → deep link to `/account/invoices` with CTA "Open Invoice"
- **Partner task assigned** → notification with deep link to `/partner/assigned-work?task={id}` with CTA "Submit Cost"
- **Partner cost submitted** → admin notification with deep link to `/admin/service-tasks?task={id}` with CTA "Review Cost"
- **Overdue cost endpoint**: `GET /api/admin/service-tasks/overdue-costs` returns tasks awaiting cost >48h

## Backlog (Prioritized)

### P1
- Quote ↔ Service Task auto-linking
- Automated partner assignment matching rules
- Logistics partner specific UI extensions
- Global Readability Hardening (contrast, font weights, light/dark modes)

### P2
- Category-Based Margin Rules
- Admin data entry config (logo, TIN, BRN, bank details)
- Sales follow-up automation
- Instant Quote Estimation UI

### HOLD (Do Not Start)
- Product Delivery Logistics Workflow (new system, not stabilization)
- Hybrid Margin Engine (new pricing system, risk of breaking flows)

### Future
- Twilio WhatsApp integration (blocked on API keys)
- Resend email integration (blocked on API keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization

## Key API Endpoints
- `GET /api/admin/payments/queue` — Payment queue with enrichment
- `GET /api/admin/orders-ops` — Admin orders with full enrichment
- `GET /api/customer/orders` — Customer orders with status labels
- `GET /api/customer/invoices` — Customer invoices with payer resolution
- `GET /api/admin/service-tasks/stats/summary` — Service task KPIs
- `GET /api/admin/service-tasks/overdue-costs` — Overdue cost submissions
- `POST /api/admin/payments/{id}/approve` — Payment approval (via LiveCommerceService)

## Test Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `demo.customer@konekt.com` / `Demo123!`
- Partner: `demo.partner@konekt.com` / `Partner123!`
