# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email) | Pillow (Image Processing)

## System Status: ALL P0/P1 COMPLETE — 320 ITERATIONS

## Category Config UI — COMPLETE (320 iterations)
- **Admin → Catalog Workspace → Categories**
- Expandable config cards per category with badges (Display Mode, Commercial Mode, Sourcing Mode)
- Core Settings: Display Mode (visual/list_quote), Commercial Mode (fixed_price/request_quote/hybrid), Sourcing Mode (preferred/competitive)
- Advanced Toggles: allow_custom_items, require_description, show_price_in_list, multi_item_request, search_first
- Helper text on every field
- Inline Save Changes with API persistence
- Backend: `PUT /api/admin/catalog-workspace/categories/{cat_name}`

## Commercial Flow — LOCKED (319 iterations)
- **Quote → Approved → Invoice + Order (pending_payment)**
- Order stays `pending_payment` until payment approved
- Payment approval → `confirmed` + fulfillment unlocked
- Marketplace checkout follows same flow (Invoice + Order created)
- `fulfillment_locked=true`, `commission_triggered=false`, `revenue_recognized=false` until payment

## List & Quote Catalog — COMPLETE (319 iterations)
- Frontend: `/catalog/quote?category=X` — search-first UX
- Multi-item selection with quantity + unit of measurement
- Custom item fallback, customer details form
- Backend: `POST /api/public/quote-requests` → CRM + Assignment Engine
- Category-driven behavior from Category Config UI settings

## Admin Sidebar — REORGANIZED (319 iterations)
1. CRM & Sales Pipeline (CRM at top)
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
- Primary: Customer Ownership / Weighted Availability
- Fallback: Round Robin / Random

## Mr. Konekt AI Assistant — COMPLETE (319 iterations)
- Context-aware (page + role), role-specific quick actions

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!`
- Vendor Ops: `vops.test@konekt.co.tz` / `VendorOps123!`

## Refinement Pass — NEXT PRIORITIES
1. (P0) Quote creation simplification — system items only, no free text
2. (P0) Source-of-truth enforcement for products/services/list items
3. (P1) Vendor Ops flow simplification (requests + orders)
4. (P1) Affiliate admin form alignment + affiliate performance/payout wiring
5. (P1) Group deal creation UX refinement (step-based wizard)
6. (P2) Bulk import for list items/services (CSV/Excel)

## Future / Backlog
- First real product listing end-to-end
- First live Group Deal execution
- Activate internal sales + external affiliates batch
- Light micro-interactions (hover lift, skeleton loaders)
- Full Vendor Ops automation (SLA timers, vendor scoring)
- Split orders logic for complex quoting
