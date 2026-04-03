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

### Phases 1-21 — Core through Portfolio + Reactivation
Full platform: CRM, Orders, Quotes, Invoices, Vendor Margin, Notifications, KPIs, Stripe, Business Settings, Sales/Vendor Performance, Governance, Client Ownership, Portfolio + Reactivation.

### Phase 22 — Stock-First Vendor Assignment Engine (02 Apr 2026)
- Type-aware dispatcher: Product (stock-first), Promo (capability), Service (capability + performance)
- Atomic stock reservation via MongoDB findOneAndUpdate (prevents double-booking)
- Assignment decision audit trail with stored reasoning (not reconstructed)
- Admin endpoints: candidates preview, explain, decisions history

### Phase 23 — Dormant Client Alerts + Assignment Transparency UI (02 Apr 2026)
- Company-level dormancy rollup (activity across ALL contacts)
- Admin + staff (role-scoped) endpoints with summary, alerts, reactivation
- Actionable page: Open Client, Quote, Follow-up, Reactivate, Reassign
- Assignment reasoning in admin Orders drawer + full history page

### Phase 24 — Unified Vendor Onboarding + Catalog Workspace (03 Apr 2026)
**Country-Aware Vendor Onboarding:**
- Market context service: 6 markets (TZ/KE/UG/RW/NG/ZA) with phone prefix, currency, support info
- 5-step onboarding form: Market → Details → Role → Capabilities → Review & Invite
- Vendor role classification: product_vendor, promo_vendor, service_vendor, hybrid_vendor
- Marketplace permission enforcement: only product/promo/hybrid vendors can publish items
- Invite token flow: generate → validate → activate (email MOCKED until Resend configured)

**Unified Catalog Workspace:**
- Tabbed overview: Products, Services, Taxonomy, Vendor Supply
- Catalog stats endpoint with aggregated counts

**New API Endpoints:**
- `GET /api/admin/vendor-onboarding/markets`
- `GET /api/admin/vendor-onboarding/market-context/{country_code}`
- `GET /api/admin/vendor-onboarding/role-preview?capability_type=X`
- `POST /api/admin/vendor-onboarding`
- `GET /api/admin/vendor-onboarding/invites`
- `GET /api/vendor-invite/validate/{token}`
- `POST /api/vendor-invite/activate`
- `GET /api/admin/catalog-workspace/stats`

**New Frontend Routes:**
- `/admin/vendor-onboarding` — Multi-step vendor onboarding
- `/admin/catalog` — Unified catalog workspace

---

## Key Technical Concepts
- **Vendor Role Policy**: product/promo vendors → marketplace access. Service vendors → task-only.
- **Country-Aware Defaults**: Phone prefix, currency, tax labels adapt to selected market.
- **Stock-First Assignment**: Product orders prioritize vendors with pre-allocated stock.
- **Stored Reasoning**: Assignment decisions persist engine/candidates/reason.
- **Company-Level Dormancy**: Corporate dormancy evaluated by rolling up all contacts' activity.
- **Invite Token Flow**: MOCKED email → vendor creates password via activation URL.

## Backlog

### P1 — Upcoming
- End-to-end Stripe test with real test cards
- Resend email integration for vendor invites (blocked on API key)

### P2 — Future
- Twilio WhatsApp notifications (blocked on keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Mobile-first optimization

---

## Test History
- Iterations 165-170: Phases 17-21 — 100%
- Iteration 171: Stock-First Vendor Assignment Engine — 100% (22/22)
- Iteration 172: Dormant Client Alerts + Assignment Transparency — 100% (16/16)
- Iteration 173: Vendor Onboarding + Catalog Workspace — 100% (20/20 + UI)
