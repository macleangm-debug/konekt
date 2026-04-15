# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email) | Pillow (Image Processing)

## System Status: LAUNCH READY — PAYMENT INTEGRITY + CATEGORY ENGINE COMPLETE

## Payment Flow Fix — COMPLETE (312 iterations tested)
- **Critical fix**: Checkout no longer creates orders. Only creates checkout + invoice.
- **Orders created ONLY after payment review approval** via LiveCommerceService.approve_payment_proof()
- **No premature**: stock deduction, fulfillment, commission, revenue emails before approval
- **Track Order**: Shows "Payment Under Review" before approval, "Order Created" after

## Category Display Mode System — COMPLETE (312 iterations tested)
- **Rich category objects**: display_mode (visual/list_quote), commercial_mode (fixed_price/request_quote/hybrid), sourcing_mode (preferred/competitive)
- **Backward compatible**: Legacy string arrays auto-normalized to rich objects
- **Settings Hub**: Expandable category cards with inline descriptions + examples
  - Display Mode: Visual Catalog vs List & Quote (with auto-set toggles)
  - Pricing Behavior: Fixed Price vs Request Quote vs Hybrid
  - Vendor Sourcing: Single Sourcing vs Competitive Quoting
  - Toggles: show_on_marketplace, require_images, quote_enabled, active
- **Product Wizard**: Category dropdown handles both string and object formats

## Competitive Quoting System — COMPLETE (311 iterations)
- Two modes: Preferred Vendor / Competitive Quoting
- Full flow: Create → Send to Vendors → Collect Quotes → Compare → Select Winner → Ready for Sales
- Settings Hub: Sourcing Strategy tab (mode, max vendors, quote expiry, lead time)

## Content Studio — COMPLETE (310 iterations)
- 4 tabs: Products, Services, Group Deals, Brand Content (12 templates)
- Authority/Trust layouts, promo code injection, dynamic captions

## Group Deals Discovery — COMPLETE (309 iterations)
- Landing page, marketplace banner, homepage fallback, lazy loading
- **Enhanced**: Prominent green savings badge on deal cards

## All Systems (312+ iterations): Product Wizard, Catalog Settings, Vendor Ops, Image Pipeline, Affiliate, Sales Promos, Creative Generator, Group Deals, Email Engine, Commission Engine, Ratings, Track Order, Structured Names, Terms of Service, Settings Lock

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!`
- Test Vendors: Alpha Supplies, Beta Trading, Gamma Mfg

## Backlog
- (P1) First real product listing + first group deal execution
- (P1) Micro-interactions (card hover, button feedback)
- (P2) State-aware conversational loan entry
- (P2) WhatsApp OG meta tags
- (Phase 2) SLA timers, vendor scoring, split orders
