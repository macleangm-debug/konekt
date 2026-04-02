# Konekt B2B E-Commerce Platform — PRD

## Product Vision
B2B e-commerce platform for Konekt (Tanzania) with role-based portals (Admin, Customer, Vendor, Sales), CRM pipeline, marketplace, quoting, ordering, and fulfillment workflows.

## Core Architecture
- **Frontend**: React (CRA), Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python), MongoDB (Motor async driver)
- **Auth**: JWT-based with role-based access
- **Payments**: Stripe sandbox integration

---

## Completed Work

### Phases 1-16 — Core through Operations Intelligence
Full platform with CRM, Orders, Quotes, Invoices, Vendor Margin Engine, Notification Registry, KPI Cards, Stripe, Business Settings, Commercial Workflow.

### Phase 17 — Sales Performance & Assignment (01 Apr 2026)
5-metric scoring engine, capability CRUD, ownership-aware auto-assignment, SalesPerformancePage.

### Phase 18 — Vendor Performance & Assignment (02 Apr 2026)
5-metric vendor scoring, admin vendor list Performance column, vendor self-view page.

### Phase 19 — Unified Performance Governance (02 Apr 2026)
Centralized settings CRUD for weights/thresholds/min sample, dual-pane admin config page.

### Phase 20 — Client Ownership + Routing Control (02 Apr 2026)
- Companies/Contacts/Individual Clients data model
- Centralized `resolve_owner()` routing engine
- Routing integration into CRM leads, requests, public requests, sales leads
- Sales visibility enforcement
- Admin reassignment tool with audit logging
- Duplicate prevention (domain, name normalization, email/phone)
- Customer-facing UI leak prevention
- Performance integration with portfolio data

### Phase 21 — Portfolio + Reactivation Engine (02 Apr 2026)
**Portfolio Dashboard (`/staff/portfolio`):**
- KPI cards: Total Clients, Active, At Risk, Inactive, Revenue, Overdue Tasks
- Client list with classification filters (All/Active/At Risk/Inactive/Lost)
- Action buttons per client (Quote, Email, Call)
- Client activity tracking from orders, quotes, requests

**Reactivation Engine:**
- Activity-based classification: Active (<=60d), At Risk (60-89d), Inactive (90-179d), Lost (180+d)
- Auto-generated reactivation tasks for at-risk/inactive clients
- Task outcomes: Reactivated, No Response, Not Interested, Lost
- Suggested actions based on classification
- Idempotent task generation (no duplicates)

**Admin Portfolio Overview (`/admin/portfolio-overview`):**
- Portfolio by owner: companies, individuals, total clients
- Pending tasks, completed tasks, reactivation rate per owner
- Summary stats across all owners

**API Endpoints:**
- `GET /api/sales/portfolio` — sales own portfolio
- `GET /api/sales/portfolio/tasks` — own reactivation tasks
- `POST /api/sales/portfolio/generate-tasks` — generate tasks
- `PUT /api/sales/portfolio/tasks/{taskId}` — update outcome
- `GET /api/admin/portfolio/overview` — all owners overview
- `GET /api/admin/portfolio/{salesId}` — specific owner portfolio
- `POST /api/admin/portfolio/{salesId}/generate-tasks` — admin generate

---

## Key Technical Concepts
- **Ownership Continuity**: Existing client → keep owner. Only auto-assign for new entities.
- **Mandatory Routing**: ALL inbound creation paths call resolve_owner(). No bypass.
- **Role-Safe Visibility**: Sales see own data. Admin sees all. Customer sees zero internal data.
- **Reactivation Buckets**: Activity-based classification drives automated task generation.
- **Duplicate Prevention**: Domain, normalized name, email/phone matching before creation.

## Backlog

### P1 — Upcoming
- End-to-end Stripe test with real test cards
- Statement email delivery via Resend (when keys available)
- Territory scaling and enterprise sales workflows

### P2 — Future
- Twilio WhatsApp notifications (blocked on keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Mobile-first optimization

---

## Test History
- Iteration 165: Sales Performance — 100%
- Iteration 166: Vendor Performance — 100%
- Iteration 167: Unified Governance — 100%
- Iteration 168: Client Ownership Steps 1-5 — 100% (17/17)
- Iteration 169: Client Ownership Steps 6-8 — 100% (22/22)
- Iteration 170: Portfolio + Reactivation Engine — 100% (23/23)
