# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email) | Pillow (Image Processing)

## System Status: LAUNCH READY — PRODUCT UPLOAD WIZARD COMPLETE

## Page Alignment Audit — COMPLETE
- **Canonical admin width**: `max-w-7xl` (1280px) for data-heavy pages (dashboards, tables)
- **Form/wizard width**: `max-w-5xl` (1024px) for focused form pages (Product Wizard, Business Settings)
- **Account pages**: Fill layout container (no max-width), CustomerPortalLayoutV2 provides `p-4 md:p-6 lg:p-8` padding
- **Fixed**: ProductUploadWizard `max-w-3xl` → `max-w-5xl` (was too narrow)
- **Fixed**: BusinessSettingsPageV2 `max-w-3xl` → `max-w-5xl`
- **Improved**: Wizard uses 2-3 column grids for better horizontal space usage

## Product Upload Wizard — COMPLETE (308 iterations tested)
- **6-step flow**: Basic Info (2-col grid) → Images (drag/drop + WebP pipeline) → Pricing (3-col grid, dynamic units, margin preview) → Variants (max 2 dims, auto-combos) → Stock & Vendor (2-col grid) → Review/Publish (3-col summary cards)
- **Route**: `/admin/vendor-ops/new-product` (registered in App.js)
- **Dynamic catalog config**: Units, categories, variant types loaded from Settings Hub via `/api/vendor-ops/catalog-config`
- **Image pipeline**: Upload → crop → WebP → 3 variants (thumbnail 200px, card 600px, detail 1200px)
- **Lazy loading**: Product images use `loading="lazy"`

## Configurable Catalog Settings — COMPLETE (308 iterations tested)
- **Settings Hub → Catalog group** with 4 tabs:
  - Units of Measurement: 16 default units (Piece, Kg, Litre, etc.), add/remove/toggle active
  - Product Categories: 12 defaults, add/remove
  - Variant Types: 5 defaults (Size, Color, Material, Weight, Volume), add/remove
  - SKU Configuration: prefix + format pattern with live preview

## Vendor Ops Dashboard — ENHANCED (308 iterations tested)
- **Products tab**: Toggle publish (eye icon), unit display, stock with unit context, Actions column
- **Price Requests tab**: Enter Quote CTA (orange), Ready for Sales button (green), inline edit form
- **Stats banner**: Vendors, Products, Active, Drafts, Pending Requests

## All Complete Systems (308+ iterations)
- Vendor Ops Foundation (vendor_ops role, image pipeline, product CRUD, price requests)
- Structured Name Fields (first_name/last_name) + first-name personalization
- Terms of Service (6 sections) + Password-Gated Settings Lock
- Affiliate System (Qualification → Token Activation → Setup → Dashboard → Content Studio)
- Sales Promo Code System + Unified Creative Generator
- Group Deal Content Studio (role-based), quantity closure, repeat buyers
- Canonical Email Engine (Resend) with triggers + preview
- Commission & Margin Distribution Engine
- Customer Rating System + Track Order Universal Page

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!` (code: STAFF2024)
- Affiliate: `qualifier.test@example.com` / `Qualifier123!`

## Backlog
- (P1) First real product listing using the wizard
- (P1) First live group deal execution
- (P1) State-aware conversational loan entry
- (P2) "Share on WhatsApp" rich messaging post-Group Deal payment
- (Phase 2) Full Vendor Ops automation (SLA timers, vendor scoring, fulfillment)
- (Phase 2) Downloadable Creative Image Generator
