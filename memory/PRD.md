# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) with unified login, role-based portals, payment processing, catalog, order management, growth/conversion engine.

## Core Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth

## System Status: Production-Grade (All Systems Complete)

## 3 Sales Modes (Same Engine)
| Mode | Flow |
|---|---|
| Structured | Quote → Invoice → Order → Delivery → Completion |
| Remote | Order → Delivery → Public Confirmation |
| Walk-in/POS | Order → Payment → Auto Completion |

## Completed Systems (100% Tested)

### Core Platform
- Multi-role auth (Admin, Staff, Customer, Vendor, Affiliate)
- Catalog (products + services), Canonical categories
- Order management, Payment processing (Stripe)

### Document System
- Canonical Renderer: Quote, Invoice, Delivery Note, Service Handover
- 4 Templates (Classic/Modern/Compact/Premium), WYSIWYG PDF
- Client-type-aware, Settings-driven branding

### Delivery Closure
- Dual-mode: Signed + Confirmed, records LOCKED
- Public Completion: Token/Phone/Order # → 3-screen mobile flow

### Walk-in / POS Sale (/admin/walk-in-sale)
- One-screen POS: Cart (7/12) + Customer/Payment (5/12)
- Auto-completion: confirmed_in_person, assisted commission
- Business validation, invoice/receipt generation

### Advanced Analytics (/admin/analytics)
- KPI strip: Revenue, Orders, Completion %, Avg Order, Channel %
- Revenue trend chart with period selector (7d/30d/90d)
- Key Insights panel (dark, executive-grade)
- Channel Performance: Structured/Walk-in/Affiliate breakdown
- Conversion Funnel: Quotes → Invoices → Orders → Completed
- Operations Health: Stale orders, Overdue invoices, Pending confirmations
- Top Performers: Customers, Sales staff

### Data Integrity Dashboard (/admin/data-integrity)
- Health score gauge (0-100)
- Compliance, Order Health, Fulfillment categories with drill-down

### Settings Hub (Unified)
- 17 tabs across 3 groups, consistent typography
- Stamp auto-pull, signature persistence, template previews, footer live preview
- Pricing Tiers = sole source of truth

### Business Client Validation
- VRN + BRN required for business clients

### EFD Receipt Workflow
- Internal-only, on-demand, VRN/BRN gate

### Customer Portal (/account)
- Dashboard, Orders (with Confirm CTA), Quotes, Invoices, Documents

### Account Mapping
- Phone → historical orders on registration

### Track Order (/track-order)
- 6-step lifecycle, fulfillment-aware CTA, completion summary

## Upcoming / Backlog
- Messaging Integration Hooks (Twilio/Resend — blocked on keys)
- Customer portal refinement (mobile-first cards)

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`
