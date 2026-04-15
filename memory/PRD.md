# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email) | Pillow (Image Processing)

## System Status: ALL P0 + USER CREATION FIXED — 315 ITERATIONS

## User Creation Fix — COMPLETE (315 iterations)
- **11 roles**: admin, sales, sales_manager, finance_manager, marketing, production, vendor_ops, staff, affiliate, vendor, customer
- **Structured names**: First Name / Last Name instead of Full Name
- **Role dropdown**: All 11 roles with descriptions (e.g., "Vendor Ops — Supply & vendors")
- **Backend**: UserRole enum + ROLE_PERMISSIONS expanded, AdminUserCreate stores first_name/last_name
- **Access fix**: vendor_ops and staff can now access admin/supply review endpoints

## Supply Review Control Tower — COMPLETE (314 iterations)
- Pricing Integrity Monitor (real-time %)
- KPI Strip (Pending/Issues/Missing/Healthy)
- 5 Filters, approve with pricing engine, override & approve, reject

## Pricing Engine — COMPLETE (313 iterations)
- Shared utility, 30% target / 15% min, auto-adjust overrides

## P0 Fixes — ALL COMPLETE
- Payment flow: orders only after approval
- Campaign: savings_amount (no percentage)
- Delivery note: logistics-only, signatures
- Affiliate activation: resend fixed

## Complete Systems (315+ iterations)
- Category Display Mode, Competitive Quoting, Content Studio, Group Deals Discovery
- Product Upload Wizard, Catalog Settings, Vendor Ops, Image Pipeline
- Affiliate, Sales, Email, Commission, Ratings, Track Order, Settings Lock

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!`
- Vendor Ops: `vops.test@konekt.co.tz` / `VendorOps123!`

## Backlog (P1 — Fully Wired)
- Catalog Workspace (KPI strip, category cards, product health — real data)
- Vendors Page (coverage, activity, sourcing roles — real vendor records)
- Affiliate System UI (performance, payouts, leaderboard — real metrics)
- Finance Pages (cash flow, commissions — real engine data)
- List & Quote catalog frontend (search-first UX)
