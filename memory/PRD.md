# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) for Tanzania. Role-based views for Customer, Admin, Vendor/Partner, and Sales.

## Architecture
- **Frontend**: React + Shadcn/UI + Tailwind CSS
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB
- **Payments**: Stripe (sandbox), Bank Transfer

## What's Implemented

### Core Platform
- Role-based auth, product catalog, checkout, invoicing, Stripe sandbox
- Backend stability centralization (Packs 1-7)
- Unified public intake → Requests module
- Admin Requests Inbox + CRM bridge

### Phase 1 — Stabilization (COMPLETED)
- Login/session privacy, market settings, African phone prefixes, unified request forms

### Phase 2 — CRM/Inbox Fixes (COMPLETED)
- Convert-to-lead CRM visibility, traceability, "Open in CRM" button, CRM drawer pattern

### Phase 3 — Marketplace + Service UX (COMPLETED)
- Service page template, marketplace API unification, country selector redesign

### Pack A — Market Selector + Marketplace Taxonomy (COMPLETED 2026-03-31)
**A1. Market Selector in Top Nav**
- Non-blocking dropdown in PublicNavbarV2 (TZ flag + code)
- Tanzania = "Available — Shop", others = "Coming Soon — Waitlist" → redirect to `/launch-country`
- Config sourced from `marketAvailability.js`

**A2. Catalog Taxonomy Backend**
- Seeded 4 groups → 23 categories → 59 subcategories
- Products mapped to taxonomy via `group_id`, `category_id`, `category_name`
- `GET /api/marketplace/taxonomy` — full tree for filters
- `GET /api/marketplace/products/search` now supports `group_id`, `category_id`, `subcategory_id` filters
- Admin CRUD: `/api/admin/catalog/groups|categories|subcategories`

**A3. Marketplace Filter Sidebar**
- Cascading Group → Category → Subcategory dropdown panel
- Filters update URL params and product results in real-time
- "Clear all" to reset

### Pack B — Products & Services Admin + Vendor Intake (COMPLETED 2026-03-31)
**B1. Admin Products & Services Module**
- Route: `/admin/products-services`
- Overview tab: 6 stat cards (groups, categories, subcategories, products, submissions, pending)
- Taxonomy tab: add groups, categories, subcategories with CRUD
- Submissions tab: vendor submission review queue with table + drawer

**B2. Vendor Product Submission Flow**
- Route: `/partner/product-submissions`
- Form: product name, description, base cost, visibility mode, taxonomy mapping, min quantity
- Submissions saved to `vendor_product_submissions` with `review_status: pending`
- Vendor sees list of their submissions with status indicators

**B3. Margin Application + Publishing**
- Admin approves submission → applies configurable margin % → publishes to `products` collection
- Published product immediately appears in marketplace search
- Admin can reject or request changes with notes
- Vendor never sees margin calculation, only base cost

### Data Model
```
catalog_groups: { id, market_code, type, name, slug, is_active, sort_order }
catalog_categories: { id, group_id, name, slug, is_active, sort_order }
catalog_subcategories: { id, category_id, group_id, name, slug, is_active, sort_order }
vendor_product_submissions: { id, vendor_id, product_name, base_cost, visibility_mode, group_id, category_id, subcategory_id, review_status, approved_product_id }
```

### Key API Endpoints
- `GET /api/marketplace/taxonomy` — Full taxonomy tree
- `GET /api/marketplace/products/search` — Unified product search with taxonomy filters
- `GET /api/admin/catalog/summary` — Catalog stats
- `POST /api/admin/catalog/groups|categories|subcategories` — CRUD
- `POST /api/vendor/catalog/submissions` — Vendor submit product
- `POST /api/admin/catalog/submissions/{id}/approve` — Approve + publish with margin
- `POST /api/admin/catalog/submissions/{id}/reject` — Reject with notes

## Upcoming Tasks
### Lead-to-Quote CRM Drawer Action (P1)
- "Create Quote" from CRM drawer, prefill from request

### Backlog (P2)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization
- Twilio WhatsApp / Resend email (blocked on API keys)

## Testing Status
- Iteration 152: 100% (13/13 backend + all frontend) — Pack A+B
- Iteration 151: 100% — Phase 3 Marketplace + Service UX
- Iteration 150: 100% — Phase 2 CRM/Inbox
- Iteration 149: 100% — Phase 1 Stabilization
