# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) with unified login, role-based portals, payment processing, catalog, order management, growth/conversion engine.

## Core Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth

## System Principles (All Enforced)
- Settings Hub = single source of truth (3 groups: Business, Pricing Policy, Partner Policy)
- Pricing Tiers = SOLE source of truth for all economic logic
- ONE canonical document renderer (settings-driven, template-aware, WYSIWYG)
- ONE closure engine (admin + public, dual-mode: signed + confirmed)
- Business client validation: VRN + BRN required, blocks compliance workflows
- EFD receipts: internal-only, on-demand
- No unnecessary routes — reuse canonical pages/drawers/engines
- Phone number = primary identity for order lookup

## Completed Systems

### Document System
- Canonical Renderer: Quote, Invoice, Delivery Note, Service Handover
- 4 Templates: Classic/Modern/Compact/Premium with visual previews
- WYSIWYG PDF: html2canvas + jsPDF
- Client-type-aware: Individual vs Business blocks
- Footer live preview, settings-driven branding

### Delivery Closure System
- Dual-mode: Signed (signature pad) + Confirmed (staff on behalf)
- Records LOCKED after completion, full audit trail
- Same engine used by admin AND public

### Public Completion System
- 3 access modes: Token link, Phone lookup, Order # lookup
- Mobile-first 3-screen flow: Find → Review → Confirm
- Track Order page with 6-step lifecycle timeline

### Business Client Validation
- VRN + BRN enforced for business clients
- Blocks save + compliance workflows if missing
- CustomerDrawer360 shows business fields with Missing alerts

### EFD Receipt Workflow
- Internal-only trigger: POST /api/admin/efd/request/{invoice_id}
- Validates VRN+BRN for business clients
- EFD section on InvoicePreviewPage

### Customer Self-Service Portal (/account)
- Dashboard, My Orders, Quotes, Invoices, Marketplace, Services
- Order detail with completion CTA + documents section + completion summary
- Referrals, Statement, Profile, Settings, Help

### Data Integrity Dashboard (/admin/data-integrity)
- Health score gauge (0-100)
- Compliance: Missing VRN, Missing BRN, Pending EFD
- Order Health: Stuck Orders, Overdue Invoices, Orphan Orders
- Fulfillment: Unconfirmed Deliveries
- Detail drill-down for each issue type
- Accessible from sidebar under Reports & Analytics

### Settings Hub (Unified)
- Typography: Consistent text-[11px] uppercase labels across all 17 tabs
- Stamp: Auto-pull from Business Profile
- Sales/Affiliate: Source-of-truth banners → Pricing Tiers
- Templates: 4 visual preview cards
- Footer: Live preview

## Upcoming
- Advanced Analytics Dashboard
- Account mapping (phone→orders on account creation)

## Backlog
- Twilio WhatsApp / Resend Email (blocked on keys)

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`
