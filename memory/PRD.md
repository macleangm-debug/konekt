# Konekt B2B E-Commerce Platform — PRD

## Product Vision
B2B e-commerce platform for Konekt (Tanzania) with role-based portals (Admin, Customer, Vendor, Sales), CRM pipeline, marketplace, quoting, ordering, and fulfillment workflows.

## Core Architecture
- **Frontend**: React (Vite/CRA), Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python), MongoDB (Motor async driver)
- **Auth**: JWT-based with role-based access + session validation
- **Payments**: Stripe sandbox integration

## 3 Commercial Lanes
1. **Products** — Request type: `product_bulk`
2. **Promotional Materials** — Request types: `promo_custom`, `promo_sample`
3. **Services** — Request type: `service_quote`
4. **Fallback** — `contact_general`

## Delivery Status Workflow
- **Vendor controls**: assigned → work_scheduled → in_progress → ready_for_pickup
- **Sales controls**: picked_up → in_transit → delivered → completed
- **Vendor ETA**: vendor_promised_date set by vendor
- **Internal Buffer**: internal_target_date set by sales/admin (1-2 day buffer)

---

## Completed Work

### Phases 1-8 — Core through E2E UAT
- Full platform: Login, Dashboard, Orders, Quotes, Invoices, Customers, Products, CRM, Marketplace
- 3 Commercial Lanes (Products, Promo, Services) with lane-first request flow
- Full E2E UAT (4 flows: Product Order, Service Request, Promo Custom, Promo Sample)

### Phase 9 — Pack 1: Service & Promo Experience Fix
- 21 services with full static content fallback (no more "Service Not Found")
- PromoMultiBlankBuilder for multi-item promo requests
- CantFindWhatYouNeedBanner across marketplace and service pages
- "Other / Not Sure" fallback lane → contact_general

### Phase 10 — Pack 4: Finance + Vendor Scheduling & Assignment
- **Payment state persistence**: Approved/rejected payments remain visible in queue with status badges
- **Richer payment drawer**: Customer name, payer name, contact phone, company name, payment reference, invoice link, approval history
- **Invoice paid status**: Fixed detection of fully paid invoices (checks payment_status field)
- **Vendor ETA input**: POST /api/vendor/orders/{id}/eta — vendor submits promised delivery date
- **Internal buffer dates**: POST /api/sales/delivery/{id}/internal-buffer — sales sets internal target date
- **Smart vendor assignment**: GET /api/admin/vendor-assignment/suggest — ranked candidates by capability, availability, workload

---

## Backlog

### P0 — In Progress
- Pack 2: Customer 360 + Statement of Account
- Pack 3: List Page Standardization + Notifications

### P1 — Upcoming
- Create Quote action from CRM drawer
- Hybrid Margin Engine

### P2 — Future
- Admin data entry configuration (TIN, BRN, bank)
- Twilio WhatsApp / Resend email (blocked on keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions

---

## Test History
- Iteration 155: 3 Commercial Lanes — 100% Pass
- Iteration 156: Full E2E UAT (4 Flows) — 100% Pass (29 tests)
- Iteration 157: Pack 1 Service & Promo Fix — 100% Pass (15 backend + frontend)
- Iteration 158: Pack 4 Finance + Vendor Scheduling — 100% Pass (15 backend + frontend)
