# Konekt B2B E-Commerce Platform — PRD

## Product Vision
B2B e-commerce platform for Konekt (Tanzania) with role-based portals (Admin, Customer, Vendor, Sales), CRM pipeline, marketplace, quoting, ordering, and fulfillment workflows.

## Core Architecture
- **Frontend**: React (Vite/CRA), Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python), MongoDB (Motor async driver)
- **Auth**: JWT-based with role-based access + session validation
- **Payments**: Stripe sandbox integration

## System of Record
- Requests = intake (public)
- CRM = qualification / pipeline
- Quotes = proposals
- Orders = execution

## User Roles
- **Admin** (`/admin`): Full platform management, CRM, orders, finance, partnerships, catalog
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
- Taxonomy filter sidebar (Group > Category > Subcategory)

### Phase 4 — Admin Products & Services + Vendor Submission
- Admin product/service CRUD with taxonomy assignment
- Vendor product submission flow
- Stock management foundations

### Phase 5 — CRM Consolidation & Partnerships Domain
- Sidebar restructured into 6 groups: Sales, Operations, Finance, Catalog, Partnerships, Settings
- CRM tab consolidation: All Leads, Service Leads, Product Leads, Request Conversions, Pipeline, Intelligence
- Service Leads + CRM Intelligence absorbed into CRM tabs
- Partnerships domain created: Affiliates, Referrals (placeholder), Commissions (placeholder)

### Phase 6 — Deep Implementation (Current — 7 Steps)
1. **Login/Session Privacy Fix**: Login CTA routes to `/login`, `ProtectedRouteWithValidation` validates sessions, stale tokens cleared on auth failure
2. **Catalog Taxonomy Admin UI**: `/admin/catalog-taxonomy` with 3 sections (Products, Promotional Materials, Services), CRUD for groups/categories/subcategories
3. **Vendor Capability Assignment**: `/admin/vendor-capabilities` — assign vendor expertise by taxonomy + capability type (products/services/both)
4. **Unified Marketplace Filter Rail**: Inline filters (search + group + category + subcategory + sort) replacing sidebar, 4-card desktop grid, applied to both public and in-account marketplace
5. **Service Page Template V2**: Standardized template with Hero, Overview, What's Included, Who It's For, How It Works, Benefits, FAQ, CTA — all CTAs route to `/request-quote?type=service_quote&service=<slug>`
6. **Service Routing Cleanup**: `DynamicServiceDetailPage` uses `ServicePageTemplateV2` with proper CTA mapping
7. **Draggable CRM Kanban**: HTML5 drag-and-drop on CRM Pipeline tab — drag lead cards between columns to persist status changes via API

---

## Current Sidebar Structure
```
Sales: CRM, Quotes, Customers
Operations: Orders, Requests Inbox, Deliveries
Finance: Payments Queue, Invoices
Catalog: Products & Services, Catalog Taxonomy, Vendor Capabilities
Partnerships: Affiliates, Referrals, Commissions
Settings: Business Settings, Users, Help
```

---

## Backlog

### P1 — Next Up
- Add "Create Quote" action from CRM drawer (prefill from linked request/contact)

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
- Iteration 153: CRM Consolidation & Partnerships — 100% Pass
- Iteration 154: Deep Implementation (7 Steps) — 100% Pass (21 features verified)
