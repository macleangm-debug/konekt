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

### Phase 17 — Performance Pack: Phase 1 — Sales Performance (01 Apr 2026)
- `sales_performance_service.py` — 5-metric scoring (Customer Rating, Conversion, Revenue, Response Speed, Follow-up)
- `sales_capability_service.py` — lanes, categories, workload limits CRUD
- `sales_assignment_service.py` — ownership continuity gate + weighted scored assignment
- `SalesPerformancePage.jsx` — admin team view with stat cards, table, search, zone filtering
- `PerformanceCell.jsx` + `PerformanceBreakdownDrawer.jsx` — shared clickable cell + breakdown drawer
- Role-safe: sales see only own score (no tip field in breakdown)

### Phase 18 — Performance Pack: Phase 2 — Vendor Performance (02 Apr 2026)
- `vendor_performance_service.py` — 5-metric scoring: Timeliness (25%), Quality (25%), Responsiveness (20%), Internal Rating (20%), Process Compliance (10%)
- `vendor_performance_routes.py` — admin team/detail + vendor self-view
- Admin Vendor List: Performance column (clickable → breakdown drawer)
- `VendorMyPerformancePage.jsx` — vendor self-view (standard partner shell layout with KPI stat cards)
- **Strict visibility**: Customer cannot access vendor performance (403/401)

### Phase 19 — Performance Pack: Phase 3 — Unified Governance (02 Apr 2026)
- `performance_governance_service.py` — centralized CRUD for weights, thresholds, min sample size
- `performance_governance_routes.py` — admin-only GET/PUT/audit endpoints
- Both sales and vendor scoring now read from `performance_governance` collection
- `PerformanceGovernancePage.jsx` — admin config page with dual-pane (Sales/Vendor) weight sliders, threshold inputs, min sample
- Audit log with change history tracking
- Save/Reset/last saved timestamp + admin name
- Sidebar: "Performance Settings" link in admin Settings section

**Layout Standardization Rule**: All pages accessible from a sidebar must inherit the same shell for that role — no custom content frames, no shifted widths or card alignments.

---

## Key Technical Concepts
- **Ownership Continuity Gate**: Preserves existing client/company sales owner for new requests
- **Role-Safe Visibility**: Sales see only own score; Vendors see only own; Admin sees all
- **Centralized Notification Registry**: Single endpoint for all sidebar badges
- **Performance Governance**: Single `performance_governance` collection drives weights/thresholds for all scoring
- **Vendor Privacy**: Customers never see vendor scores/names/internal ratings
- **Layout Shell Rule**: Every sidebar page inherits role-specific shell (admin/partner/sales/customer)

## Backlog

### P0 — Next
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
- Iteration 167: Phase 3 Unified Governance + Layout Fix — 100% (13/13 backend + all frontend)
