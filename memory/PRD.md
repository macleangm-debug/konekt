# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a comprehensive B2B e-commerce platform ("Konekt") for Tanzania, featuring product catalog, service quoting, order management, invoice generation, multi-role auth (Customer, Admin, Vendor/Partner), payment tracking, and AI-assisted commerce.

## Core Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB (`konekt_db`)
- **PDF**: WeasyPrint HTML-to-PDF engine
- **Navigation**: `adminNavigation.js` is the single source of truth for admin nav config

## What's Been Implemented

### Core Platform (Complete)
- Multi-role authentication (JWT)
- Product/Service/Promo catalogs
- Shopping cart + checkout
- Order/Invoice/Quote creation & management
- Loyalty points, Affiliate system
- Admin/Vendor/Customer dashboards
- PDF generation (Invoices, Quotes, Orders)

### Final UI Polish Pass (March 26, 2026) - DONE
- Invoice Drawer: BrandLogo, status-aware PaymentStatusBlock
- Invoice PDF: Zoho-level template with bank details, dynamic CFO signature/stamp
- Dynamic contact details in Admin Invoice Branding settings
- Multi-page PDF layout support with @page CSS
- Custom logo embedding in generated SVG stamps

### Canonical UI Reuse Consolidation (March 26, 2026) - DONE
- All admin transaction pages use canonical Table+Drawer pattern
- Date columns on the left, no action columns, newest-first sorting
- Route consolidation: duplicate routes removed (253 → 239 routes)
- Sidebar: "Payments Queue" → `/admin/payments`, Partner "My Orders"

### Route Cleanup (March 26, 2026) - DONE
**Removed 14 duplicate/legacy routes:**
- `/admin/orders-legacy`, `/admin/orders-ops` (→ `/admin/orders`)
- `/admin/crm-old` (→ `/admin/crm`)
- `/admin/quotes-old`, `/admin/quotes/kanban` (→ `/admin/quotes`)
- `/admin/customers-old` (→ `/admin/customers`)
- `/admin/central-payments`, `/admin/finance-queue`, `/admin/payment-proofs` (→ `/admin/payments`)
- `/admin/setup`, `/admin/ux-overview`, `/admin/catalog-setup`, `/admin/partner-ecosystem-v2`
- `/old-home`

**Removed 16 dead imports** from App.js

**Cleaned navigation configs:**
- Deleted: `admin-sidebar-final-links.js`, `adminNavigationGroups.js`, `navigationAccess.js`
- Kept: `adminNavigation.js` (single source of truth), `admin-sidebar-links.js` (audit page)
- Updated `adminNavigation.js`: "Payment Proofs" → "Payments" at `/admin/payments`
- Removed `/admin/catalog-setup` from AdminLayout sidebar

## Canonical Admin Routes
| Business Area | Route | Component |
|---|---|---|
| Dashboard | `/admin` | AdminDashboardV2 |
| CRM | `/admin/crm` | CRMPageV2 |
| Quotes | `/admin/quotes` | QuotesRequestsPage |
| Orders | `/admin/orders` | OrdersPage |
| Invoices | `/admin/invoices` | InvoicesPage |
| Payments | `/admin/payments` | PaymentsQueuePage |
| Customers | `/admin/customers` | CustomersPageV2 |
| Users | `/admin/users` | AdminUsers |
| Settings | `/admin/settings-hub` | AdminSettingsHubPage |

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
