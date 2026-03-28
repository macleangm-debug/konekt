# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform for Konekt with strict role-based views (Customer, Admin, Vendor, Sales), canonical routing, automated order assignment at payment approval, and proper UI/UX data presentation.

## Architecture
- **Frontend**: React (Vite) + Tailwind + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor)
- **Roles**: Customer (`/account/*`), Admin (`/admin/*`), Vendor/Partner (`/partner/*`), Sales (`/staff/*`)
- **Auth**: JWT-based login at `/login`

## Critical Technical Fix: serialize_doc
All `serialize_doc`/`_clean` functions across the codebase now preserve existing UUID `id` fields. Previously, `_id` (ObjectId) was always overwriting `id`, breaking proof/invoice joins for records that use UUID-based `id` fields. Fixed in:
- `admin_routes.py`, `admin_facade_routes.py`, `customer_invoice_routes.py`, `customer_orders_routes.py`, `vendor_orders_routes.py`, `order_ops_routes.py`

## Canonical Routing
- `/dashboard/*` → `/account/*`
- `/partner/fulfillment` → `/partner/orders`
- Admin orders: `/api/admin/orders-ops`
- Admin invoices: `/api/admin/invoices`

## Completed Work

### Session 7c — Real Fix Patch (2026-03-28) ✅
**Root cause fixes for execution path issues:**

1. **serialize_doc UUID preservation** — ALL serialize_doc/_clean functions now check `if "id" not in doc` before overwriting with ObjectId. This was the root cause of proof join failures.

2. **Payer name resolution** — Admin invoices use dual-format proof lookup (UUID + ObjectId). Customer invoices use async enrichment checking proof → submission → billing → customer chain.

3. **Sales assignment auto-resolve** — Approval flows (admin_flow_fixes + live_commerce_service) now search for sales users across roles (sales → staff → admin) with round-robin. No more "auto-sales" or "unassigned" placeholder IDs.

4. **Data backfill** — Fixed 33 sales_assignments from "auto-sales"/"unassigned" to real admin user. Fixed 82 orders with real assigned_sales_id.

5. **Placeholder removal** — Removed ALL "Konekt Sales Team" / "+255 XXX" placeholders from customer UI. Sales section now conditionally renders only when real data exists.

6. **Admin invoice consistency** — Both admin_routes.py and admin_facade_routes.py now use the same enrichment logic for payer/customer resolution.

7. **Approval flow persistence** — Now stores: assigned_sales_id, assigned_sales_name, assigned_vendor_id, invoice_id, payer_name on the order document.

## Prioritized Backlog

### P1 — Upcoming
- Connect live payment gateway (KwikPay/Stripe)
- Final Launch Verification Checklist execution

### P2 — Future
- Configure Twilio WhatsApp credentials
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization
