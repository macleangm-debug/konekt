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
**Notification Registry (Centralized)**
- `notification_registry_service.py` — single MongoDB query source for all badge counts
- `GET /api/admin/notifications/summary` — structured summary with `new_count`, `action_required_count`, `badge_count`, `badge_type` per section (6 sections)
- `GET /api/admin/sidebar-counts` — flattened view from same registry (no duplicate logic)
- Sidebar badges now consume centralized endpoint exclusively

**KPI Card Migration (5 pages)**
- Orders: 5 cards (Total, New, Assigned, In Progress, Completed) — click-to-filter
- Customers: 6 cards (Total, Active, At Risk, Inactive, Unpaid Invoices, Active Orders) — click-to-filter
- Payments Queue: 4 cards (Total, Pending, Approved, Rejected) — click-to-filter
- Invoices: 6 cards (Total, Draft, Sent, Paid, Overdue, Unpaid)
- Deliveries: 5 cards (Total, Issued, In Transit, Delivered, Cancelled)
- All use `StandardSummaryCardsRow` component with consistent accent colors

**Assignment Scoring Service**
- `assignment_scoring_service.py` — weighted scoring (capability_match 50%, availability 30%, turnaround 10%, workload 10%)
- `log_assignment_decision()` — audit trail with candidate list, winning score, override_by, timestamp
- Preserves manual override with logged rationale

**Statement Email Send**
- `POST /api/admin/customers/{id}/send-statement` — builds real statement from customer's orders/invoices
- MOCKED email delivery (ready for Resend integration)
- Logs to `statement_delivery_log` collection with full statement summary
- `SendStatementButton` component in customer drawer (compact style) + toast feedback

**Drawer Standardization**
- Navy-tinted blur overlay (`bg-[#20364D]/30 backdrop-blur-[3px]`) on all admin drawers
- Invoices page drawer updated to match standard

---

## Key Technical Concepts
- **Centralized Notification Registry:** Single `/api/admin/notifications/summary` endpoint is the source of truth for all sidebar badge counts. No duplicate count logic in layout components.
- **Business Settings Single Source of Truth:** `business_settings` collection + `/public` endpoint for document generation
- **Margin Hierarchy:** product > subcategory > category > group > global default
- **Assignment Audit Trail:** Every assignment logs candidate list, scores, selection, and manual override
- **Traceability Chain:** Request → Lead → Quote → Order with IDs at each link

## Backlog

### P1 — Upcoming
- End-to-end Stripe test with real test cards
- Statement email delivery via Resend (when keys available)
- Assignment scoring integration with vendor smart assignment UI

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
- Iteration 164: Pack 3 Operations Intelligence — 100% (20/20 backend + all frontend verified)
