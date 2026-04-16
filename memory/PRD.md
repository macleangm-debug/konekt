# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: 331 ITERATIONS, 100% PASS RATE

---

## SERVICE FLOW CONFIGURATION — COMPLETE (331)

### Category Types
- **Product**: Visual catalog, fixed/hybrid pricing, "Customize this" CTA linking to related services
- **Service**: List & Quote, request-based, can require site visit, installment payments

### New Category Config Fields
- `category_type`: product | service
- `requires_site_visit`: boolean — service requires on-site assessment before quoting
- `site_visit_optional`: boolean — user can choose whether site visit is needed
- `installment_payments`: boolean — allow split payment (e.g., 60% upfront, 40% on delivery)
- `installment_split`: "50/50" | "60/40" | "70/30" | "100/0"
- `related_services`: array — cross-sell link from product category to service categories

### Service Flow (2-stage for site visit)
1. User selects service → enters location if site visit required
2. Request → Sales → Operations gets base price
3. Site Visit Quote → Client accepts → Invoice → Payment → Site visit happens
4. Operations enters actual job cost → Pricing engine calculates sell price
5. Service Quote → Client accepts → Invoice (with installments if configured) → Payment → Fulfillment

### Product → Service Cross-Sell
- Promotional Materials → linked to "Printing & Stationery", "Graphics & Design"
- "Customize this" CTA on product cards links to related service categories
- All configured in Settings Hub per category

### Data Examples
- Printing & Stationery: service, site_visit_optional=true, installment=60/40
  - Subcategories: Business Cards, Flyers, Banners, Screen Printing, Embroidery, DTF
- Promotional Materials: product, related_services=[Printing, Graphics]
  - Subcategories: T-Shirts, Caps, Mugs, Bags, Lanyards, Notebooks

## ALL SYSTEMS (complete and wired)
- Operations (renamed from Vendor Ops) — pricing, vendor follow-up, fulfillment
- Pricing Engine — uses Pricing Tiers (35% for 0-100K)
- Commission Engine — tier distribution_split (affiliate, sales, referral, promotion reserve)
- Document Numbering — QT-TZ-000001 format with country code
- Category Config — full service/product config in Settings Hub
- Quote → Invoice → Order (auto-generated, payment-gated)
- CRM → Assignment → Sales pipeline
- Marketplace CTA — "Can't find what you need?" → Requests

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`

## Remaining
- Service cards UI on marketplace + in-account (collapsible, subcategory drill-down)
- "Customize this" CTA on product pages linking to related services
- Delivery flow (Operations updates status, client confirmation)
- Statement of Accounts document
- Sales role restriction enforcement
