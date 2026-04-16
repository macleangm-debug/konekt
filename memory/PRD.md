# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email) | Pillow (Image Processing)

## System Status: 326 ITERATIONS, 100% PASS RATE

---

## LATEST FIXES (326)

### Product Search — Fixed
- Products now appear with computed selling_price (from pricing engine)
- Search uses MongoDB $regex for server-side filtering (was client-side, missed results)
- Query includes: is_active=true OR status in [active, published, approved]
- Products with base_price but no selling_price get price computed via calculate_sell_price

### Create Quote — Separate Full Page
- `/admin/quotes/new` — 2-column: builder (left) + live branded preview (right)
- Customer: select existing or add new client
- Items: SystemItemSelector with READ-ONLY prices from pricing engine
- Unpriced items: "Request Price from Vendor Ops" button
- Live CanonicalDocumentRenderer preview updates as items are added

### Quotes List — Clean Table
- `/admin/quotes` — search, status badges, action buttons only
- "Create Quote" navigates to separate page

### Marketplace CTA
- "Can't find what you need?" with inline request form
- Submits to Requests table → CRM + Assignment Engine
- Visible on marketplace pages

### Category Config → Settings Hub
- Settings Hub → Catalog → Category Configuration
- Expandable rows per category with all config options

## CORE PRINCIPLES (LOCKED)
- Sales = zero vendor responsibility
- Vendor Ops = owns base pricing + vendor relationships
- Pricing Engine = single source of truth for sell prices
- All items from system catalog (no free text for internal users)

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`

## Remaining / Next
- Vendor Ops 3-column simplified layout with dates, client details, requested-by
- Orders visibility rules (only confirmed in Vendor Ops unless credit terms)
- Product Approvals: add quantity field for stock assignment
- Credit terms configuration in Settings Hub
