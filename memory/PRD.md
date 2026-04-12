# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) with unified login, role-based portals, payment processing, catalog, order management, growth/conversion engine.

## Core Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth

## System Principles (All Enforced)
- Settings Hub = single source of truth (3 groups: Business, Pricing Policy, Partner Policy)
- Pricing Tiers = SOLE source of truth for all economic logic (margins, distribution, commissions)
- Sales/Affiliate/Distribution tabs READ from Pricing Tiers — no independent override percentages
- Stamp fields auto-pull from Business Profile (no manual re-entry)
- Canonical Document Renderer for all document types (settings-driven, template-aware, WYSIWYG)
- ONE closure engine for admin + public (dual-mode: signed + confirmed)
- Phone number = primary identity for order lookup (account-optional)
- No unnecessary routes — reuse existing canonical pages/drawers/engines

## Settings Hub Structure (Canonical — Typography Unified)
### Business (8 tabs)
- Profile, Payment Details, Document Branding (stamp auto-pull, signature persistence)
- Document Numbering, Document Footer (LIVE PREVIEW), Document Template (4 VISUAL PREVIEW CARDS)
- Notifications, Report Delivery

### Pricing Policy (5 tabs)
- Pricing Tiers (SOLE source of truth), Distribution Rules, Sales & Commission (reads from tiers)
- Payout Settings, Launch Controls

### Partner Policy (4 tabs)
- Affiliate Policy (reads from tiers), Vendor Policy, Partner Config, Operational Rules

## Document System (Complete)
- Canonical Renderer: Quote, Invoice, Delivery Note, Service Handover
- Templates: Classic Corporate, Modern Clean, Compact Commercial, Premium Branded
- WYSIWYG PDF: html2canvas + jsPDF
- Client-type-aware: Individual vs Business blocks
- Unified settings: `/api/documents/render-settings`

## Delivery Closure System (Complete)
- Dual-mode: Signed (signature) + Confirmed (staff on behalf)
- Records LOCKED after completion
- Full audit trail: method, receiver, designation, timestamp, authorization source

## Public Completion System (Complete)
- 3 access modes: Token link, Phone lookup, Order # lookup
- Mobile-first 3-screen flow: Find → Review → Confirm
- Reuses same closure engine (no duplication)

## Track Order (Full Lifecycle — Complete)
- 6-step timeline: Placed → Confirmed → In Progress → Ready/Dispatched → Awaiting Confirmation → Completed
- Fulfillment-aware CTA: Confirm Delivery / Pickup / Service Handover
- Completion summary after closure (receiver, method, timestamp)
- Current step highlighted in gold (#D4A843)

## Settings Hub Final Alignment (Complete)
- Typography: Unified text-[11px] font-semibold uppercase tracking-wider labels across ALL tabs
- Stamp: Auto-pull from Business Profile (company name, location, BRN, TIN) — read-only display
- Stamp: Field visibility toggles (show company, location, registration, TIN)
- Signature: Persistent preview after save
- Sales & Commission: Source-of-truth banner → Pricing Tiers
- Affiliate Policy: Source-of-truth banner → Pricing Tiers
- Document Template: 4 visual preview cards with mini document mockups
- Document Footer: Live preview reflecting toggle states

## Upcoming
1. Business Client Validation (VRN + BRN required for business type)
2. Client Detail Display Configuration (Individual vs Business in documents)
3. EFD Receipt On-Demand Workflow
4. Customer Self-Service Portal

## Backlog
- Twilio WhatsApp / Resend Email (blocked on keys)
- Advanced Analytics, Data Integrity Dashboard
- Account mapping (phone→orders on account creation)

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`
