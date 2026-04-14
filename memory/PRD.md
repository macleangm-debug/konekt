# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth

## System Status: DEPLOYMENT READY — Full Business Control System + Affiliate Growth Engine

## Affiliate System (Full Controlled Program) - NEW
- **Application Gate**: Public apply page at `/partners/apply` with Apply Now + Check Status tabs
- **Admin Review**: Applications panel at `/admin/affiliate-applications` with stats banner, approve/reject with admin notes, max affiliates control
- **Setup Wizard**: Mandatory 3-step onboarding (Payout Details -> Custom Promo Code -> Confirmation). Dashboard blocked until complete
- **Affiliate Dashboard**: Earnings-only KPIs (no revenue/profit/vendor cost), target progress bars, wallet summary, content studio
- **Content Studio**: Auto-injects affiliate's promo code + tracking link into share captions. Quick Share copies caption+link+code in one tap
- **Contract Tiers**: Starter (1m), Growth (3m), Top Performer (6m) with min deals and earnings targets
- **Status Engine**: active/warning/probation/suspended with configurable thresholds
- **Notifications**: Setup complete, performance warning, account at risk, contract changes
- **Promo Code Auto-Fill**: `?ref=CODE` from affiliate links auto-captured via attribution system and applied at checkout

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
- Original price -> Current price -> Amount saved

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
- Test Affiliate: `wizard.test@example.com` / `5cf702ec-737` (setup complete, code: WIZARD2024)

## Next Priority
- Resend Email Activation (hooks ready, needs dispatch wiring)
- Vendor Product Image Pipeline
- Super Agent Operational Dashboard

## Backlog
- Twilio WhatsApp messaging
- Password-gated settings lock

## Key DB Collections (Affiliate)
- `affiliate_applications`: Application records with status (pending/approved/rejected), admin_notes, reviewed_at
- `affiliates`: Active affiliate records with setup_complete, affiliate_code, payout_method, contract_tier, performance_status
- `affiliate_notifications`: Notification records for affiliates
- `payout_accounts`: Saved payout methods (mobile_money/bank_transfer)
- `affiliate_commissions`: Commission records per order

## Key API Endpoints (Affiliate)
- `POST /api/affiliate-applications` - Submit application (public)
- `GET /api/affiliate-applications/check/{email}` - Check status (public)
- `GET /api/affiliate-applications/stats` - Stats for admin
- `POST /api/affiliate-applications/{id}/approve` - Approve with user creation
- `POST /api/affiliate-applications/{id}/reject` - Reject with notes
- `GET /api/affiliate-program/my-status` - Setup status check
- `POST /api/affiliate-program/setup/payout` - Save payout details
- `POST /api/affiliate-program/setup/promo-code` - Create unique promo code
- `POST /api/affiliate-program/setup/complete` - Mark setup done
- `GET /api/affiliate-program/campaigns` - Content studio campaigns
- `GET /api/affiliate-program/my-performance` - Targets vs actuals
- `GET /api/affiliate-program/notifications` - Affiliate notifications
- `POST /api/affiliate-program/admin/evaluate/{id}` - Evaluate affiliate status
- `POST /api/affiliate-program/admin/update-tier/{id}` - Change contract tier
- `POST /api/affiliate-program/admin/update-status/{id}` - Set performance status
