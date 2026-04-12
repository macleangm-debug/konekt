# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) with unified login, role-based portals, payment processing, catalog, order management, growth/conversion engine.

## Core Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth

## System Principles (All Enforced)
- Settings Hub = single source of truth (3 groups: Business, Pricing Policy, Partner Policy)
- Pricing Tiers = SOLE source of truth for all economic logic
- Canonical Document Renderer: settings-driven, template-aware, WYSIWYG
- ONE closure engine: admin + public, dual-mode (signed + confirmed)
- Business client validation: VRN + BRN required, blocks compliance workflows if missing
- EFD receipts: internal-only, on-demand, not auto-generated
- No unnecessary routes — reuse canonical pages/drawers/engines
- Phone number = primary identity for order lookup

## Document System (Complete)
- Canonical Renderer: Quote, Invoice, Delivery Note, Service Handover
- Templates: Classic Corporate, Modern Clean, Compact Commercial, Premium Branded
- WYSIWYG PDF: html2canvas + jsPDF
- Client-type-aware: Individual vs Business blocks

## Delivery Closure System (Complete)
- Dual-mode: Signed + Confirmed (staff on behalf)
- Records LOCKED after completion, full audit trail
- Public Completion System: Token link + Phone lookup + Order #

## Business Client Validation (Complete)
- PATCH /api/admin/customers-360/{id} validates VRN + BRN when client_type=business
- Blocks save with clear error message listing missing fields
- CustomerDrawer360 shows Business/Individual type badge, VRN/BRN fields
- Missing fields alert for incomplete business profiles
- Applies on create, edit, individual→business conversion

## Client Detail Display (Complete)
- Individual: Full Name, City, Country
- Business: Business Name, BRN, VRN, City, Country
- Renderer auto-detects client type from toBlock.client_type

## EFD Receipt On-Demand Workflow (Complete)
- Internal-only trigger: POST /api/admin/efd/request/{invoice_id}
- Validates VRN + BRN for business clients before issuing
- Status flow: pending → uploaded
- EFD section on InvoicePreviewPage: Request button → Status → Download
- Not visible to customers unless uploaded and attached
- API: GET /api/admin/efd/invoice/{id}, GET /api/admin/efd, PATCH /api/admin/efd/{id}

## Settings Hub (Complete — Unified)
- Typography: Unified text-[11px] uppercase labels across all 17 tabs
- Stamp: Auto-pull from Business Profile (no re-entry)
- Signature: Persistent preview after save
- Sales/Affiliate: Source-of-truth banners → Pricing Tiers
- Template: 4 visual preview cards
- Footer: Live preview with toggle states

## Track Order (Complete — Full Lifecycle)
- 6-step timeline: Placed → Confirmed → In Progress → Ready/Dispatched → Awaiting Confirmation → Completed
- Fulfillment-aware CTA: Confirm Delivery / Pickup / Service Handover
- Completion summary after closure

## All Completed Features
- Core Platform, Growth & Conversion, Content Studio, Team Performance
- Partner Ecosystem, Weekly Digest, Categories, Phone, UI/UX Stabilization
- Settings Hub Phase A + Final Alignment
- Phase B: Canonical Document Renderer + Templates + Footer Preview
- P0: Dual-Mode Delivery Closure + Public Completion System
- Business Client Validation (VRN + BRN enforcement)
- Client Detail Display Configuration
- EFD Receipt On-Demand Workflow
- Track Order Full Lifecycle

## Upcoming
- Customer Self-Service Portal (view/download quotes, invoices, delivery notes)
- Advanced Analytics Dashboard
- Data Integrity Dashboard

## Backlog
- Twilio WhatsApp / Resend Email (blocked on keys)
- Account mapping (phone→orders on account creation)

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`
