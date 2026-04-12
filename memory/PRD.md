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

## Settings Hub Structure (Canonical)
### Business (8 tabs)
- Profile (country→currency mapping)
- Payment Details
- Document Branding (logo, signature+color, stamp shape+color)
- Document Numbering (Quote/Invoice/Order/DN/PO/SKU: prefix, type, digits, start)
- Document Footer (address/email/phone/registration toggles + custom text + LIVE PREVIEW)
- Document Template (Classic/Modern/Compact/Premium — VISUAL PREVIEW CARDS, ACTIVE)
- Notifications
- Report Delivery

### Pricing Policy (5 tabs)
- Pricing Tiers, Distribution Rules, Sales & Commission, Payout Settings, Launch Controls

### Partner Policy (4 tabs)
- Affiliate Policy, Vendor Policy, Partner Config, Operational Rules

## Document System (Phase B — Complete)

### Canonical Document Renderer
- Single shared component: `CanonicalDocumentRenderer.jsx`
- Renders all document types: Quote, Invoice, Delivery Note, Service Handover
- Template-aware: Classic Corporate, Modern Clean, Compact Commercial, Premium Branded
- Settings-driven: logo, stamp, signature, footer, numbering, template — all from unified `/api/documents/render-settings`
- Client-type-aware: Individual (name, address) vs Business (company name, BRN, VRN)
- WYSIWYG PDF export: html2canvas + jsPDF captures exact DOM for pixel-perfect output

### Document Flow (Business Lifecycle)
1. Quote → 2. Invoice → 3. Order → 4. Delivery Note / Service Handover

### EFD Receipt (Future)
- On-demand only, not auto-generated
- Internal trigger by staff/admin
- Requires VRN + BRN for business clients

### Delivery Closure Workflow (Phase B-3 — Complete)
- Receiver name, designation, digital signature capture
- Sign-off modal with inline signature pad
- Stored as official closure event
- Renders inside canonical document for PDF export

## Completed Features (All Tested)
- Core Platform, Growth & Conversion, Content Studio, Team Performance
- Partner Ecosystem (KPI + management table + gaps)
- Weekly Digest (executive report)
- Categories (canonical), Phone (global), UI/UX Stabilization
- Settings Hub Phase A Restructure (3 groups + document controls)
- Phase B-1: Canonical Document Renderer (Quote, Invoice, Delivery Note) 
- Phase B-2: Document Template Support (4 templates with visual previews)
- Phase B-3: Delivery Note Closure Workflow (receiver sign-off with signature)
- Settings: DocFooterTab live preview, DocTemplateTab visual preview cards

## Upcoming
- Settings Hub Final Alignment Pass (typography consistency, pricing source-of-truth cleanup, stamp auto-pull, signature pad improvements)
- Business Client Validation (VRN + BRN required for business type)
- Client Detail Display Configuration (Individual vs Business blocks in documents)
- EFD Receipt workflow (on-demand, internal-only)

## Backlog
- Twilio WhatsApp / Resend Email (blocked on keys)
- Advanced Analytics, Data Integrity Dashboard

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`
