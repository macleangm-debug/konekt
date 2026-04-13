# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth

## System Status: DEPLOYMENT READY — Full KPI System Active

## Performance & KPI System (Batch 2 — COMPLETE)

### Settings Hub: Performance Targets
- Monthly Revenue Target (TZS)
- Target Margin %
- Channel Allocation (Sales/Affiliate/Direct/Group Deals — must sum to 100%)
- Team sizes (sales staff count, affiliate count)
- Minimum KPI thresholds (sales min %, affiliate min %)
- Auto-calculated per-person targets

### KPI Engine Backend
- Per-channel: revenue, profit, target, achievement_pct, contribution_pct, deal count
- Per-sales: profit (PRIMARY), revenue, deals, target_profit, achievement_pct, status
- Per-affiliate: earnings ONLY (no revenue/margin), deals, conversions, status
- Channels: Sales, Affiliate, Direct, Group Deals
- Smart recommendations: staffing needs, underperformer alerts, channel gap analysis

### Performance Dashboard (/admin/performance)
- KPI Strip: total profit, achievement %, revenue, active sales, active affiliates
- Channel Split bar + channel cards with progress bars
- Sales leaderboard: profit-first, revenue secondary, status badges
- Affiliate leaderboard: earnings-only (no revenue/profit/margin)
- Action panel: warnings + insights ("You need +X sales staff", "Channel below target by X%")
- Month/year filter
- Mobile card layouts for leaderboards

## Group Deal Checkout (Canonical — No Popup)
- Detail → /group-deals/checkout → Details → Payment & Proof (bank details) → Confirmation
- Payment: pending_payment → payment_submitted → admin approve → committed
- Admin payment queue with one-click Approve

## Track Order = Universal Status Page
- Normal orders + GDC references + phone-only search
- All 6 group deal states with full-width layout

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!`

## Backlog
- Twilio WhatsApp + Resend Email dispatch
- Commission alignment with distributable margin
- Super Agent operational dashboard
- Country-based payment method display
