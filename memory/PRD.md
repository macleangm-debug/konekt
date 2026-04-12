# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) with unified login, role-based portals, payment processing, catalog, order management, growth/conversion engine.

## Core Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth

## System Principles (All Enforced)
- Settings Hub = single source of truth (3 groups: Business, Pricing Policy, Partner Policy)
- Promotions: policy-driven, no manual discount
- StandardDrawerShell via Portal everywhere
- Categories: canonical dropdowns from /api/categories
- Phone: normalized +XXXXXXXXXXXXX via PhoneNumberField (58 countries)
- Discounts display as TZS amounts, never percentages
- Country → Currency auto-mapping in settings

## Settings Hub Structure (Canonical)
### Business (8 tabs)
- Profile (country→currency mapping)
- Payment Details
- Document Branding (logo, signature+color, stamp shape+color)
- Document Numbering (Quote/Invoice/Order/DN/PO/SKU: prefix, type, digits, start)
- Document Footer (address/email/phone/registration toggles + custom text)
- Document Template (Classic/Modern/Compact/Premium — placeholder for Phase B)
- Notifications
- Report Delivery

### Pricing Policy (5 tabs)
- Pricing Tiers, Distribution Rules, Sales & Commission, Payout Settings, Launch Controls

### Partner Policy (4 tabs)
- Affiliate Policy, Vendor Policy, Partner Config, Operational Rules

## Completed Features (All Tested)
- Core Platform, Growth & Conversion, Content Studio, Team Performance
- Partner Ecosystem (KPI + management table + gaps)
- Weekly Digest (executive report)
- Categories (canonical), Phone (global), UI/UX Stabilization
- Settings Hub Phase A Restructure (3 groups + document controls)

## Upcoming (Phase B)
- Document rendering hardening (WYSIWYG, canonical design system)
- Document templates implementation
- Delivery Note / Service Handover closure workflow
- Stamp generation from business profile fields

## Backlog
- Twilio WhatsApp / Resend Email (blocked on keys)
- Backend creative rendering, Advanced Analytics, Data Integrity Dashboard

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`
