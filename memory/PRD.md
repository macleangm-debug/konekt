# Konekt B2B E-Commerce Platform — PRD

## Product Vision
B2B e-commerce platform for Konekt (Tanzania) with role-based portals (Admin, Customer, Vendor, Sales), CRM pipeline, marketplace, quoting, ordering, and fulfillment workflows.

## Core Architecture
- **Frontend**: React (Vite/CRA), Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python), MongoDB (Motor async driver)
- **Auth**: JWT-based with role-based access
- **Payments**: Stripe sandbox integration

## System of Record
- Requests = intake (public)
- CRM = qualification / pipeline
- Quotes = proposals
- Orders = execution

## User Roles
- **Admin** (`/admin`): Full platform management, CRM, orders, finance, partnerships
- **Customer** (`/account`): Browse marketplace, submit requests, view orders/invoices
- **Vendor/Partner** (`/partner`): Manage assigned vendor orders, update fulfillment
- **Sales/Staff** (`/staff`): CRM pipeline work, request handling, delivery coordination

## Key Domain Separations
- **Customer vs Payer**: `customer_name` from business records, `payer_name` from payment proof — never cross-reference
- **Vendor Privacy**: Vendors see only their order, base price, Konekt sales contact — no customer identity, no margins
- **Direct Sales vs Partnerships**: CRM handles direct sales pipeline; Partnerships handles affiliate/referral/commission channels

---

## Completed Work

### Phase 1 — Core Platform Stabilization
- Unified `/login` with role-based routing
- JWT auth with admin seeding
- Dashboard, Orders, Quotes, Invoices, Customers, Products modules
- Role-based sidebar with moduleKey filtering

### Phase 2 — CRM/Inbox Fixes
- Convert-to-lead from Requests Inbox writes to `crm_leads`
- CRM drawer pattern (view lead, add note, schedule follow-up, update stage)
- "Open in CRM" action from requests

### Phase 3 — Marketplace + Service UX
- Unified `/api/products/search` API for marketplace
- Removal of inline forms on service pages
- Dual guest/logged-in cart logic
- Market selector top nav integration
- Taxonomy filter sidebar (Group → Category → Subcategory)

### Phase 4 — Admin Products & Services + Vendor Submission
- Admin product/service CRUD with taxonomy assignment
- Vendor product submission flow
- Stock management foundations

### Phase 5 — CRM Consolidation & Partnerships Domain (Current)
- **Sidebar Restructure**: 6 clean groups — Sales, Operations, Finance, Catalog, Partnerships, Settings
- **CRM Tab Consolidation**: Unified CRM page with 6 tabs (All Leads, Service Leads, Product Leads, Request Conversions, Pipeline, Intelligence)
- **Service Leads absorbed into CRM**: No longer a standalone sidebar item
- **CRM Intelligence absorbed into CRM**: No longer a standalone sidebar item
- **Partnerships Domain**: New sidebar group with Affiliates (active), Referrals (placeholder), Commissions (placeholder)
- **Duplicate cleanup**: Removed duplicate Products nav, Stock Items from sidebar
- **Backend**: `/api/partnerships/summary` API endpoint

---

## Backlog

### P1 — Next Up
- Add "Create Quote" action from CRM drawer (prefill from linked request/contact, preserve traceability)

### P2 — Future
- Twilio WhatsApp integration (blocked on API key)
- Resend email integration (blocked on API key)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization

---

## Test History
- Iteration 150: Phase 2 — 100% Pass
- Iteration 151: Phase 3 — 100% Pass
- Iteration 152: Market/Taxonomy — 100% Pass
- Iteration 153: CRM Consolidation & Partnerships — 100% Pass (17/17 features verified)
