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

### Unified Auth System (March 26, 2026) - DONE
- Single `/login` page for ALL roles (Customer, Admin, Partner)
- Backend `/api/auth/login` checks both `users` AND `partner_users` collections
- Role-based routing: admin→`/admin`, partner→`/partner`, customer→`/dashboard`
- `clearAllAuth()` helper clears ALL token keys on logout
- `/admin/login` and `/partner-login` redirect to `/login`
- Fixed: Logout bug where `konekt_token` was not cleared, causing auto-redirect back

### PDF Layout & Auth Block Overhaul (March 26, 2026) - DONE
- Page width constrained to 794px (print-safe A4) with overflow:hidden
- table-layout:fixed, doc-title max-width:280px
- Signature+stamp settings-driven (not status-dependent) for Quotes, Invoices, Orders
- Applied across all PDF systems

### Tabbed Business Settings Hub (March 26, 2026) - DONE
- 9-Tab Layout with CustomerActivityRulesCard, GeneratedStampBuilder, SignaturePad

### Customers CRM Page - DONE
- Stats Cards, Computed Status, Wide Profile Drawer with 5 Tabs

### Route Cleanup & Canonical Consolidation - DONE
- 14+ duplicate/legacy routes removed
- All admin transaction pages use canonical Table+Drawer pattern

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

## Auth Flow
- **Single login URL**: `/login` for all users
- **Customer** → `konekt_token` → `/dashboard`
- **Admin** → `konekt_admin_token` → `/admin`
- **Partner** → `partner_token` → `/partner`
- **Logout**: `clearAllAuth()` removes all token keys

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
