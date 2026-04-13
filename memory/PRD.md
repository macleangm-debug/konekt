# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth

## System Status: DEPLOYMENT READY — Batch 1 Complete

## 4 Sales Modes (Same Canonical Engine)
| Mode | Flow |
|---|---|
| Structured | Quote → Invoice → Order → Delivery → Completion |
| Remote | Order → Delivery → Public Confirmation |
| Walk-in/POS | Order → Payment → Auto Completion |
| Group Deal | Select Product → Set Pricing → Launch Campaign → Commitments → Finalize → Orders + VBO |

## Group Deal Campaign System (COMPLETE)

### Campaign Creation (Batch 1 — DONE)
- **Product from catalog ONLY** — no free text. Product selector searches marketplace_listings
- **Structured pricing**: Base Price (read-only from product) → Vendor Best Price (manual) → Group Deal Price (manual)
- **Live Profit Calculator**: margin/unit, %, total margin, SAFE/WARNING/BLOCKED status
- **Hard validation**: deal price > vendor cost, margin ≥ 5% threshold

### Core Rules
- Join = commitment ONLY — no orders, no auto-success
- Admin-controlled finalize → buyer orders + ONE aggregated VBO
- Success based on UNITS committed (not buyer count)
- Overflow allowed (112/100 valid)
- Duplicate join prevention (same phone)
- Campaign locked after finalize

### Display
- Buyers + units shown separately everywhere
- Global number formatting: TZS X,XXX,XXX (commas on all currency fields)
- CurrencyInput: formats on blur, raw on focus

### Deal of the Day
- `is_featured` flag — only 1 at a time, ≥30% progress required
- Homepage hero with urgency messaging
- Admin toggle

### Account Group Deals (/account/group-deals)
- Personal view of user's commitments
- Card-based mobile layout
- Links to orders (success) / shows refund status (failure)

### Safety
- 5% minimum margin
- Duplicate join prevention
- Campaign lock after finalize
- Refund amount = paid amount

## Customer Portal (Mobile-Optimized)
- Orders, Invoices, Quotes, Group Deals: Cards on mobile, table on desktop
- Document viewing: StandardDrawerShell
- Track Order + Confirm Completion accessible on mobile

## Messaging Event Hooks (Backend-Ready)
- 14 event types with standard payloads
- Wired into group deal lifecycle
- Resend API key configured

## Key API Endpoints
- `/api/admin/group-deals/products/search` — search catalog for deal creation
- `/api/admin/group-deals/campaigns` — CRUD
- `/api/admin/group-deals/campaigns/{id}/join` — multi-unit commitment
- `/api/admin/group-deals/campaigns/{id}/finalize` — orders + VBO
- `/api/admin/group-deals/campaigns/{id}/set-featured` — Deal of the Day
- `/api/public/group-deals/deal-of-the-day` — featured deal
- `/api/customer/group-deals?phone=X` — user's commitments

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Staff: `staff@konekt.co.tz` / `Staff123!`

## Next: Batch 2 — KPI & Performance System
1. Settings Hub: Performance & Growth Targets
2. KPI Engine (Backend): profit/user, earnings/affiliate, channel aggregation
3. Performance Dashboard (/admin/performance): KPI strip, channel split, sales leaderboard (profit-first), affiliate leaderboard (earnings-only), action panel

## Backlog
- Twilio WhatsApp Integration (hooks ready)
- Resend Email dispatch implementation
- Commission alignment with distributable margin
