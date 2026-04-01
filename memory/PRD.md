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

---

## Completed Work

### Phases 1-8 — Core through E2E UAT
- Full platform: Login, Dashboard, Orders, Quotes, Invoices, Customers, Products, CRM, Marketplace

### Phase 9 — Pack 1: Service & Promo Experience Fix
- 21 services with full static content fallback
- PromoMultiBlankBuilder, CantFindWhatYouNeedBanner
- "Other / Not Sure" fallback → contact_general

### Phase 10 — Pack 4: Finance + Vendor Scheduling & Assignment
- Payment state persistence, richer drawer
- Vendor ETA input, internal buffer dates
- Smart vendor assignment engine

### Phase 11 — Pack 2: Customer 360 + Statement of Account (01 Apr 2026)
- Profile KPI aggregation, Statement of Account (running balance)
- 6 new customer detail APIs + customer-facing statement
- CustomerLinkCell wired into Orders, Payments, Invoices, Requests, CRM, Customers
- CustomerDrawer360 with 8 tabs + "Full Profile" button
- CustomerProfilePage at /admin/customers/:id
- KPI card filtering on Customers list

### Phase 12 — Pack 3: List Page Standardization + Notifications (01 Apr 2026)
- **Sidebar notification badges**: Red count badges on Orders, Requests Inbox, Payments Queue, Deliveries — state/action-based (not view-based)
- **Backend**: `GET /api/admin/sidebar-counts`, `GET /api/admin/orders-ops/stats`, `GET /api/admin/payments/stats`, `GET /api/admin/invoices/stats`
- **Orders stat cards**: 5 clickable cards (Total, New, Assigned, In Progress, Completed) replacing old tab filters
- **Payments Queue stat cards**: 4 clickable cards (Total, Pending, Approved, Rejected) replacing old tab filters
- **Invoices stat cards**: 6 display cards (Total, Draft, Sent, Paid, Overdue, Unpaid)
- **Deliveries page redesign**: Full table-based layout with KPI stat cards, search, CustomerLinkCell, detail drawer (from card layout)
- **Request Inbox company name fix**: Backend enriches company_name from user profile when missing

---

## Backlog

### P1 — Upcoming
- Create Quote action from CRM drawer
- Hybrid Margin Engine
- Send Statement button (email with PDF — build now, dispatch when Resend available)

### P2 — Future
- Admin data entry configuration (TIN, BRN, bank)
- Twilio WhatsApp / Resend email (blocked on keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Mobile-first optimization

---

## Test History
- Iteration 155: 3 Commercial Lanes — 100% Pass
- Iteration 156: Full E2E UAT (4 Flows) — 100% Pass
- Iteration 157: Pack 1 Service & Promo Fix — 100% Pass
- Iteration 158: Pack 4 Finance + Vendor Scheduling — 100% Pass
- Iteration 159: Pack 2 Customer 360 + Statement — 92% Backend / 100% Frontend
- Iteration 160: Pack 3 List Page Standardization — 100% Backend (19/19) / 100% Frontend
