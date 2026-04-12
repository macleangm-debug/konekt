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
- Pricing Tiers = single source of truth for all economic logic
- Delivery closure = ONE canonical closure engine (admin + public reuse same logic)
- Phone number = primary identity for order lookup (account-optional)

## Document System (Phase B — Complete)
- Canonical Document Renderer: Quote, Invoice, Delivery Note, Service Handover
- Template-aware: Classic Corporate, Modern Clean, Compact Commercial, Premium Branded
- WYSIWYG PDF export: html2canvas + jsPDF
- Unified settings via `/api/documents/render-settings`

## Delivery Closure System (P0 — Complete)
### Dual-Mode Completion Engine
- **Signed mode**: receiver_name + receiver_signature → `completed_signed`
- **Confirmed mode**: receiver_name + completion_note + authorization_source → `completed_confirmed`
- Records LOCKED after completion. Full audit trail.
- Same engine used by admin AND public interfaces.

### Status Flow
issued → in_transit → pending_confirmation → completed_signed/completed_confirmed

## Public Completion System (Complete)
### 3 Access Modes
1. **Token link** (primary): `/confirm-completion?token=xyz` — auto-resolves
2. **Phone lookup**: Enter phone → find pending deliveries → select → confirm
3. **Order number**: Enter order # → find linked delivery notes → confirm

### Mobile-First 3-Screen Flow
1. Find Order (phone/order # toggle)
2. Review (delivery details card)
3. Confirm (sign or confirm mode → Complete & Lock)

### Track Order Integration
- Track Order page shows "Confirm Delivery" CTA when status = dispatched/in_transit/awaiting_confirmation
- Links to `/confirm-completion?order={order_number}`

### API Endpoints
- `GET /api/public/completion/token/{token}` — resolve by token
- `GET /api/public/completion/phone/{phone}` — phone lookup (pending only)
- `GET /api/public/completion/order/{order_number}` — order lookup
- `POST /api/public/completion/close/{dn_id}` — public close (same validation as admin)

## Completed Features (All Tested)
- Core Platform, Growth & Conversion, Content Studio, Team Performance
- Partner Ecosystem, Weekly Digest, Categories, Phone, UI/UX Stabilization
- Settings Hub Phase A Restructure
- Phase B: Canonical Document Renderer + Template Support + Footer Live Preview
- P0: Enhanced Dual-Mode Delivery Closure (signed + confirmed, locking, audit trail)
- Public Completion System (token + phone + order lookup, mobile-first flow)

## Upcoming (Priority Order)
1. Settings Hub Final Alignment Pass (typography, stamp auto-pull, pricing source-of-truth)
2. Business Client Validation (VRN + BRN required for business type)
3. Client Detail Display Configuration (Individual vs Business in documents)
4. EFD Receipt On-Demand Workflow
5. Customer Self-Service Portal

## Backlog
- Twilio WhatsApp / Resend Email (blocked on keys)
- Advanced Analytics, Data Integrity Dashboard
- Account mapping (phone-based: when user creates account, link previous orders)

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`
