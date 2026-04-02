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

### Phase 19 — Unified Performance Governance (02 Apr 2026)
- Centralized settings CRUD for weights, thresholds, min sample size
- Both scoring services read from `performance_governance` collection
- Admin config page with dual-pane weight sliders + audit log

### Phase 20 — Client Ownership + Routing Control (02 Apr 2026) ✅ COMPLETE
**Data Model (Step 1):**
- `companies` (id, name, normalized_name, domain, owner_sales_id, industry, client_type, status)
- `contacts` (id, name, email, phone, company_id, position, client_type, status)
- `individual_clients` (id, name, email, phone, owner_sales_id, client_type, status)

**Ownership Routing Engine (Step 2):**
- Centralized `resolve_owner()` — mandatory service for all inbound creation
- Resolution priority: exact company_id → contact email → individual email → phone → domain match → company name match → auto-assign
- Name normalization (strips 16 suffixes), free email domain exclusion (14 domains)

**Routing Integration (Step 3):**
- CRM lead creation, request creation, public request intake, sales lead creation → all call resolve_owner()

**Sales Visibility Enforcement (Step 4):**
- Leads: non-admin sees only assigned_to=self
- Requests: non-admin sees only owned requests

**Admin Reassignment Tool (Step 5):**
- `/admin/client-reassignment` with search, current owner display, new owner select, reason input
- Full audit logging, reassignment history table, stats cards

**Edge Cases (Step 6):**
- Duplicate company prevention by domain AND normalized name
- Duplicate individual prevention by email AND phone
- Pre-creation `check-duplicate` endpoint
- Contact auto-linking to existing company (no duplicate company creation)

**UI Behavior Enforcement (Step 7):**
- Customer order response strips: assigned_sales_owner_id, ownership_company_id, ownership_individual_id, ownership_resolution, sales_owner_id, assigned_sales_id
- Customer 403 on all client-ownership endpoints
- Vendor 403 on admin endpoints

**Performance Integration (Step 8):**
- Sales performance now includes portfolio data (owned_companies, owned_individuals)
- Performance tied to owned portfolio via ownership_routing

---

## Key Technical Concepts
- **Ownership Continuity Gate**: Existing entity → keep owner. Only auto-assign for new entities.
- **Mandatory Routing Service**: ALL inbound creation paths must call resolve_owner(). No bypass.
- **Role-Safe Visibility**: Sales see own data only. Admin sees all. Customer sees zero internal data.
- **Performance Governance**: Single collection drives weights/thresholds for all scoring.
- **Duplicate Prevention**: Domain match, name normalization, email/phone matching before creation.

## Backlog

### P1 — Upcoming
- Phase 5: Portfolio + Reactivation Engine (user to define scope)
- End-to-end Stripe test with real test cards
- Statement email delivery via Resend (when keys available)

### P2 — Future
- Twilio WhatsApp notifications (blocked on keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Mobile-first optimization
- Territory scaling, enterprise sales workflows

---

## Test History
- Iteration 165: Phase 1 Sales Performance — 100%
- Iteration 166: Phase 2 Vendor Performance — 100%
- Iteration 167: Phase 3 Unified Governance — 100%
- Iteration 168: Phase 4 Steps 1-5 — 100% (17/17)
- Iteration 169: Phase 4 Steps 6-8 — 100% (22/22)
