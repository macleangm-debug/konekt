# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth

## System Status: DEPLOYMENT READY — Track Order Fixed

## Track Order = Universal Status Page (VERIFIED ON LIVE PAGE)
- `/track-order` supports: normal orders, GDC references, phone-only search
- Full-width group deal result cards (lg:col-span-2)
- All 6 group deal states: pending_payment, payment_submitted, committed, order_created, refund_pending, refunded
- Campaign progress bar with units, buyers, days left
- Normal order: timeline, fulfillment-aware CTA, completion summary

## Group Deal Checkout (Canonical — No Popup)
- Detail → `/group-deals/checkout?campaign_id=X` → Details → Payment & Proof (bank details) → Confirmation
- Bank details identical to normal checkout (CRDB BANK)
- Payment: pending_payment → payment_submitted → admin approve → committed (count increments)

## Key API Endpoints
- `/api/admin/group-deals/campaigns/{id}/join` — pending_payment + commitment_ref
- `/api/public/group-deals/submit-payment` — payment proof
- `/api/admin/group-deals/commitments/{ref}/approve-payment` — admin approve
- `/api/admin/group-deals/commitments/pending-payments` — queue
- `/api/public/group-deals/track` — track by phone or ref
- `/api/public/payment-info` — bank details

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!`

## Next: Batch 2 — KPI & Performance System
1. Settings Hub: Performance & Growth Targets
2. KPI Engine: profit/user, earnings/affiliate, channel aggregation
3. Performance Dashboard (/admin/performance)

## Backlog
- Twilio WhatsApp + Resend Email dispatch
- Commission alignment with distributable margin
