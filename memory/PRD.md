# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: 332 ITERATIONS

---

## TAXONOMY — RESTRUCTURED (332)
- **Groups**: Products | Services (top-level only)
- **Categories**: Office Supplies, Printing, Safety, etc. (nested under group)
- **Subcategories**: Business Cards, Flyers, T-Shirts, etc. (nested under category)
- Auto-sync from Settings Hub on save
- TEST_ entries cleaned up, orphan categories reassigned
- 37 product categories, 1 service category (grows as configured)

## CATEGORY CONFIG — FULLY ENRICHED (332)
- `category_type`: product | service
- `display_mode`: visual | list_quote
- `commercial_mode`: fixed_price | request_quote | hybrid
- `sourcing_mode`: preferred | competitive
- `fulfillment_type`: delivery_pickup | delivery_only | pickup_only | digital | on_site
- `requires_site_visit`: boolean
- `site_visit_optional`: boolean
- `installment_payments`: boolean + split (50/50, 60/40, 70/30)
- `related_services`: product→service cross-sell
- `subcategories`: array of subcategory names
- All configurable in Settings Hub per category

## ALL SYSTEMS (wired)
- Pricing Engine: Pricing Tiers (35% for 0-100K)
- Commission Engine: tier distribution_split
- Operations (renamed from Vendor Ops)
- Document Numbering: QT-TZ-000001 format
- Quote → Invoice → Order (auto-generated)
- Marketplace CTA → Requests
- CRM → Assignment → Sales pipeline

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`

## Remaining
- Service cards UI on marketplace (collapsible, subcategory drill-down)
- "Customize this" CTA on product pages
- Delivery/handover tracking
- Statement of Accounts document
- Sales role restriction enforcement
