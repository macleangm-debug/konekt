# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: LAUNCH READY — Full Growth Engine + Legal + Security

## Structured Name Fields + Personalization - NEW
- All customer forms use first_name + last_name (checkout, group deal, affiliate apply)
- "Hi John," personalization across: payments, group deals, track order, emails, dashboards
- Fallback: extract first token from full_name; "Hello," if missing
- NOT used in invoices/quotes/PDFs (stay formal)

## Terms of Service - NEW
- 6 sections at /terms: Affiliate Program, Promo Codes & Attribution, Wallet Usage, Group Deals, Payment Verification, Ratings & Feedback

## Password-Gated Settings Lock - NEW
- Admin enters password to unlock sensitive settings (Commercial, Sales, Affiliate, Payout tabs)
- 15-minute time-limited sessions with countdown timer
- Auto-lock + manual re-lock

## Route Cleanup
- /register/affiliate → redirects to /partners/apply (canonical form)

## Previous Systems (All Complete)
- Affiliate System (Qualification form, token activation, dual-channel, content studio, contracts, status engine)
- Sales Promo Code System + Unified Creative Generator
- Group Deal Content Studio (role-based), quantity closure, repeat buyers
- Canonical Email Engine (Resend) with 9 trigger toggles
- Commission & Margin Distribution Engine
- Customer Rating System
- Track Order Universal Page
- Performance Dashboard

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!` (code: STAFF2024)
- Affiliate: `qualifier.test@example.com` / `Qualifier123!`

## Next Priority
- Vendor Ops Role + Image Pipeline + Product Wizard (foundations)
- Vendor Management Dashboard (skeleton)

## Backlog
- Vendor Proposal Document extension
- Full Vendor Ops Dashboard (SLA, fulfillment tracking, performance)
- Downloadable Creative Image Generator
- Twilio WhatsApp Integration
