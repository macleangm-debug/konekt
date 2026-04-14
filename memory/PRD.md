# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email) | Pillow (Image Processing)

## System Status: LAUNCH READY — ALL DISCOVERY LAYERS COMPLETE

## Group Deals Discovery Overhaul — COMPLETE (309 iterations tested)
- **Group Deals Landing Page** (`/group-deals`): Dark hero header, auto-featured deal banner, 3-column active deals grid, skeleton loaders, trust footer (Refund Guaranteed, Verified Payments, Volume Savings), empty state with marketplace CTA
- **Homepage Integration**: DealOfTheDayHero (with fallback — auto-picks best deal by progress/urgency if no featured deal), HomepageGroupDealsSection (conditional, shows top 6 deals)
- **Marketplace Entry Point**: Prominent dark banner at top with active deal count badge and "View Deals" CTA
- **Deal of the Day Fallback**: Backend scores deals by progress (70%) + urgency (30%) and auto-selects the best one
- **Lazy Loading**: `loading="lazy"` on all deal images (homepage, marketplace, deals page, detail page)

## Page Alignment Audit — COMPLETE
- Canonical admin width: `max-w-7xl` (data pages), `max-w-5xl` (form pages)
- Fixed: ProductUploadWizard and BusinessSettingsPageV2 from `max-w-3xl` → `max-w-5xl`
- Wizard uses 2-3 column grids for proper horizontal space usage

## Product Upload Wizard — COMPLETE (308 iterations tested)
- 6-step flow: Basic Info (2-col) → Images (WebP pipeline) → Pricing (3-col, dynamic units, margin preview) → Variants (max 2 dims) → Stock & Vendor (2-col) → Review (3-col cards)
- Route: `/admin/vendor-ops/new-product`
- Dynamic catalog config from Settings Hub

## Configurable Catalog Settings — COMPLETE
- Settings Hub → Catalog group: Units of Measurement (16 units, add/remove/toggle), Product Categories (12), Variant Types (5), SKU Configuration (prefix + format + live preview)

## Vendor Ops Dashboard — ENHANCED
- Products tab: Toggle publish, unit display, stock with context
- Price Requests tab: Enter Quote CTA, Ready for Sales, inline edit
- Stats banner: Vendors, Products, Active, Drafts, Pending Requests

## All Complete Systems (309+ iterations)
- Vendor Ops Foundation (role, image pipeline, product CRUD, price requests)
- Structured Names + first-name personalization
- Terms of Service + Password-Gated Settings Lock
- Affiliate System (Qualification → Activation → Dashboard → Content Studio)
- Sales Promo Code + Unified Creative Generator
- Group Deal Content Studio, quantity closure, repeat buyers
- Canonical Email Engine (Resend)
- Commission & Margin Distribution Engine
- Customer Rating System + Track Order

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!` (code: STAFF2024)
- Affiliate: `qualifier.test@example.com` / `Qualifier123!`

## Backlog
- (P1) First real product listing using the wizard
- (P1) First live group deal execution
- (P1) State-aware conversational loan entry
- (P2) "Share on WhatsApp" rich messaging post-Group Deal payment
- (P2) Remaining configurable settings (default quote expiry, lead time, color presets)
- (Phase 2) Full Vendor Ops automation (SLA timers, vendor scoring)
- (Phase 2) Downloadable Creative Image Generator
