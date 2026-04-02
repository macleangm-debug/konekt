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

### Phases 1-16 — Core through Operations Intelligence
- Full platform: Login, Dashboard, Orders, Quotes, Invoices, Customers, Products, CRM, Marketplace
- Vendor Margin Engine, StandardDrawerShell, Notification Registry, KPI Cards
- Stripe Sandbox, Business Settings, Inline Quote Editor, Commercial Workflow

### Phase 17 — Sales Performance & Assignment (01 Apr 2026)
- 5-metric scoring engine, capability CRUD, ownership-aware auto-assignment
- SalesPerformancePage with team view, PerformanceCell, PerformanceBreakdownDrawer

### Phase 18 — Vendor Performance & Assignment (02 Apr 2026)
- 5-metric vendor scoring from real vendor_orders data
- Admin vendor list Performance column + breakdown drawer
- Vendor self-view page (My Performance) with KPI cards + improvement tips
- Customer access blocked (403/401)

### Phase 19 — Unified Performance Governance (02 Apr 2026)
- Centralized settings CRUD for weights, thresholds, min sample size
- Both scoring services read from `performance_governance` collection
- Admin config page with dual-pane Sales/Vendor weight sliders
- Audit log tracking all settings changes

### Phase 20 — Client Ownership + Routing Control: Steps 1-5 (02 Apr 2026)
**Data Model:**
- `companies` collection (id, name, normalized_name, domain, owner_sales_id, industry, client_type="company")
- `contacts` collection (id, name, email, phone, company_id, position, client_type="contact")
- `individual_clients` collection (id, name, email, phone, owner_sales_id, client_type="individual")

**Ownership Routing Engine (`ownership_routing_service.py`):**
- Centralized `resolve_owner()` called by ALL inbound creation paths
- Resolution priority: exact company_id > contact email > individual email > phone > domain match > company name match > auto-assign
- Name normalization (strips Ltd/Limited/Inc/Corp)
- Free email domain filtering (gmail/yahoo/hotmail not used for corporate matching)
- Duplicate prevention (auto-links contacts instead of creating duplicates)

**Routing Integration:**
- CRM lead creation → ownership routing injected
- Request creation → ownership routing injected
- Public request intake → ownership routing injected
- Sales lead creation → ownership routing injected

**Sales Visibility Enforcement:**
- Leads: non-admin sees only assigned_to=self
- Requests: non-admin sees only sales_owner_id/assigned_sales_owner_id=self

**Admin Reassignment Tool (`/admin/client-reassignment`):**
- Search across companies, contacts, individuals
- View current owner, select new owner, enter reason
- Full audit logging (entity, previous_owner, new_owner, reason, changed_by, timestamp)
- Reassignment History table with all audit entries
- Stats cards (companies, contacts, individuals, reassignments, unowned)

---

## Key Technical Concepts
- **Ownership Continuity Gate**: Existing company/individual → keep owner. Only auto-assign for new entities.
- **Mandatory Routing Service**: ALL inbound creation paths must call `resolve_owner()`. No bypass allowed.
- **Role-Safe Visibility**: Sales see own data only. Admin sees all. Customer sees none of internal routing/ownership.
- **Centralized Performance Governance**: Single collection drives weights/thresholds for all scoring.
- **Company Name Normalization**: Strips suffixes, lowercases, removes punctuation for matching.
- **Free Email Exclusion**: Gmail/Yahoo/Hotmail domains not used for corporate domain matching.

## Backlog

### P0 — Next
- Phase 4 Steps 6-8: Edge cases (duplicate prevention, name mismatch, email domain edge cases), UI behavior enforcement, performance integration with owned portfolio

### P1 — Upcoming
- End-to-end Stripe test with real test cards
- Statement email delivery via Resend (when keys available)

### P2 — Future
- Twilio WhatsApp notifications (blocked on keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Mobile-first optimization
- Portfolio + Reactivation Engine

---

## Test History
- Iteration 165: Phase 1 Sales Performance — 100%
- Iteration 166: Phase 2 Vendor Performance — 100%
- Iteration 167: Phase 3 Unified Governance — 100%
- Iteration 168: Phase 4 Client Ownership Steps 1-5 — 100% (17/17 backend + all frontend)
