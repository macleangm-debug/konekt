# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) with unified login, role-based portals, payment processing, catalog, order management, growth/conversion engine.

## Core Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth

## System Principles (Enforced)
- Settings Hub = single source of truth
- Promotions: policy-driven, no manual discount
- StandardDrawerShell via Portal everywhere
- Categories: canonical dropdowns from /api/categories — no free text
- Phone: normalized +XXXXXXXXXXXXX via PhoneNumberField (58 countries) everywhere
- Discounts display as TZS amounts, never percentages
- Affiliate attribution: auto-captured, auto-applied

## Completed Features (All Tested — 10+ iterations, 100% pass)

### Core: Auth, catalog, checkout, orders, Stripe + bank payments, payment proofs
### Growth: Pricing engine, policy-driven promotions, affiliates (identity + payout), affiliate application flow, attribution
### Content: Content Studio (WYSIWYG, 4 layouts, dynamic branding), Sales Content Hub
### Admin: Settings Hub (15 sections), Business Settings, Branding Settings (phone standardized)
### Team: Overview (6 KPIs + table), Leaderboard, Alerts (actionable table with CTAs)
### Partner Ecosystem: KPI row (7 metrics), coverage/gap analysis, management table, drawer
### Weekly Digest: Executive report with KPIs, revenue by canonical category, operations, sales, ecosystem, alerts, actions
### Categories: /api/categories (25 cats + subcats), canonical dropdowns on product/service/inventory/vendor forms
### Phone: PhoneNumberField (58 countries, flag+name+dial, search, keyboard nav, mobile bottom sheet) — applied to affiliates, applications, branding
### UI/UX: StandardDrawerShell (Portal), CRM contained, all % display removed, no duplicate sidebar entries, all retired routes redirect

## Sidebar Structure (Clean — verified)
Dashboard | Commerce (Orders, Quotes, Payments, Invoices, Discounts) | Catalog (Catalog, Approvals, Vendors, Supply Review) | Customers (Customers, CRM) | Partners (Ecosystem) | Growth (Affiliates, Applications, Payouts, Promotions, Content Studio) | Finance (Cash Flow, Commissions) | Team (Overview, Leaderboard, Alerts) | Operations (Deliveries, Notes, POs, Requests) | Reports (Business Health, Financial, Sales, CX, Risk, Product Insights, Inventory, Weekly Performance, Weekly Digest, Action Center) | Settings (Hub, Users)

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`

## Backlog
- Twilio WhatsApp / Resend Email (blocked on keys)
- Backend creative rendering, Advanced Analytics Dashboard, Data Integrity Dashboard
