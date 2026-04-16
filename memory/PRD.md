# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email) | Pillow (Image Processing)

## System Status: REFINEMENT PASS IN PROGRESS — 322 ITERATIONS

## Quote Creation Simplification — COMPLETE (322 iterations)
- **System items ONLY** — no free-text product/service entry for internal users
- `SystemItemSelector` replaces `LineItemsEditor` on QuotesPage
- Items searched from system catalog via `/api/public-marketplace/products`
- Auto-pricing applied when available
- Items with missing price: `pricing_status: "waiting_for_pricing"` with amber badge
- Quote status: `waiting_for_pricing` blocks sending until all prices set
- New statuses: `draft → waiting_for_pricing → ready_to_send → sent → approved → converted`
- CRM QuoteBuilderDrawer also tracks `pricing_status` with visual indicators
- Source-of-truth enforced: all items must have `product_id` from system catalog

## Category Config UI — COMPLETE (320 iterations)
- Admin → Catalog Workspace → Expandable category cards
- Core: Display Mode, Commercial Mode, Sourcing Mode
- Advanced: allow_custom_items, require_description, show_price_in_list, multi_item_request, search_first
- Inline Save with API persistence

## Commercial Flow — LOCKED (319 iterations)
- Quote → Approved → Invoice + Order (pending_payment)
- Payment approval → confirmed + fulfillment unlocked

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!`
- Vendor Ops: `vops.test@konekt.co.tz` / `VendorOps123!`

## Refinement Pass — Remaining
1. ~~Quote creation simplification~~ DONE
2. ~~Source-of-truth enforcement (quotes)~~ DONE
3. (NEXT) Vendor Ops flow simplification (requests + orders in one view)
4. Affiliate admin form alignment + performance/payout wiring
5. Group deal creation UX (step-based wizard)
6. Bulk import for list items/services (CSV/Excel)

## Previous Systems (all complete)
- List & Quote Catalog, Admin Sidebar, Sales Assignment Policy, Mr. Konekt AI
- Supply Review, Catalog Workspace, Commission Engine, Finance APIs
- Pricing Engine, Payment Flow, Category Display, Competitive Quoting
- Content Studio, Group Deals, Product Upload Wizard
- User Creation (11 roles), Delivery Note, Affiliate Activation
