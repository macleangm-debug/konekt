# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: LAUNCH READY — Full Business Control + Growth Engine + Email + Activation System

## Affiliate Application (Qualification-Based) - ENHANCED
- **5-Section Form**: Personal Info, Online Presence (platform, audience, social links), Promotion Strategy, Commitment (expected sales, weekly activity), Agreement
- **Admin Qualification Summary**: Audience size, primary platform, expected monthly sales, prior experience, fit score (High/Medium/Low)
- **Token-Based Activation**: On approval, secure 48h single-use activation token generated
- **Dual Channel**: Email auto-sent + WhatsApp button in admin drawer (prefilled message with link)
- **Activation Page**: `/activate?token=XYZ` — password creation, then login, then setup wizard
- **Activation Tracking**: email_sent, whatsapp_opened, activated, setup_completed — all visible in admin
- **Application Emails**: Received (auto), Approved (with activation CTA), Rejected (with reason)
- **SLA**: Configurable "48-72 hours" response text in Settings Hub

## Sales Promo Code System
- Personal promo codes for sales staff, validated across system
- Content Studio on Sales Dashboard with campaign cards
- `sales_promo_codes_enabled` toggle in Settings Hub

## Unified Creative Generator
- ONE shared engine across Admin/Sales/Affiliate
- Role-based promo injection, amount-based promotions only

## Canonical Email Engine (Resend)
- Settings-driven templates, 9 trigger toggles, email preview in admin
- Order Completed email with staff name + "Rate Your Experience" CTA (rate-limited)

## Affiliate System (Full Controlled Program)
- Setup Wizard: Payout -> Promo Code -> Confirm (dashboard blocked until complete)
- Dashboard: Earnings-only KPIs, target progress, content studio, wallet, notifications
- Contract Tiers: Starter/Growth/Top with configurable targets
- Status Engine: active/warning/probation/suspended

## Base Public URL Setting
- Single configurable source for all external links (affiliates, sales, referrals, activation, sharing)
- In Settings Hub under Business Profile

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!` (promo code: STAFF2024)
- Test Affiliate: `qualifier.test@example.com` / `Qualifier123!`
- Legacy Test: `wizard.test@example.com` / `5cf702ec-737` (code: WIZARD2024)

## Next Priority
- Vendor Product Image Pipeline
- Super Agent Operational Dashboard
- Group Deal WhatsApp rich share message

## Backlog
- Twilio WhatsApp Integration
- Password-Gated Settings Lock
- Downloadable Creative Image Generator (Phase 2)
- Terms of Service update (Affiliate, Promo Codes, Wallet, Group Deals, Ratings)
- Vendor Proposal Document extension
