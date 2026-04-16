# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: 328 ITERATIONS, 100% PASS RATE

---

## CATEGORY → MARKETPLACE WIRING (328)
- Settings Hub categories auto-sync to marketplace taxonomy when saved
- POST /api/admin/catalog/sync-from-settings for manual sync
- Marketplace groups now show all configured categories with display_mode
- Subcategories wired from Settings Hub to taxonomy collections
- Products linked to taxonomy IDs for filtering

## PRICING ENGINE — USES PRICING TIERS (327-328)
- Priority: Pricing Tiers (amount-based) → Category rules → Global default
- Tier 1 (0-100K): 35%, Tier 2 (100K-500K): 30%, Tier 3 (500K-2M): 25%
- All selling prices computed from pricing engine
- A5 Notebook: base=8000 → sell=10,800 (35% margin)

## CLIENT CREDIT TERMS (328)
- Customer profile: payment_term_type, payment_term_days, credit_terms_enabled, credit_limit
- Credit terms auto-populate quotes/invoices
- Orders from credit clients can appear in Vendor Ops without payment

## CATEGORY CONFIG (327-328)
- Category deletion blocked (deactivate only, no delete)
- Subcategories added per category in Settings Hub
- Display mode, commercial mode, sourcing mode per category

## VENDOR OPS ENRICHED (328)
- Price requests show: Client name, Requested by, Date, Category, Status
- Orders tab shows ALL orders (same as Orders page)

## CORE FLOW (LOCKED)
- Sales: select customer + items + qty only. Cannot edit prices.
- Vendor Ops: manages vendors, enters base prices, follows up
- Pricing Engine: computes sell prices from Pricing Tiers
- Create Quote: separate page with live branded preview
- Quote → Invoice + Order (pending_payment) → Payment → Confirmed → Fulfillment

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`

## Remaining
- Further Vendor Ops simplification (vendor follow-up workflow)
- Product add flow: category/subcategory from source of truth only
- Service site visit flow
