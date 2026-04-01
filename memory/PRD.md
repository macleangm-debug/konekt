# Konekt B2B E-Commerce Platform — PRD

## Product Vision
B2B e-commerce platform for Konekt (Tanzania) with role-based portals (Admin, Customer, Vendor, Sales), CRM pipeline, marketplace, quoting, ordering, and fulfillment workflows.

## Core Architecture
- **Frontend**: React (CRA), Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python), MongoDB (Motor async driver)
- **Auth**: JWT-based with role-based access + session validation
- **Payments**: Stripe sandbox integration

## 3 Commercial Lanes
1. **Products** — Request type: `product_bulk`
2. **Promotional Materials** — Request types: `promo_custom`, `promo_sample`
3. **Services** — Request type: `service_quote`
4. **Fallback** — `contact_general`

---

## Completed Work

### Phases 1-8 — Core through E2E UAT
- Full platform: Login, Dashboard, Orders, Quotes, Invoices, Customers, Products, CRM, Marketplace

### Phase 9 — Pack 1: Service & Promo Experience Fix
- 21 services with full static content fallback
- PromoMultiBlankBuilder, CantFindWhatYouNeedBanner

### Phase 10 — Pack 4: Finance + Vendor Scheduling & Assignment
- Payment state persistence, richer drawer
- Vendor ETA input, internal buffer dates, smart vendor assignment engine

### Phase 11 — Pack 2: Customer 360 + Statement of Account
- Profile KPI aggregation, Statement of Account (running balance)
- CustomerDrawer360 with 8 tabs + CustomerProfilePage

### Phase 12 — Pack 3: List Page Standardization + Notifications
- Sidebar notification badges, stat cards for Orders/Payments/Invoices/Deliveries

### Phase 13 — Vendor Margin UX Packs 1-3
- Vendor Admin routes + VendorListPage with supply visibility
- Tiered Margin Engine (5-level hierarchy) + MarginAdminPage
- StandardDrawerShell (navy-tinted blur), StandardSummaryCardsRow
- StatementOfAccountPrintTemplate, QuoteLineDescriptionField

### Phase 14 — P1 Admin + CRM Quote Pack (01 Apr 2026)
**Admin Business Settings (Single Source of Truth)**
- Extended `business_settings_routes.py` with TIN, BRN, VRN, trading_name fields
- Added `/api/admin/business-settings/public` endpoint (no auth) for invoices/quotes/statements
- Auth-protected GET/PUT endpoints for admin-only access
- `AdminBusinessSettingsPage.jsx` — 4 sections: Business Identity, Contact, Banking, Document & Tax
- QuotePreviewPage + InvoicePreviewPage now read from canonical business settings

**CRM "Create Quote" Action**
- "Create Quote" button in CRM lead drawer
- Creates real editable draft via `POST /api/admin/crm-relationships/leads/{lead_id}/create-quote`
- Navigates to `/admin/quotes/{id}` for immediate editing
- Traceability: `source_lead_id`, `created_from_crm: true`

**Quick Price Check Widget**
- `QuickPriceCheckWidget.jsx` on admin dashboard
- Uses existing `POST /api/admin/margins/resolve` (no duplicated logic)
- Shows base price, final price, margin, percentage, and source tier

---

## Key Technical Concepts
- **Business Settings Single Source of Truth:** `business_settings` MongoDB collection is canonical for all document generation (invoices, quotes, statements, public contact).
- **Margin Hierarchy:** product > subcategory > category > group > global default
- **Taxonomy Seeding:** Idempotent, non-destructive
- **Payer/Customer Separation:** customer_name from accounts, payer_name from payment proofs
- **Vendor Privacy:** Vendors see only their vendor_order_no, base_price, work details

## Backlog

### P1 — Upcoming
- End-to-end Stripe test with real test cards
- Quote editor page for editing line items, descriptions, pricing

### P2 — Future
- Send Statement button (email with PDF, blocked on Resend keys)
- Twilio WhatsApp (blocked on keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Mobile-first optimization

---

## Test History
- Iteration 161: Vendor Margin UX Packs 1-3 — 100% Backend / 100% Frontend
- Iteration 162: P1 Admin + CRM Quote Pack — 100% Backend (13/13) / 100% Frontend
