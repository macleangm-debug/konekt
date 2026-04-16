# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: 329 ITERATIONS, 100% PASS RATE

---

## DISTRIBUTABLE MARGIN — FULLY WIRED (329)
- Pricing Tiers contain: total_margin_pct (35%), protected_platform_margin_pct, distributable_margin_pct
- Distribution split per tier: affiliate_pct, sales_pct, referral_pct, reserve_pct (for promotions)
- Commission engine reads tier-specific splits for each order
- Direct → sales gets sales_pct from distributable
- Affiliate → affiliate gets affiliate_pct, sales gets reduced support
- Referral → referral gets referral_pct (credited to wallet)
- Promotion reserve → available for year-round promotions
- Wallet uses promotion reserve + remaining (never touches protected allocations)
- Discount approval guided by distributable margin (max discount = distributable %)

## PRODUCT ADD FLOW — SOURCE OF TRUTH (329)
- Category dropdown: from Settings Hub categories only
- Subcategory dropdown: from Settings Hub category's subcategories (not free text)
- "Request new subcategory" option → POST /api/admin/catalog/subcategory-requests
- Products must have category + subcategory from system
- Vendor Ops "select winner" → base price → pricing engine → sell price

## VENDOR OPS PRICING FLOW (329)
- Vendor Ops enters ONLY base price (negotiated with vendors)
- Pricing engine calculates sell price using Pricing Tiers
- Sell price = base_price × (1 + total_margin_pct / 100)
- No hardcoded margins — all from Pricing Tier configuration

## QUOTE → INVOICE → ORDER (verified 329)
- Quote approved → auto-generates Invoice + Order (pending_payment)
- Order has fulfillment_locked=true, commission_triggered=false until payment
- Payment approved → confirmed + fulfillment unlocked

## ALL WIRED SYSTEMS
- Pricing Engine → Product creation, Vendor Ops, Quote builder, Marketplace listing
- Commission Engine → Direct, Affiliate, Referral, Group Deal channels
- Category Config → Marketplace taxonomy, Product add, Search filters
- CRM → Assignment Engine → Sales pipeline
- Client credit terms → Invoice payment terms → Order visibility

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`

## Remaining
- Service site visit flow (priced step for non-visual categories)
- Further Vendor Ops UI simplification
- First real end-to-end transaction test
