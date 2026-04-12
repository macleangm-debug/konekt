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
- Pricing Tiers = single source of truth for all economic logic
- Delivery closure = official completion signal (triggers distribution release)

## Settings Hub Structure (Canonical)
### Business (8 tabs)
- Profile, Payment Details, Document Branding, Document Numbering
- Document Footer (with LIVE PREVIEW), Document Template (4 templates with VISUAL PREVIEW CARDS)
- Notifications, Report Delivery

### Pricing Policy (5 tabs)
- Pricing Tiers, Distribution Rules, Sales & Commission, Payout Settings, Launch Controls

### Partner Policy (4 tabs)
- Affiliate Policy, Vendor Policy, Partner Config, Operational Rules

## Document System (Phase B — Complete)

### Canonical Document Renderer
- Single shared component: `CanonicalDocumentRenderer.jsx`
- Renders: Quote, Invoice, Delivery Note, Service Handover
- Template-aware: Classic Corporate, Modern Clean, Compact Commercial, Premium Branded
- Settings-driven via unified `/api/documents/render-settings`
- Client-type-aware: Individual vs Business blocks
- WYSIWYG PDF export: html2canvas + jsPDF

### Document Flow
1. Quote → 2. Invoice → 3. Order → 4. Delivery Note / Service Handover

## Delivery Closure System (P0 — Complete)

### Dual-Mode Completion Engine
- **Signed mode**: Receiver signs digitally (signature required)
  - Status: `completed_signed`
  - Fields: receiver_name, receiver_designation, receiver_signature, completed_at
- **Confirmed mode**: Staff confirms on behalf of client (no signature)
  - Status: `completed_confirmed`
  - Fields: receiver_name, receiver_designation, completion_note, authorization_source, confirmed_by_user
  - Requires confirmation checkbox

### Closure Rules
- Records are LOCKED after completion (closure_locked=true)
- Locked records cannot be modified (returns 400)
- Closure method is explicitly recorded and visible
- Completion Summary Card shows full audit trail
- Closure proof renders inside canonical document for PDF export

### Status Flow
issued → in_transit → pending_confirmation → completed_signed/completed_confirmed
Any non-completed status → cancelled

### Completion as Distribution Trigger
- Delivery closure = official release point for post-fulfillment distribution logic
- Do NOT release rewards/commissions on document creation alone

## Completed Features (All Tested, 100% Pass Rate)
- Core Platform, Growth & Conversion, Content Studio, Team Performance
- Partner Ecosystem, Weekly Digest, Categories, Phone, UI/UX Stabilization
- Settings Hub Phase A Restructure
- Phase B-1: Canonical Document Renderer (Quote, Invoice, Delivery Note)
- Phase B-2: Document Template Support (4 templates)
- Phase B-3: Delivery Note Closure Workflow (single mode)
- P0: Enhanced Dual-Mode Delivery Closure (signed + confirmed, locking, audit trail)

## Upcoming (Priority Order)
1. Public Completion System (token-based link, phone lookup, order number — reuses closure engine)
2. Settings Hub Final Alignment Pass (typography, stamp auto-pull, pricing source-of-truth)
3. Business Client Validation (VRN + BRN required for business type)
4. Client Detail Display Configuration (Individual vs Business in documents)
5. EFD Receipt On-Demand Workflow
6. Customer Self-Service Portal

## Backlog
- Twilio WhatsApp / Resend Email (blocked on keys)
- Advanced Analytics, Data Integrity Dashboard

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`
