# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email) | Pillow (Image Processing)

## System Status: LAUNCH READY — COMPETITIVE QUOTING ENGINE COMPLETE

## Competitive Quoting System — COMPLETE (311 iterations tested)
- **Two sourcing modes**: Preferred Vendor (1 vendor) and Competitive Quoting (multi-vendor)
- **Full flow**: Create Request → Send to Vendors → Collect Quotes → Compare (BEST PRICE badge) → Select Winner → Apply Margin → Ready for Sales
- **Backend endpoints**: `/api/vendor-ops/price-requests` CRUD, `/send-to-vendors`, `/submit-quote`, `/select-vendor`, `/stats`
- **UI**: 4 sub-tabs (New/Awaiting/Ready/Closed), KPI strip, 3-column detail (Summary + Vendor Selection + Quote Comparison)
- **Settings**: Sourcing Strategy tab in Settings Hub (mode, max vendors, quote expiry, lead time, auto-select toggle)
- **Margin logic**: Auto-applies minimum_company_margin_percent (default 20%) when selecting vendor, with manual override
- **Vendor isolation**: Sales never sees vendor identity or base pricing — only final sell price + lead time

## Content Studio Expansion — COMPLETE (310 iterations)
- 4 content tabs: Products (29), Services, Group Deals (6), Brand Content (12 templates)
- 12 brand templates across 5 intents: Authority, Trust, Urgency, Soft Sell, Value
- 6 layout renderers including Authority (centered) and Trust (checklist)
- Square 1:1 image containers, dynamic captions, promo code injection

## Group Deals Discovery — COMPLETE (309 iterations)
- Landing page, marketplace banner, homepage fallback logic, lazy loading

## Product Upload Wizard — COMPLETE (308 iterations)
- 6-step flow, dynamic catalog config, image pipeline

## Configurable Catalog Settings — COMPLETE
- Units, Categories, Variants, SKU Config, Sourcing Strategy

## All Complete Systems (311+ iterations)
- Vendor Ops Foundation, Image Pipeline, Price Requests, Competitive Quoting
- Structured Names, Terms of Service, Password-Gated Settings
- Affiliate System, Sales Promos, Creative Generator
- Group Deals, Canonical Email Engine, Commission Engine
- Customer Rating, Track Order

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!`
- Test Vendors: Alpha Supplies Ltd, Beta Trading Co, Gamma Mfg Ltd (seeded in partners)

## Backlog
- (P1) First real product listing + first group deal execution
- (P1) Micro-interactions (card hover lift, button feedback, skeleton loaders)
- (P2) State-aware conversational loan entry
- (P2) WhatsApp OG meta tags for shared deal links
- (Phase 2) SLA timers, vendor scoring, split orders, auto-reminders
