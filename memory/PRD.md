# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: LAUNCH READY — Fully Audited

## Comprehensive Audit Results (iteration_306) - ALL PASS
- **Route Cleanup**: ONE canonical affiliate form at /partners/apply. Old routes (/register/affiliate, /affiliate/portal, /affiliate/dashboard) all redirect properly
- **Structured Names**: 9 public forms updated (Checkout, CheckoutV2, GroupDealCheckout, AffiliateApply, QuoteRequest, OrderRequest, ServiceDetailLead, ExpansionPremium, SoftLeadCapture)
- **First-Name Personalization**: "Hi John," across payment flows, group deals, emails, track order. Fallback: "Hello,"
- **Terms of Service**: 6 sections at /terms (Affiliate, Promo Codes, Wallet, Group Deals, Payment, Ratings)
- **Password-Gated Settings Lock**: 15-minute sessions, protects Commercial/Sales/Affiliate/Payout tabs
- **Base Public URL**: Configurable in Business Profile settings

## All Complete Systems
- Affiliate System (Qualification form → Token activation → Setup wizard → Dashboard → Content Studio)
- Sales Promo Code System + Unified Creative Generator
- Group Deal Content Studio (role-based), quantity closure, repeat buyers
- Canonical Email Engine (Resend) with triggers + preview
- Commission & Margin Distribution Engine
- Customer Rating System + Track Order Universal Page
- Performance Dashboard (KPI)

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!` (code: STAFF2024)
- Affiliate: `qualifier.test@example.com` / `Qualifier123!`

## Next Priority
- Vendor Ops Role + Image Pipeline + Product Wizard (foundations)

## Backlog
- Full Vendor Ops Dashboard (SLA, fulfillment, performance)
- Vendor Proposal Document extension
- Downloadable Creative Image Generator
- Twilio WhatsApp Integration
