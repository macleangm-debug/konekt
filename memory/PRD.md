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
4. **Fallback** — "Other / Not Sure" → `contact_general`

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
- **Customer vs Payer**: `customer_name` from business records, `payer_name` from payment proof
- **Vendor Privacy**: Vendors see only their order, base price, Konekt sales contact
- **3 Commercial Lanes**: Products, Promotional Materials, Services never mixed

## Delivery Status Workflow
- **Vendor controls**: assigned → work_scheduled → in_progress → ready_for_pickup
- **Sales controls**: picked_up → in_transit → delivered → completed
- **Admin**: Can override any status

---

## Completed Work

### Phase 1-6 — Core Platform through Deep Implementation
- Unified login, JWT auth, role-based routing
- Dashboard, Orders, Quotes, Invoices, Customers, Products modules
- CRM consolidation (tabbed views, Kanban board, convert-to-lead)
- Marketplace with taxonomy filter rail
- Vendor submission + capability assignment
- Partnerships domain (Affiliates, Referrals, Commissions)

### Phase 7 — 3 Commercial Lanes (Surgical Patch Pack)
- ServiceNavigationDropdownData enriched with requestType, marketplaceTab
- HomeBusinessSolutionsSection with 3 lane cards
- FeaturedMarketplaceSection with getListingMeta() lane classification
- QuickRequestForm with 2-step lane-first flow
- MarketplaceUnifiedPageV3 tabs: Products > Promo > Services
- QuoteRequestPage with "What do you need?" lane picker

### Phase 8 — Full E2E UAT (4 Flows)
- Flow A (Product Order), B (Service Request), C (Promo Custom), D (Promo Sample) — all passed
- Vendor visibility, sales delivery override, CRM flow, identity verification — all verified

### Phase 9 — Pack 1: Service & Promo Experience Fix (COMPLETED)
- **comprehensiveServiceData.js**: 21 service entries with full content (description, includes, for_who, process_steps, why_konekt, faqs)
- **DynamicServiceDetailPage.jsx**: Uses getServiceBySlug() fallback — no more "Service Not Found" for any mapped service
- **MarketplaceUnifiedPageV3.jsx**: Services tab merges API + static data (24 services showing)
- **PromoMultiBlankBuilder.jsx**: Multi-item promo request builder (item name, quantity, print/customization type, notes per item)
- **CantFindWhatYouNeedBanner.jsx**: "Can't find what you're looking for?" banner on service pages, public marketplace, in-account marketplace
- **QuoteRequestPage.jsx**: Added "Other / Not Sure" lane → routes to `contact_general` request type
- All requests land in unified Requests Inbox

---

## Backlog

### P0 — In Progress
- Pack 4: Finance + Vendor Scheduling & Assignment
- Pack 2: Customer 360 + Statement of Account
- Pack 3: List Page Standardization + Notifications

### P1 — Upcoming
- Create Quote action from CRM drawer
- Hybrid Margin Engine

### P2 — Future
- Admin data entry configuration (TIN, BRN, bank)
- Twilio WhatsApp / Resend email (blocked on keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions

---

## Test History
- Iteration 155: 3 Commercial Lanes — 100% Pass
- Iteration 156: Full E2E UAT (4 Flows) — 100% Pass (29 tests)
- Iteration 157: Pack 1 Service & Promo Fix — 100% Pass (15 backend + all frontend)
