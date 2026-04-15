# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email) | Pillow (Image Processing)

## System Status: WIRING AUDIT COMPLETE — 317 ITERATIONS

## Final Wiring Audit — COMPLETE (317 iterations)
- **Sidebar fixed**: Vendor Ops + Supply Review under "Catalog & Supply", Commission Engine under Finance
- **vendor_ops/staff roles**: Added to ALL_MGMT, sidebar filtering, admin token storage, login redirect
- **Login redirect fixed**: vendor_ops/staff now redirect to /admin instead of /account
- **Dead links removed**: Finance Cash Flow/Commissions replaced with working Commission Engine
- **All 11 roles**: admin, sales, sales_manager, finance_manager, marketing, production, vendor_ops, staff, affiliate, vendor, customer

## All Completed Systems (317 iterations)
- Supply Review Control Tower (pricing integrity, approve/reject with engine)
- Catalog Workspace (12 categories, mode badges, KPIs, health alerts)
- Competitive Quoting (preferred/competitive, multi-vendor)
- Content Studio (products/services/deals/brand templates)
- Group Deals Discovery (landing page, marketplace banner, fallback)
- Product Upload Wizard (6 steps, dynamic catalog config)
- Pricing Engine (30% target, 15% min, auto-adjust)
- Payment Flow Fix (orders only after approval)
- Category Display Mode (visual/list_quote/commercial/sourcing)
- Commission Engine (real data, KPIs, filters)
- Vendor Ops Dashboard + Profile Drawer
- User Creation (11 roles, structured names)
- Delivery Note Fix (logistics-only, signatures)
- Affiliate Activation Bug Fix
- All core: affiliate, sales, email, commission, ratings, track order

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!`
- Vendor Ops: `vops.test@konekt.co.tz` / `VendorOps123!`

## Remaining Backlog
- (P1) Affiliate System UI upgrade (performance table, payouts drawer, leaderboard)
- (P2) List & Quote catalog frontend (search-first UX)
- (P2) First real product + group deal execution
- (P2) Micro-interactions
