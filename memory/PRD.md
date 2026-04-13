# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth

## System Status: DEPLOYMENT READY — Full Financial Control Active

## Commission & Margin Distribution Engine (COMPLETE)
- Commission from **distributable margin** (NOT revenue)
- **ONE channel per order** — no mixing (enforced)
- 5 channels: Direct, Assisted, Affiliate, Referral, Group Deal
- **Priority order**: Vendor Cost → Stakeholder Allocations → Company Core → Promotion Reserve → Wallet
- Wallet uses ONLY flexible margin (promotion reserve + remaining)
- API: `/api/admin/commission/calculate` for previewing allocations

### Channel Commission Rules
| Channel | Sales | Affiliate | Referral | Company |
|---------|-------|-----------|----------|---------|
| Direct | 15% of margin | - | - | 8% core |
| Assisted | 10% of margin | - | - | 8% core |
| Affiliate | 5% support | 10% of margin | - | 8% core |
| Referral | - | - | 10% of margin | 8% core |
| Group Deal | Campaign-level | Campaign-level | - | Majority |

### Settings Hub — Financial Controls
- Wallet: enabled/disabled, max per order, max % per order, protect allocations toggle
- Channel: enforce single channel per order toggle
- Ratings: enabled, trigger (delivery_confirmed), scale (1-5), allow comment
- Sales visibility: commission display controls (total/monthly/pending/paid)

## Track Order = Universal Status Page (UX Simplified)
- **Radio selector**: Phone (default) / Order-Deal Reference / Email
- Only ONE input visible at a time — zero confusion
- Phone search → group deal commitments
- GDC-ref search → group deal status (full-width card)
- ORD-ref search → normal order lifecycle

## Performance Dashboard (/admin/performance)
- KPI strip, channel split, sales leaderboard (profit-first), affiliate leaderboard (earnings-only)
- Action panel with smart recommendations
- Rating quality metrics in KPI settings

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!`

## Backlog
- Twilio WhatsApp + Resend Email dispatch (hooks ready)
- Customer rating system (post-completion 1-5 stars)
- Sales commission dashboard (personal view)
- Vendor product image upload pipeline (WebP, thumbnails)
