# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a comprehensive B2B e-commerce platform ("Konekt") for Tanzania, featuring product catalog, service quoting, order management, invoice generation, multi-role auth (Customer, Admin, Vendor/Partner), payment tracking, and AI-assisted commerce.

## Core Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB (`konekt_db`)
- **PDF**: WeasyPrint HTML-to-PDF engine + ReportLab
- **Navigation**: `adminNavigation.js` is the single source of truth for admin nav config

## What's Been Implemented

### Core Platform (Complete)
- Multi-role authentication (JWT)
- Product/Service/Promo catalogs, Shopping cart + checkout
- Order/Invoice/Quote creation & management
- Loyalty points, Affiliate system
- Admin/Vendor/Customer dashboards
- PDF generation (Invoices, Quotes, Orders)

### Final UI Polish Pass - DONE
- Invoice PDF: Zoho-level template with dynamic CFO signature/stamp
- Dynamic contact details + multi-page PDF support
- Custom logo embedding in generated SVG stamps

### Route Cleanup & Canonical Consolidation - DONE
- Removed 14+ duplicate/legacy routes
- All admin transaction pages use canonical Table+Drawer pattern
- Single navigation source of truth

### Customers CRM Page - DONE
- Stats Cards: Total, Active, At Risk, Inactive, Unpaid Invoices, Active Orders
- Computed Customer Status: Active (30d) / At Risk (31-90d) / Inactive (90d+)
- Wide Profile Drawer with 5 Tabs (Overview, Quotes, Invoices, Orders, Notes)

### Tabbed Business Settings Hub - DONE
- 9-Tab Layout: Business Profile, Payment Details, Invoice Branding, Commercial Rules, Sales & Commissions, Affiliate & Referrals, Workflows & Vendors, Notifications, Launch Controls
- CustomerActivityRulesCard in Commercial Rules tab
- GeneratedStampBuilder in Invoice Branding tab
- SignaturePad with Upload/Draw method toggle

### PDF Layout & Auth Block Overhaul (March 26, 2026) - DONE
**Layout Fixes:**
- Page width constrained to 794px (print-safe A4) with `overflow: hidden`
- `table-layout: fixed` on all item tables
- `doc-title` max-width: 280px to prevent header overflow
- Totals box wrapped in flex-end container, stays inside page
- All child blocks use `width: 100%` — nothing exceeds wrapper
- `.col` has `min-width: 0` to prevent flex overflow

**Signature/Stamp Visibility:**
- Auth block is now **settings-driven**, not document-status-dependent
- Signature+stamp appear on **Quotes, Invoices, AND Orders** when enabled
- Removed `is_finalized` restriction — shows whenever `show_signature`/`show_stamp` is true
- Supports both file-based signature URLs and `data:` base64 URLs from SignaturePad
- SVG stamps rendered inline from file

**Applied to all 3 PDF systems:**
- `pdf_generation_routes.py` (primary WeasyPrint — Quotes/Invoices/Orders)
- `enterprise_pdf_routes.py` (enterprise WeasyPrint)
- ReportLab services unchanged (programmatic PDF, not HTML)

## Canonical Admin Routes
| Route | Component |
|---|---|
| `/admin` | AdminDashboardV2 |
| `/admin/crm` | CRMPageV2 |
| `/admin/quotes` | QuotesRequestsPage |
| `/admin/orders` | OrdersPage |
| `/admin/invoices` | InvoicesPage |
| `/admin/payments` | PaymentsQueuePage |
| `/admin/customers` | CustomersPageMerged |
| `/admin/users` | AdminUsers |
| `/admin/settings-hub` | AdminSettingsHubPage |

## Test Credentials
- Customer: `demo.customer@konekt.com` / `Demo123!`
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`

## Prioritized Backlog

### P1 — Upcoming
- Connect live payment gateway (KwikPay/Stripe)
- Final Launch Verification Checklist
- Wire actual sales person data when assigned in admin

### P2 — Future
- Twilio WhatsApp credentials (blocked on user API keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization
