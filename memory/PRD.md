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
Companies/Contacts/Individual Clients model, resolve_owner() engine, ownership continuity routing, admin reassignment tool, duplicate prevention, visibility enforcement.

### Phase 21 — Portfolio + Reactivation Engine (02 Apr 2026)
Portfolio Dashboard for sales owners, activity-based classification (Active/At Risk/Inactive/Lost), auto-generated reactivation tasks, admin portfolio overview.

### Phase 22 — Stock-First Vendor Assignment Engine (02 Apr 2026)
- Type-aware dispatcher: Product (stock-first), Promo (capability), Service (capability + performance)
- Atomic stock reservation via MongoDB findOneAndUpdate (prevents double-booking)
- Assignment decision audit trail: engine, candidates, vendor, reason, fallback, per-item assignments
- Admin endpoints: candidates preview, explain, decisions history

### Phase 23 — Dormant Client Alert System + Assignment Transparency UI (02 Apr 2026)
**Pack 1 — Dormant Client Alert System:**
- Company-level dormancy rollup (activity aggregated across ALL contacts under a company)
- Individual client direct classification
- Thresholds: Active (<=60d), At Risk (61-89d), Inactive (90-179d), Lost (180+d)
- Admin endpoints: summary with per-owner breakdown, alerts list with status/owner filters, reactivate action
- Staff endpoints: own dormant clients and summary (role-scoped)
- Frontend: DormantClientAlertsPage with owner breakdown cards, status filter tabs, actionable table (Open Client, Create Quote, Create Follow-up, Reactivate, Reassign)

**Pack 2 — Assignment Reasoning Transparency UI:**
- AssignmentReasonBadge with human-readable labels for all engine reason codes
- AssignmentDecisionDrawer with engine info, chosen vendor, per-item assignments, candidates snapshot
- AssignmentDecisionHistoryPage with engine filter
- Integrated into admin Orders drawer (inline reasoning + "View full reasoning" link)

**New API Endpoints:**
- `GET /api/admin/dormant-clients/summary`
- `GET /api/admin/dormant-clients/alerts?status=&owner=`
- `POST /api/admin/dormant-clients/{client_id}/reactivate`
- `GET /api/staff/dormant-clients/mine`
- `GET /api/staff/dormant-clients/summary`
- `POST /api/staff/dormant-clients/{client_id}/reactivate`

**New Frontend Routes:**
- `/admin/dormant-clients` — Dormant Client Alerts (admin)
- `/admin/assignment-decisions` — Assignment Decision History (admin)

---

## Key Technical Concepts
- **Ownership Continuity**: Existing client → keep owner. Only auto-assign for new entities.
- **Mandatory Routing**: ALL inbound creation paths call resolve_owner(). No bypass.
- **Role-Safe Visibility**: Sales see own data. Admin sees all. Customer sees zero internal data.
- **Company-Level Dormancy**: Corporate dormancy evaluated by rolling up activity across all company contacts.
- **Stock-First Assignment**: Product orders prioritize vendors with pre-allocated stock. Atomic reservation prevents double-booking.
- **Type-Aware Dispatch**: Product, Promo, and Service orders use separate assignment engines.
- **Stored Reasoning**: Assignment decisions persist engine/candidates/reason — never reconstructed from guesses.

## Backlog

### P1 — Upcoming
- End-to-end Stripe test with real test cards

### P2 — Future
- Twilio WhatsApp notifications (blocked on keys)
- Resend email integration (blocked on keys)
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
- Iteration 171: Stock-First Vendor Assignment Engine — 100% (22/22)
- Iteration 172: Dormant Client Alerts + Assignment Transparency — 100% (16/16 + UI)
