# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: LAUNCH READY — Full Growth Engine

## Group Deal Content Studio (Unified) - NEW
- **ONE shared engine** across Admin, Sales, Affiliate
- Group deals + products in Content Studio with auto-injected promo codes
- Role-based: Admin (no code required), Sales/Affiliate (code required — blocked until set)
- Rich WhatsApp share after payment: deal name + savings (TZS amount) + units bought + progress

## Group Deal Logic Fixes - NEW
- **Quantity-based immediate closure**: Deal becomes "successful" when committed units >= target (not just on deadline)
- **Repeat buyers allowed**: Same user can buy more units in same campaign (only pending_payment duplicates blocked)
- **Overflow allowed**: Units can exceed target without blocking
- **Success email**: All committed users notified when deal reaches target

## Affiliate Application (Qualification-Based)
- 5-Section Form: Personal Info, Online Presence, Promotion Strategy, Commitment, Agreement
- Admin Qualification Summary: Audience, platform, expected sales, experience, fit score (High/Medium/Low)
- Token-Based Activation (48h, single-use) + Dual Channel (Email + WhatsApp)
- Application Emails: Received, Approved (with CTA), Rejected

## Sales Promo Code System
- Personal promo codes, validated system-wide, Content Studio on Sales Dashboard

## Unified Creative Generator
- ONE shared engine, role-based injection, amount-based only

## Canonical Email Engine (Resend)
- Settings-driven templates, 9 trigger toggles, email preview, rate-limiting

## Affiliate System (Full Controlled Program)
- Setup Wizard, Earnings-only Dashboard, Contract Tiers, Status Engine, Notifications

## Base Public URL Setting
- Single configurable source for all external links

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!` (code: STAFF2024)
- Affiliate: `qualifier.test@example.com` / `Qualifier123!`
- Legacy: `wizard.test@example.com` / `5cf702ec-737` (code: WIZARD2024)

## Next Priority
- Vendor Product Image Pipeline
- Super Agent Operational Dashboard

## Backlog
- Terms of Service update
- Vendor Proposal Document extension
- Password-Gated Settings Lock
- Twilio WhatsApp Integration
- Downloadable Creative Image Generator (Phase 2)
