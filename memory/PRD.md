# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth

## System Status: DEPLOYMENT READY — Full Business Control System

## Sales Commission Dashboard (ENHANCED)
- Personal "My Earnings" view at `/staff/home`
- Commission KPIs: Expected, Pending Payout, Paid
- Ratings integrated from `customer_ratings` collection + legacy `orders.rating`
- Per-order commission table with status (pending/paid)
- Average Rating + Recent Ratings section
- Sales leaderboard with rating column
- No revenue/vendor cost/affiliate data exposed to sales

## Promotion Display (AMOUNT-BASED — System-wide)
- ALL customer-facing promotions show "Save TZS X" (NOT "X% off")
- Applied to: marketplace cards, group deals, homepage, deal of the day, referral page
- Admin profit calculator shows both amount and percentage for reference
- Original price → Current price → Amount saved

## Customer Rating System
- Token-based + phone-verified, one per order, 30-min delay
- RatingPrompt on Track Order for completed orders
- Admin unrated orders follow-up queue
- Feeds into KPI + sales dashboard

## Commission & Margin Distribution Engine
- Distributable margin (NOT revenue)
- ONE channel per order, wallet protected
- 5 channels: Direct/Assisted/Affiliate/Referral/Group Deal

## Track Order = Universal Status Page
- Radio selector: Phone/Reference/Email, single input
- Normal orders + GDC references + phone search + rating prompt

## Performance Dashboard (/admin/performance)
- KPI strip, channel split, profit-first sales leaderboard, earnings-only affiliate table
- Action panel with smart recommendations

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!`

## Next Priority
- Affiliate System Polish (application → approval → setup → dashboard)
- Resend Email Activation (hooks ready)
- Vendor product image upload pipeline

## Backlog
- Twilio WhatsApp messaging
- Password-gated settings lock
- Super Agent operational dashboard
