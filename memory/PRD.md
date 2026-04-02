# Konekt B2B E-Commerce Platform — PRD

## Product Vision
B2B e-commerce platform for Konekt (Tanzania) with role-based portals (Admin, Customer, Vendor, Sales), CRM pipeline, marketplace, quoting, ordering, and fulfillment workflows.

## Core Architecture
- **Frontend**: React (CRA), Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python), MongoDB (Motor async driver)
- **Auth**: JWT-based with role-based access + session validation
- **Payments**: Stripe sandbox integration

---

## Completed Work

### Phases 1-12 — Core through List Page Standardization
- Full platform: Login, Dashboard, Orders, Quotes, Invoices, Customers, Products, CRM, Marketplace
- Customer 360, Statement of Account, Sidebar Notification Badges

### Phase 13 — Vendor Margin UX Packs 1-3
- Vendor Admin routes + VendorListPage with supply visibility
- Tiered Margin Engine (5-level hierarchy) + MarginAdminPage
- StandardDrawerShell, StandardSummaryCardsRow, StatementOfAccountPrintTemplate

### Phase 14 — P1 Admin + CRM Quote Pack
- Admin Business Settings (single source of truth for all documents)
- CRM "Create Quote" action in lead drawer
- Quick Price Check widget on admin dashboard

### Phase 15 — Pack 2 Commercial Workflow
- Inline Quote Editor with line items, descriptions, pricing, tax/discount
- Quote PUT API with sync to both canonical and fallback collections
- CRM enhancements: clickable related quotes, existing quote count
- Full traceability: Request → Lead → Quote → Order

### Phase 16 — Pack 3 Operations Intelligence (01 Apr 2026)
- Notification Registry (centralized badge counts)
- KPI Card Migration (5 pages with StandardSummaryCardsRow)
- Assignment Scoring Service with audit trail
- Statement Email Send (MOCKED - waiting for Resend keys)
- Drawer standardization (navy-tinted blur overlay)

### Phase 17 — Performance & Governance Pack: Phase 1 (01 Apr 2026)
**Sales Performance & Assignment**
- `sales_performance_service.py` — 5-metric scoring (Customer Rating 30%, Conversion Rate 25%, Revenue 20%, Response Speed 15%, Follow-up Compliance 10%)
- `sales_capability_service.py` — lanes, categories, workload limits CRUD
- `sales_assignment_service.py` — ownership continuity gate + weighted scored assignment
- `SalesPerformancePage.jsx` — admin team view with stat cards, table, search, zone filtering
- `PerformanceCell.jsx` + `PerformanceBreakdownDrawer.jsx` — shared clickable cell + breakdown drawer
- Role-safe: sales see only own score (no tip field in breakdown)

### Phase 18 — Performance & Governance Pack: Phase 2 (02 Apr 2026)
**Vendor Performance & Assignment Intelligence**
- `vendor_performance_service.py` — 5-metric scoring from real vendor_orders data:
  - Timeliness 25% (ETA vs actual completion)
  - Quality 25% (completion rate, issue/return rate)
  - Responsiveness 20% (assignment to first action)
  - Internal Rating 20% (anonymous reviewer scores)
  - Process Compliance 10% (ETA set, notes, proper status flow)
- `vendor_performance_routes.py`:
  - `GET /api/admin/vendor-performance/team` — admin sees all vendor scores
  - `GET /api/admin/vendor-performance/team/{vendorId}` — admin full breakdown
  - `GET /api/vendor/my-performance` — vendor self-view (role-safe)
- Admin Vendor List: Performance column added (clickable, opens breakdown drawer)
- `VendorMyPerformancePage.jsx` — vendor self-view with score card, breakdown bars, improvement tips, last updated
- Sidebar: "My Performance" link added to vendor navigation
- **Strict visibility**: Customer cannot access vendor performance (403/401 enforced)

---

## Key Technical Concepts
- **Ownership Continuity Gate**: If a client/company already has an assigned owner, new requests route to that owner. Only score/assign when no owner exists.
- **Role-Safe Visibility**: Sales see only own score; Vendors see only own score; Admin sees all. Raw rater identity is anonymous.
- **Centralized Notification Registry**: Single `/api/admin/notifications/summary` endpoint for all sidebar badges.
- **Business Settings Single Source of Truth**: `business_settings` collection + `/public` endpoint for document generation
- **Margin Hierarchy**: product > subcategory > category > group > global default
- **Vendor Privacy**: Customers never see vendor scores, names, or internal ratings.

## Backlog

### P0 — Next
- Phase 3: Unified Performance Governance (centralized settings CRUD for thresholds, sample size, recency weighting, trend logic)
- Phase 4: Client Ownership + Routing Control (full ownership model, individual vs corporate, admin reassignment audit)

### P1 — Upcoming
- End-to-end Stripe test with real test cards
- Statement email delivery via Resend (when keys available)

### P2 — Future
- Twilio WhatsApp notifications (blocked on keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Mobile-first optimization

---

## Test History
- Iteration 161: Vendor Margin UX Packs 1-3 — 100%
- Iteration 162: P1 Admin + CRM Quote Pack — 100%
- Iteration 163: Pack 2 Commercial Workflow — 100% (19/19 backend)
- Iteration 164: Pack 3 Operations Intelligence — 100% (20/20 backend + all frontend)
- Iteration 165: Phase 1 Sales Performance & Assignment — 100% (18/18 backend + all frontend)
- Iteration 166: Phase 2 Vendor Performance & Assignment — 100% (10/10 backend + all frontend)
