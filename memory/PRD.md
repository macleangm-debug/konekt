# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email) | Pillow (Image Processing)

## System Status: 325 ITERATIONS, 100% PASS RATE

---

## LATEST CHANGES (325)

### Create Quote — Separate Full Page
- `/admin/quotes/new` — dedicated page with 2-column layout
- **Left**: Customer selection (existing or new) + Items from catalog (SystemItemSelector)
- **Right**: Live branded quote preview using CanonicalDocumentRenderer
- Prices READ-ONLY (from pricing engine). Sales only sets quantity.
- "Request Price from Vendor Ops" for unpriced items
- Quote saves as `waiting_for_pricing` until all items priced

### Quotes List — Clean Table
- `/admin/quotes` — search, status badges, action buttons
- Status colors: draft, waiting_for_pricing, sent, approved, converted
- "Request Discount" button for sent quotes → approval workflow
- Clicking a quote row → QuotePreviewPage

### Marketplace CTA — "Can't find what you need?"
- Upgraded CantFindWhatYouNeedBanner with inline request form
- Submits directly to Requests table via POST /api/public/quote-requests
- Fields: product name, quantity, description, contact info
- Visible on marketplace and account pages

### Category Config → Settings Hub
- Moved from Catalog Workspace to Settings Hub → Catalog → Category Configuration
- Expandable rows per category with display_mode, commercial_mode, sourcing_mode
- 5 toggles: allow_custom_items, require_description, show_price_in_list, multi_item_request, search_first
- Catalog Workspace now shows summary with "Configure in Settings Hub →" link

## CORE PRINCIPLES (LOCKED)
- Sales = zero vendor responsibility (select customer + items + qty only)
- Vendor Ops = owns base pricing + vendor relationships
- Pricing Engine = single source of truth for sell prices
- Quote → Invoice + Order (pending_payment) → Payment → Confirmed → Fulfillment

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!`

## Remaining / Next
- Vendor Ops 3-column simplified layout (pricing requests + orders)
- Orders visibility rules (only confirmed in Vendor Ops unless credit terms)
- Credit terms configuration in Settings Hub
- First real product listing + Group Deal execution
