# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) with unified login, role-based portals, payment processing, catalog, order management, growth/conversion engine.

## Core Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth

## System Principles (All Enforced)
- Settings Hub = single source of truth (Business, Pricing Policy, Partner Policy)
- Pricing Tiers = SOLE source of truth for all economic logic
- ONE canonical document renderer (settings-driven, template-aware, WYSIWYG)
- ONE closure engine (admin + public, dual-mode: signed + confirmed)
- ONE Track Order route (/track-order) — 6-step lifecycle, fulfillment-aware CTA
- Business client validation: VRN + BRN required
- EFD receipts: internal-only, on-demand
- No duplicate routes — all flows reuse canonical components

## Completed Systems (All Verified, 100% Pass)

### Document System
- Canonical Renderer: Quote, Invoice, Delivery Note, Service Handover
- 4 Templates: Classic/Modern/Compact/Premium with visual previews
- WYSIWYG PDF: html2canvas + jsPDF, client-type-aware

### Delivery Closure
- Dual-mode: Signed + Confirmed, records LOCKED, full audit trail
- Public Completion: Token/Phone/Order # → 3-screen mobile flow

### Track Order (/track-order — Canonical)
- 6-step timeline: Placed → Confirmed → In Progress → Ready/Dispatched → Awaiting Confirmation → Completed
- Current step highlighted in gold (#D4A843)
- Fulfillment-aware CTA: Confirm Delivery/Pickup/Service Handover
- Completion summary after closure (receiver, method, timestamp)
- No duplicate routes exist

### Customer Portal (/account)
- Dashboard with KPIs, Order History, Spend Trends
- My Orders: table with Confirm button for dispatched orders, Reorder for others
- Order Detail: completion CTA + documents section + completion summary
- Quotes, Invoices, Services, Referrals, Statement, Profile

### Settings Hub (Unified)
- Typography consistent across all 17 tabs
- Stamp auto-pull from Business Profile
- Sales/Affiliate: Pricing Tiers source-of-truth banners
- Templates: 4 visual preview cards, Footer: live preview

### Business Client Validation
- VRN + BRN enforced, CustomerDrawer360 shows fields with Missing alerts

### EFD Receipt Workflow
- Internal-only trigger, VRN/BRN validation gate, section on InvoicePreviewPage

### Data Integrity Dashboard (/admin/data-integrity)
- Health score gauge (0-100)
- Compliance: Missing VRN/BRN, Pending EFD
- Order Health: Stuck Orders, Overdue Invoices, Orphan Orders
- Fulfillment: Unconfirmed Deliveries
- Detail drill-down, sidebar navigation under Reports & Analytics

## Upcoming
- Advanced Analytics Dashboard (revenue, margins, performance)
- Account mapping (phone→orders on account creation)

## Backlog
- Twilio WhatsApp / Resend Email (blocked on keys)

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`
