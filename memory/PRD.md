# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email) | Pillow (Image Processing)

## System Status: ALL P1 COMPLETE — 318 ITERATIONS

## Affiliate System UI — UPGRADED (318 iterations)
- KPI strip: Total (40), Active (28), Total Commission, Total Sales
- Performance table: Name, Code, Sales (TZS), Commission (TZS), Status, Actions
- Profile drawer: click row → Profile (email, phone, code, promo, status) + Performance (sales, commission, paid, pending, rate)

## Wiring Audit — COMPLETE (317 iterations)
- Sidebar: Vendor Ops + Supply Review under "Catalog & Supply", Commission Engine under Finance
- vendor_ops/staff login → /admin redirect, admin token storage
- All completed work rendered in canonical routes

## All Systems Complete (318 iterations)
- Supply Review Control Tower, Catalog Workspace, Commission Engine, Finance APIs
- Pricing Engine, Payment Flow Fix, Category Display Mode, Competitive Quoting
- Content Studio, Group Deals Discovery, Product Upload Wizard
- User Creation (11 roles), Delivery Note, Affiliate Activation Fix
- Core: affiliate, sales, email, commission, ratings, track order

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!`
- Vendor Ops: `vops.test@konekt.co.tz` / `VendorOps123!`

## Remaining
- (P2) List & Quote catalog frontend (search-first UX)
- (P2) First real product + group deal execution
- (P2) Micro-interactions
- (Phase 2) SLA timers, vendor scoring
