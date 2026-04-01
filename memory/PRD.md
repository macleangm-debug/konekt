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

### Phase 11 — Pack 2: Customer 360 + Statement of Account (01 Apr 2026)
- Profile KPI aggregation, Statement of Account (running balance)
- CustomerDrawer360 with 8 tabs + CustomerProfilePage

### Phase 12 — Pack 3: List Page Standardization + Notifications (01 Apr 2026)
- Sidebar notification badges, stat cards for Orders/Payments/Invoices/Deliveries

### Vendor Partner Presentation — Documents Page (01 Apr 2026)
- 8-slide print-ready vendor/partner presentation deck

### Phase 13 — Vendor Margin UX Packs 1-3 (01 Apr 2026)
**Pack 1: Vendor + Supply + Catalog Foundation**
- `taxonomy_seed_service.py` with idempotent seeding
- `vendors_admin_routes.py` — full CRUD, supply records, taxonomy listing
- `VendorListPage.jsx` — stat cards, searchable table, vendor drawer with supply records
- Sidebar: Vendors entry under Catalog section

**Pack 2: Margin Engine + Pricing Automation**
- `tiered_margin_engine.py` — 5-level hierarchy (product > subcategory > category > group > global)
- `margin_admin_routes.py` — global tier CRUD, pricing resolution, preview
- `MarginAdminPage.jsx` — view/edit tiers, test pricing resolution, sample preview table
- `QuoteLineDescriptionField.jsx` — auto-expanding textarea for quote line items
- Sidebar: Margins entry under Catalog section

**Pack 3: UX + Standardization + Control Layer**
- `StandardDrawerShell.jsx` — reusable drawer with navy-tinted blur overlay
- `StandardSummaryCardsRow.jsx` — reusable stat cards with icon, accent, click filter
- `StatementOfAccountPrintTemplate.jsx` — branded print layout with header, entries, bank details
- `DetailDrawer.jsx` updated — navy-tinted blur (bg-[#20364D]/30 backdrop-blur-[3px])
- Navy-tinted overlay applied to: Orders, Payments, Quotes, Requests Inbox, Customers, Vendors
- Sidebar badge counts already action/state-based (not view-based)

---

## Key Technical Concepts
- **Margin Hierarchy:** product > subcategory > category > group > global default
- **Taxonomy Seeding:** Idempotent, non-destructive, never overwrites admin edits
- **Payer/Customer Separation:** customer_name from accounts, payer_name from payment proofs
- **Vendor Privacy:** Vendors see only their vendor_order_no, base_price, work details

## Backlog

### P1 — Upcoming
- Create Quote action from CRM drawer
- Admin data entry configuration (TIN, BRN, bank account details)
- End-to-end Stripe test with real test cards

### P2 — Future
- Send Statement button (email with PDF, blocked on Resend keys)
- Twilio WhatsApp (blocked on keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Mobile-first optimization

---

## Test History
- Iteration 155-158: Packs 1, 4 — 100% Pass
- Iteration 159: Pack 2 Customer 360 — 92% Backend / 100% Frontend
- Iteration 160: Pack 3 List Page Standardization — 100% Pass
- Iteration 161: Vendor Margin UX Packs 1-3 — 100% Backend (13/13) / 100% Frontend
