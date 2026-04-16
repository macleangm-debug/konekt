# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email) | Pillow (Image Processing)

## System Status: 327 ITERATIONS, 100% PASS RATE

---

## LATEST FIXES (327)

### Pricing Engine — Uses Actual Pricing Tiers
- Pricing engine now reads `pricing_policy_tiers` from Settings Hub
- Priority: Pricing Tiers (amount-based) → Category-specific → Global default
- Tier 1 (0-100K): 35% total margin. A5 Notebook: base=8000 → sell=10,800
- Tier 2 (100K-500K): 30%. Tier 3 (500K-2M): 25%.
- All selling prices across the system come from the pricing engine

### Product Search — Fixed
- Returns products with status=active/published/approved (was only is_active=true)
- Selling prices computed via pricing engine for products with base_price
- Server-side regex search (not post-filter after limit)

### Quotes Table — Full Width
- 5 columns with explicit widths: Quote# (18%), Customer (25%), Total (15%), Status (15%), Actions (27%)
- min-w-[700px] prevents column squeezing
- overflow-x-auto for responsive behavior

### Categories — No Deletion + Subcategories
- Category delete button REMOVED from Settings Hub
- Categories can be deactivated but never deleted (data integrity)
- Subcategories section added inside each category's expanded config
- Subcategories managed via input + Enter key
- Subcategories wired to products and marketplace

## CORE SYSTEMS (all complete)
- Create Quote: separate page with live branded preview
- Commercial Flow: Quote → Invoice + Order (payment-gated)
- Marketplace CTA: "Can't find what you need?" inline form → Requests
- Category Config: Settings Hub → Catalog → Category Configuration
- Vendor Ops: 4 tabs (Pricing Requests, Orders, Vendors, Products)
- Affiliates: 3 tabs (Affiliates, Performance, Withdrawals)
- Group Deals: 5-step wizard
- Bulk Import: CSV upload for catalog items
- Mr. Konekt AI: context + role aware

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`

## Remaining / Next
- Vendor Ops 3-column simplified layout with dates, client details
- Orders visibility in Vendor Ops (only confirmed unless credit terms)
- Product Approvals: quantity field for stock assignment
- Credit terms config in Settings Hub
