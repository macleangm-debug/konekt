# Konekt B2B E-Commerce Platform — PRD

## Product Vision
B2B e-commerce platform for Konekt (Tanzania) with role-based portals (Admin, Customer, Vendor, Sales), CRM pipeline, marketplace, quoting, ordering, and fulfillment workflows.

## Core Architecture
- **Frontend**: React (Vite/CRA), Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python), MongoDB (Motor async driver)
- **Auth**: JWT-based with role-based access + session validation
- **Payments**: Stripe sandbox integration

## 3 Commercial Lanes
1. **Products** — Office equipment, stationery, PPE, furniture. Request type: `product_bulk`
2. **Promotional Materials** — Branded merchandise, uniforms, signage, print. Request types: `promo_custom`, `promo_sample`
3. **Services** — Installation, branding, cleaning, technical support. Request type: `service_quote`

## System of Record
- Requests = intake (public + in-account)
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
- **3 Commercial Lanes**: Products, Promotional Materials, and Services are never mixed in UI or request payloads

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

### Phase 6 — Deep Implementation (7 Steps)
1. Login/Session Privacy Fix
2. Catalog Taxonomy Admin UI
3. Vendor Capability Assignment
4. Unified Marketplace Filter Rail
5. Service Page Template V2
6. Service Routing Cleanup
7. Draggable CRM Kanban

### Phase 7 — 3 Commercial Lanes (Surgical Patch Pack)
1. `ServiceNavigationDropdownData.js` — Items enriched with `requestType`, `marketplaceTab` metadata
2. `HomeBusinessSolutionsSection.jsx` — 3 lane cards (Products, Promotional Materials, Services) + CTAs
3. `FeaturedMarketplaceSection.jsx` — `getListingMeta()` classifies items into correct lane with badges
4. `QuickRequestForm.jsx` — 2-step flow: lane picker → request type selector
5. `MarketplaceUnifiedPageV3.jsx` — Tab order: Products > Promotional Materials > Services, promo/product filtering
6. `QuoteRequestPage.jsx` — "What do you need?" lane picker, conditional sections, canonical `request_type`
7. `MarketplaceBrowsePageContent.jsx` — Text updated to include "promotional materials"
8. `HomepageV2Content.jsx` — Added HomeBusinessSolutionsSection to landing page

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
- Add "Create Quote" action from CRM drawer (prefill from linked request/contact, preserve traceability)
- Payment Queue Data Enrichment (Customer vs Payer names)
- Shorten Admin Orders table
- Product Delivery Logistics Workflow (Vendor Ready → Sales Picked Up → In Transit → Delivered)
- Hybrid Margin Engine

### P2 — Future
- Admin data entry configuration (TIN, BRN, bank account details)
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
- Iteration 155: 3 Commercial Lanes (Surgical Patches) — 100% Pass (10 features verified)
