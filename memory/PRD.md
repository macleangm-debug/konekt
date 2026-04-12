# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) with unified login, role-based portals, payment processing, catalog, order management, growth/conversion engine.

## Core Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth

## System Principles
- Settings Hub = single source of truth | Pricing Tiers = SOLE source for economic logic
- ONE canonical document renderer | ONE closure engine | ONE Track Order route
- Business client validation: VRN + BRN required
- No duplicate routes or parallel logic
- Phone number = primary identity for order lookup + account mapping

## 3 Sales Modes (All Same Engine)
| Mode | Flow |
|---|---|
| Structured | Quote → Invoice → Order → Delivery → Completion |
| Remote | Order → Delivery → Public Confirmation |
| Walk-in/POS | Order → Payment → Auto Completion (confirmed_in_person) |

## Walk-in / POS Sale (/admin/walk-in-sale)
- One-screen POS UI: Cart (left) + Customer/Payment (right)
- Reuses catalog, pricing tiers, order system, closure engine
- sales_channel=walk_in, sales_contribution_type=assisted
- Auto-completes: closure_method=confirmed_in_person, closure_locked=true
- Business validation: VRN + BRN required for business walk-ins
- Generates invoice/receipt, no delivery note needed
- Sidebar: under COMMERCE group

## Account Mapping
- On registration: phone_normalized last 9 digits → match orders/invoices/delivery_notes
- Links historical records to new account automatically
- Primary: exact normalized phone | Secondary: email (unambiguous only)

## All Completed Systems
- Document System (Canonical Renderer, 4 Templates, WYSIWYG PDF)
- Delivery Closure (Dual-mode, locked records, audit trail)
- Public Completion (Token/Phone/Order # → 3-screen mobile flow)
- Track Order (6-step lifecycle, fulfillment-aware CTA, completion summary)
- Customer Portal (/account — enhanced with completion CTA, documents section)
- Settings Hub (unified typography, stamp auto-pull, pricing tiers enforcement)
- Business Client Validation (VRN + BRN, blocks compliance workflows)
- EFD Receipt Workflow (internal-only, on-demand)
- Data Integrity Dashboard (health score, compliance/order/fulfillment monitoring)
- Walk-in Sale (POS-style, auto-completion, assisted commission)
- Account Mapping (phone → historical orders on registration)

## Upcoming
1. Advanced Analytics Dashboard (revenue, volume, fulfillment, conversion funnel)
2. Data Integrity Dashboard refinement (deep links, action guidance)
3. Messaging Integration Hooks (prep only — event definitions, payload structure)

## Backlog
- Twilio WhatsApp / Resend Email (blocked on keys)

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`
