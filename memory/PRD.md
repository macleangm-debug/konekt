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
- Product/Service/Promo catalogs, Shopping cart + checkout
- Order/Invoice/Quote creation & management
- Loyalty points, Affiliate system
- Admin/Vendor/Customer dashboards
- PDF generation (Invoices, Quotes, Orders)

### Final UI Polish Pass (March 26, 2026) - DONE
- Invoice PDF: Zoho-level template with dynamic CFO signature/stamp
- Dynamic contact details + multi-page PDF support
- Custom logo embedding in generated SVG stamps

### Route Cleanup & Canonical Consolidation (March 26, 2026) - DONE
- Removed 14+ duplicate/legacy routes
- All admin transaction pages use canonical Table+Drawer pattern
- Single navigation source of truth

### Customers CRM Page (March 26, 2026) - DONE
**Stats Cards (top):**
- Total, Active, At Risk, Inactive, Unpaid Invoices, Active Orders
- Clickable cards filter the table

**Computed Customer Status:**
- Active = commercial activity in last 30 days
- At Risk = activity 31-90 days ago
- Inactive = no activity in 90+ days
- Computed from latest order/invoice/quote dates

**Customer Table:**
- Recent Activity, Customer, Email, Company, Type, Orders, Invoices, Sales, Status

**Wide Profile Drawer (max-w-2xl) with 5 Tabs:**
- Overview: 6 KPI cards + Profile + Sales Ownership + Referrals
- Quotes, Invoices, Orders, Notes tabs

**APIs:**
- `/api/admin/customers-360/stats` — Aggregate stats
- `/api/admin/customers-360/list` — Customer list with computed status, search, status filter
- `/api/admin/customers-360/{customer_id}` — Full 360 detail

### Tabbed Business Settings Hub (March 26, 2026) - DONE
**9-Tab Layout:**
- Business Profile, Payment Details, Invoice Branding, Commercial Rules, Sales & Commissions, Affiliate & Referrals, Workflows & Vendors, Notifications, Launch Controls

**New Components Integrated:**
- **CustomerActivityRulesCard** in Commercial Rules tab — configurable Active Window (days), At Risk Window End (days), Default New Customer Status, 6 activity signal checkboxes (orders, invoices, quotes, requests, sales_notes, account_logins)
- **GeneratedStampBuilder** in Invoice Branding tab — stamp shape/color/phrase/company name/city/registration/TIN with CSS quick preview + backend SVG generation
- **SignaturePad** in Invoice Branding tab — canvas drawing tool with Upload Image / Draw Signature method toggle
- Backend deep-merges defaults so new settings sections are always available
- `customer_activity_rules` persisted via settings-hub state
- `signature_method` (upload/pad) persisted in invoice branding settings

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
