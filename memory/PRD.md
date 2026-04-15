# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email) | Pillow (Image Processing)

## System Status: SUPPLY REVIEW CONTROL TOWER LIVE — 314 ITERATIONS

## Supply Review Control Tower — COMPLETE (314 iterations)
- **Pricing Integrity Monitor**: Real-time % of products using pricing engine vs raw vendor price
- **KPI Strip**: Pending, Pricing Issues, Missing Data, Healthy counts
- **5 Filters**: All, Pricing Issues, Missing Data, Pending, Ready to Approve
- **Table**: Base Price, Sell Price, Margin%, Source (Tier/Override), Health dot, Data completeness, Status, Actions
- **Approve with Engine**: Validates margin against min threshold, auto-applies pricing tier
- **Override & Approve**: Admin-controlled price override with reason logging
- **Reject**: With reason, sets status to rejected

## Pricing Engine — COMPLETE (313 iterations)
- Shared utility at `/app/backend/services/pricing_engine.py`
- 30% target margin, 15% minimum floor from category rules
- Auto-adjusts below-minimum overrides with warning
- Used in: product creation, product approval, price request vendor selection

## P0 Fixes — ALL COMPLETE
- Payment flow: orders only after approval
- Campaign: discount_pct → savings_amount
- Delivery note: bank details hidden, delivered/received signatures
- Affiliate activation: resend works for approved users

## Complete Systems (314+ iterations)
- Category Display Mode (visual/list_quote/commercial/sourcing)
- Competitive Quoting (preferred/competitive, multi-vendor)
- Content Studio (products/services/deals/brand templates)
- Group Deals Discovery (landing page, marketplace, fallback)
- Product Upload Wizard, Catalog Settings, Vendor Ops, Image Pipeline
- All other systems (affiliate, sales, email, commission, ratings, track order)

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!`

## Backlog
- (P1) Catalog Workspace redesign (KPI strip, category cards, product health)
- (P1) Vendors Page redesign (coverage, activity, sourcing roles)
- (P1) Affiliate System UI upgrade (dashboard, payouts, leaderboard)
- (P1) Finance Pages (cash flow, commissions)
- (P2) List & Quote catalog frontend (search-first UX)
- (P2) First real product + group deal execution
