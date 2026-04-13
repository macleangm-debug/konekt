# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth

## System Status: DEPLOYMENT READY — Full Business Control System

## Customer Rating System (COMPLETE)
- Rating triggered after order completion (5 states)
- **Anti-manipulation**: token-based access, phone verification, one-per-order, 30-min delay
- RatingPrompt on Track Order for completed orders (1-5 stars + optional comment)
- Admin unrated orders follow-up queue with status tracking
- Admin rating summary (total, average, low-rating alerts)
- Feeds into KPI (configurable weight)

## Commission & Margin Distribution Engine
- Commission from distributable margin, NOT revenue
- ONE channel per order: Direct/Assisted/Affiliate/Referral/Group Deal
- Wallet limited to flexible margin (promotion reserve + remaining)
- API: `/api/admin/commission/calculate`

## Track Order = Universal Status Page
- Radio selector: Phone (default) / Reference / Email — single input
- Normal orders, GDC references, phone search
- Rating prompt for completed orders
- Fulfillment-aware CTAs

## Performance Dashboard (/admin/performance)
- KPI strip, channel split, sales leaderboard (profit-first), affiliate (earnings-only)
- Action panel with smart recommendations
- Rating integration in KPI settings

## Settings Hub — All Configurable
- Commission: sales direct/assisted %, affiliate %, referral %, company core, promo reserve
- Wallet: enabled, max per order, protect allocations, single channel enforcement
- Ratings: enabled, trigger, scale, comment toggle
- Performance: targets, channel allocation, team sizes, KPI thresholds
- Sales visibility: commission display controls

## Key API Endpoints
- `/api/ratings/check` — rating eligibility (token or order+phone)
- `/api/ratings/submit` — submit rating (1-5, one per order)
- `/api/admin/ratings/unrated-orders` — follow-up queue
- `/api/admin/ratings/summary` — rating stats
- `/api/admin/ratings/followup/{order_number}` — update follow-up
- `/api/admin/commission/calculate` — preview margin distribution
- `/api/admin/performance/dashboard` — KPI data

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!`

## Backlog
- Twilio WhatsApp + Resend Email dispatch
- Sales commission personal dashboard
- Vendor product image upload pipeline
- Password-gated settings lock
