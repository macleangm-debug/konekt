# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: 333 ITERATIONS, 100% PASS RATE

---

## SERVICE CARDS — LIVE ON MARKETPLACE (333)
- Collapsible service cards showing all 6 service categories
- Click card → expand to subcategories → select multiple → Request Quote
- Multi-service selection across categories in one request
- Site visit location field appears when needed (Facilities, Technical, Office Branding)
- Fulfillment badges: Site Visit, On-site, Digital, Delivery/Pickup
- Submits to Requests table via POST /api/public/quote-requests

### Service Categories Seeded
1. **Printing & Branding** (8 subs): Business Cards, Flyers, Banners, Screen Printing, Embroidery, DTF, etc.
2. **Creative & Design** (5 subs): Logo, Graphic, Presentation, Social Media, Brand Identity
3. **Facilities Services** (4 subs): Deep Cleaning, Carpet, Fumigation, Window Cleaning — requires site visit
4. **Technical Support** (5 subs): Printer Servicing, CCTV, Access Control, Network, Equipment Maintenance — requires site visit
5. **Office Branding** (5 subs): Wall Branding, Signage, Billboard, Showroom, Reception — requires site visit
6. **Uniforms & Workwear** (4 subs): Tailoring, PPE, Name Tags, Corporate Wear — installment payments

### Product Categories Seeded
1. **Office Equipment**: Desks, Chairs, Storage, Whiteboards
2. **Stationery**: Paper, Writing, Filing, Desk Accessories
3. **Promotional Materials**: T-Shirts, Caps, Mugs, Bags, Lanyards — linked to Printing & Creative services

## TAXONOMY: Products (37 cats) | Services (7 cats) — zero orphans

## CATEGORY CONFIG — ALL FIELDS
category_type, display_mode, commercial_mode, sourcing_mode, fulfillment_type, requires_site_visit, site_visit_optional, installment_payments, installment_split, related_services, subcategories, allow_custom_items, require_description, show_price_in_list, multi_item_request, search_first

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`

## Remaining
- "Customize this" CTA on product pages → linked service categories
- Guided checkout flow (delivery address, pickup option)
- Delivery/service handover tracking
- Statement of Accounts document
- Sales role restriction enforcement
- Per-product fulfillment_type override
