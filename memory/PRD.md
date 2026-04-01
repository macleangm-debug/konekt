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

### Phase 15 — Pack 2 Commercial Workflow (01 Apr 2026)
**Inline Quote Editor**
- `QuoteEditorPage.jsx` — Full editor with customer panel, line items with descriptions (QuoteLineDescriptionField), quantity, unit price, auto-calculated totals
- Pricing summary with adjustable tax rate, discount, and total
- "Save Quote" and "Save & Send" actions
- Route: `/admin/quotes/:id/edit`

**Quote PUT API**
- `PUT /api/admin/quotes-v2/{quote_id}` — Updates line_items, customer info, pricing, notes
- Rejects edits on converted quotes (400)
- Syncs to both canonical and fallback collections

**CRM Enhancements**
- "Create Quote" button creates real draft in MongoDB, navigates to quote preview
- Related quotes in CRM drawer are clickable (navigate to preview)
- Existing quote count shown when quotes linked to lead

**Full Traceability Chain**
- Request → Lead: `source_request_id`, `converted_from_request`
- Lead → Quote: `lead_id`, `created_from_crm`
- Quote → Order: `quote_id`, `quote_number`, `order_type: quote_converted`

**Pack 3 Light Prep**
- Audited notification sources (10+ types across 5 services)
- Mapped assignment hooks (vendor, sales, lead owner)
- Identified KPI card migration opportunities
- Documented in `/app/memory/pack3_operations_audit.md`

---

## Key Technical Concepts
- **Business Settings Single Source of Truth:** `business_settings` MongoDB collection, `/public` endpoint for document generation
- **Margin Hierarchy:** product > subcategory > category > group > global default
- **Traceability Chain:** Request → Lead → Quote → Order with IDs at each link
- **Payer/Customer Separation:** customer_name from accounts, payer_name from payment proofs
- **Vendor Privacy:** Vendors see only their vendor_order_no, base_price, work details

## Backlog

### P1 — Upcoming
- Pack 3 Operations Intelligence (notification registry, KPI card migration, assignment audit trail)
- End-to-end Stripe test with real test cards
- Statement of Account send via email

### P2 — Future
- Twilio WhatsApp notifications (blocked on keys)
- Resend email integration (blocked on keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Mobile-first optimization

---

## Test History
- Iteration 161: Vendor Margin UX Packs 1-3 — 100%
- Iteration 162: P1 Admin + CRM Quote Pack — 100%
- Iteration 163: Pack 2 Commercial Workflow — 100% (19/19 backend + all frontend verified)
