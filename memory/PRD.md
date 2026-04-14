# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: DEPLOYMENT READY — Full Business Control System + Growth Engine + Email System

## Sales Promo Code System - NEW
- **Personal promo codes** for sales staff (same validation as affiliate codes)
- Validated uniqueness across affiliates, other sales, and promotions
- `sales_promo_codes_enabled` toggle in Settings Hub
- Attribution chain: `?ref=CODE` -> checkout auto-fill -> commission mapped

## Unified Creative Generator - NEW  
- **ONE shared engine** (`/app/backend/services/creative_generator_service.py`)
- Role-based promo injection: Admin (no code), Sales (sales code), Affiliate (affiliate code)
- Always uses amount-based promotions ("Save TZS X", never percentages)
- Campaign cards with: Copy Caption, Copy Link, Quick Share (copies all in one tap)
- Content Studio added to Sales Dashboard (`SalesPromoStudio` component)

## Canonical Email Engine - NEW
- **Settings-driven**, brand-consistent email templates via Resend API
- Pulls branding from Business Settings (logo, colors, company name, footer)
- **Email trigger toggles** in Settings Hub (9 triggers independently toggleable):
  - Payment Submitted, Payment Approved, Order Confirmed, Order Completed
  - Group Deal Joined, Group Deal Successful, Withdrawal Approved
  - Affiliate Application Approved, Rating Request
- **Order Completed Email**: Includes sales/service person name + "Rate Your Experience" CTA
  - Rate-limited: only sent once per order via `email_sent_log` collection
  - CTA only shown if order not already rated
- **Email Template Preview** in Settings Hub admin
- All emails: mobile-friendly, clean design, consistent branding

## Affiliate System (Full Controlled Program)
- **Application Gate**: Public apply page with Apply Now + Check Status tabs
- **Admin Review**: Stats banner, approve/reject with notes, max affiliates control
- **Setup Wizard**: Payout Details -> Custom Promo Code -> Confirmation (dashboard blocked until complete)
- **Dashboard**: Earnings-only KPIs, target progress, wallet, content studio
- **Contract Tiers**: Starter (1m), Growth (3m), Top Performer (6m) with configurable targets
- **Status Engine**: active/warning/probation/suspended with auto-evaluation

## Sales Commission Dashboard
- Personal "My Earnings" view at `/staff/home`
- Commission KPIs + Ratings + Promo Code Studio

## Promotion Display (AMOUNT-BASED — System-wide)
- ALL customer-facing promotions show "Save TZS X" (NOT "X% off")

## Customer Rating System
- Token-based + phone-verified, one per order, 30-min delay

## Commission & Margin Distribution Engine
- Distributable margin, ONE channel per order, wallet protected, 5 channels

## Track Order = Universal Status Page
- Radio selector, normal orders + GDC + phone search + rating prompt

## Performance Dashboard (/admin/performance)
- KPI strip, channel split, profit-first sales leaderboard, earnings-only affiliate table

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!` (promo code: STAFF2024)
- Test Affiliate: `wizard.test@example.com` / `5cf702ec-737` (code: WIZARD2024)

## Key API Endpoints (New)
- `GET/POST /api/sales-promo/my-code|create-code|validate-code|campaigns` - Sales promo system
- `GET /api/admin/email/preview/{template}|triggers` - Email management
- `POST /api/admin/email/test-send` - Test email

## Next Priority
- Vendor Product Image Pipeline
- Super Agent Operational Dashboard

## Backlog
- Twilio WhatsApp messaging
- Password-gated settings lock
- Downloadable Creative Image Generator (Phase 2)
