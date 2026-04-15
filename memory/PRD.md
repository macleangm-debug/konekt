# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email) | Pillow (Image Processing)

## System Status: ALL P0/P1 COMPLETE — 319 ITERATIONS

## Commercial Flow — LOCKED (319 iterations)
- **Quote → Approved → Invoice + Order (pending_payment)**
- Order stays `pending_payment` until payment approved
- Payment approval → `confirmed` + fulfillment unlocked
- Marketplace checkout follows same flow (Invoice + Order created)
- No manual invoice creation outside of quotes/checkout flow
- `fulfillment_locked=true`, `commission_triggered=false`, `revenue_recognized=false` until payment

## List & Quote Catalog — COMPLETE (319 iterations)
- Frontend: `/catalog/quote?category=X` — search-first UX
- Multi-item selection with quantity + unit of measurement
- Custom item fallback ("Can't find what you need?")
- Customer details form (name, phone, email, company)
- Backend: `POST /api/public/quote-requests` → creates CRM request + triggers assignment engine
- Category-driven behavior (visual vs list_quote, commercial_mode: fixed_price/request_quote/hybrid)

## Admin Sidebar — REORGANIZED (319 iterations)
1. CRM & Sales Pipeline (CRM at top, Requests, Quotes, Invoices, Orders, Delivery Notes, Walk-in)
2. Payments & Finance
3. Catalog & Supply
4. Customers
5. Campaigns & Growth
6. Operations
7. Team & Performance
8. Reports
9. People & Control

## Sales Assignment Policy — COMPLETE (319 iterations)
- Settings Hub → Sales & Commission → Assignment Policy
- Primary Strategy: Customer Ownership / Weighted Availability
- Fallback Strategy: Round Robin / Random
- Track deal source: system-assigned vs self-generated

## Mr. Konekt AI Assistant — COMPLETE (319 iterations)
- Rebranded from generic "Assistant" to "Mr. Konekt"
- Context-aware: receives current page + user role
- Role-specific quick actions (admin, sales, vendor_ops, affiliate, customer)
- System knowledge: commercial flow, pricing engine, assignment, CRM, vendor ops

## CRM Enhancement — COMPLETE (319 iterations)
- Drawer shows: Assignment Source (ownership/system/manual)
- Drawer shows: Performance Summary (quotes, orders, revenue)
- Drawer shows: Related orders alongside quotes, invoices, tasks
- Full pipeline visibility from CRM → Quotes → Invoices → Orders

## Previous Systems (all complete)
- Supply Review Control Tower, Catalog Workspace, Commission Engine, Finance APIs
- Pricing Engine, Payment Flow, Category Display Mode, Competitive Quoting
- Content Studio, Group Deals Discovery, Product Upload Wizard
- User Creation (11 roles), Delivery Note, Affiliate Activation
- Core: affiliate, sales, email, commission, ratings, track order

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!`
- Vendor Ops: `vops.test@konekt.co.tz` / `VendorOps123!`

## Remaining / Upcoming
- (P0) Upload first real product listing end-to-end
- (P0) Execute first live Group Deal execution
- (P0) Activate internal sales + external affiliates batch
- (P2) Light micro-interactions (hover lift, skeleton loaders)
- (Phase 2) Full Vendor Ops automation (SLA timers, vendor scoring)
- (Phase 2) Split orders logic for complex quoting
