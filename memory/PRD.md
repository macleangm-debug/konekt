# Konekt B2B E-Commerce Platform — Product Requirements

## Core Vision
A B2B e-commerce platform with strict role-based views (Customer, Admin, Vendor/Partner, Sales) featuring quote management, payment processing, service task execution, and full operational data integrity.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor async)
- **Auth**: JWT-based custom authentication
- **Payments**: Stripe sandbox integration
- **Background Services**: Sales follow-up automation, weekly digest scheduler, scheduled reports

## Key Technical Principles
- **Strict Payer/Customer Separation**: `customer_name` from account records ONLY, `payer_name` from payment proof ONLY.
- **Partner Data Access Control**: Service partners NEVER see client identity. Only logistics/distributor partners see delivery details.
- **Category-Aware Pricing Engine**: Partner cost -> Category margin rules (individual > default > global fallback) -> Selling price.
- **Automated Partner Assignment**: Auto-assigns by service_key capability or category fallback. Alerts on failure.
- **No Empty Tables**: Every table shows complete data or proper empty states.

## What's Been Implemented

### Core Operations (DONE)
- Stripe sandbox payment integration
- CRM Quote Builder Drawer
- Full System Wiring Audit (zero blank cells)
- Partner Data Access Control
- Quote <-> Service Task Auto-Linking
- Automated Partner Assignment & Unassigned Tasks Alert System
- Global Readability Hardening (typography, contrast)

### Vendor Product Upload + Admin Approval (DONE — April 10, 2026)
- Vendor product submission via `/api/vendor/catalog/submissions`
- Admin review page at `/admin/product-approvals` with summary cards, filter tabs, search
- Individual approve/reject with confirmation modals
- Bulk approve/reject with checkbox selection
- Nested format normalization (product.product_name, supply.base_price_vat_inclusive -> flat)
- Vendor notification on approve/reject
- Approved products created in catalog with proper metadata

### Logistics Partner UI Extensions (DONE — April 10, 2026)
- PartnerLayout detects logistics/distributor/delivery partner types
- Simplified nav for logistics: Dashboard, Delivery Operations, Orders, Settlements
- Delivery-specific KPIs: Assigned, In Transit, Delivered, Delayed, Completed
- Delivery columns in table: Recipient, Delivery Area
- Adaptive page header: "Delivery Operations" vs "Assigned Work"
- Role-safe data access enforced (only logistics see client details)

### Category-Based Margin Rules (DONE — April 10, 2026)
- Extended pricing engine with `_get_margin_rules(category)` — category-specific > default > global
- Admin CRUD: GET/PUT/DELETE `/api/admin/category-margin-rules/category/{key}`
- Preview endpoint: POST `/api/admin/category-margin-rules/preview`
- Rule profiles: min_margin_pct, target_margin_pct, max_discount_pct, negotiation_allowed
- Seeded: printing=35%, logistics=20%, consulting=40%, default=30%
- Audit trail: margin_rule_source stored on each task

### Sales Follow-Up Automation (DONE — April 10, 2026)
- Background service running every hour
- Detects: overdue follow-ups, stale leads, quotes awaiting response, deals awaiting payment
- Configurable thresholds via CRM settings
- Deduplication: same alert not re-sent within 24h
- Creates notifications for sales reps and admins

### Weekly Operations Digest (DONE — April 10, 2026)
- Background scheduler (Monday 6-10AM UTC)
- Sections: Task Pipeline, Partner Performance, Revenue Flow, Alerts
- Admin preview: GET `/api/admin/digest/preview`
- Manual trigger: POST `/api/admin/digest/deliver`
- In-app notification delivery (email-ready structure for Resend later)

### Final Wiring/Table Audit (DONE — April 10, 2026)
- All dashboard empty states hardened (text-slate-400→500, proper messages)
- Table headers darkened across 20+ admin pages
- StatusBadge, PaymentStatusBadge font weights strengthened
- StandardSummaryCardsRow labels hardened

## Backlog (Prioritized)

### P2
- Admin data entry config (system logo, TIN, BRN, bank details)
- Instant Quote Estimation UI

### HOLD
- Product Delivery Workflow (full logistics status chain)
- Hybrid Margin Engine (advanced tiered pricing)

### Future
- Twilio WhatsApp integration (blocked on API key)
- Resend email integration (blocked on API key)
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization
- Trend comparison in weekly digest (vs last week)
- Partner ranking over time

## Key API Endpoints
- `POST /api/admin/service-tasks` — Create task (auto-assigns)
- `POST /api/admin/service-tasks/from-quote-line` — Create from quote
- `GET /api/admin/vendor-submissions` — Admin review submissions
- `POST /api/admin/vendor-submissions/bulk-approve` — Bulk approve
- `GET /api/admin/category-margin-rules` — Category margin rules
- `POST /api/admin/category-margin-rules/preview` — Preview margin calc
- `GET /api/admin/digest/preview` — Weekly digest preview
- `POST /api/admin/digest/deliver` — Manual digest trigger

## Test Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Partner: `demo.partner@konekt.com` / `Partner123!`
