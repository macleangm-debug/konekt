# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email) | Pillow (Image Processing)

## System Status: LAUNCH READY + VENDOR OPS FOUNDATION BUILT

## Vendor Ops Foundation - NEW (307 iterations tested)
- **vendor_ops role**: Manages products, images, vendor coordination. Cannot access payments/commissions
- **Image Pipeline**: Upload + crop (1:1 default) + WebP conversion + 3 variants (thumbnail 200px, card 600px, detail 1200px)
- **Product CRUD**: Full product management via `/api/vendor-ops/` with created_by_role/updated_by_role tracking
- **Vendor Management Dashboard** at `/admin/vendor-ops`: 3 tabs (Vendors, Products, Price Requests) with stats banner
- **Price Requests**: Sales requests → Vendor Ops responds with base price → System applies margin → Sales sees final price
- **Role Enforcement**: Admin + vendor_ops access. Sales gets 403 (cannot see vendor data/base pricing)

## All Complete Systems (306+ iterations)
- Structured Name Fields (first_name/last_name) + first-name personalization system-wide
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
- Product Upload Wizard (step-by-step frontend with crop UI)
- Full Vendor Ops Dashboard expansion (SLA, fulfillment, performance)
- Vendor Proposal Document extension
- Downloadable Creative Image Generator
