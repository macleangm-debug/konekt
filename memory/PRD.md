# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a comprehensive B2B e-commerce platform ("Konekt") for Tanzania, featuring product catalog, service quoting, order management, invoice generation, multi-role auth (Customer, Admin, Vendor/Partner), payment tracking, and AI-assisted commerce.

## Core Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB (`konekt_db`)
- **PDF**: WeasyPrint HTML-to-PDF engine + ReportLab

## What's Been Implemented

### Core Platform (Complete)
- Multi-role auth (JWT), Product/Service/Promo catalogs
- Shopping cart + checkout, Order/Invoice/Quote CRUD
- Loyalty points, Affiliate system, Admin/Vendor/Customer dashboards
- PDF generation (Invoices, Quotes, Orders)

### Unified Auth System (March 26, 2026) - DONE
- Single `/login` for ALL roles (Customer, Admin, Partner)
- Role-based routing: admin→`/admin`, partner→`/partner`, customer→`/dashboard`
- `clearAllAuth()` clears ALL token keys on logout

### PDF Layout V2 — Cut-Off Fix (March 26, 2026) - DONE
- Combined `payment-auth-section` grid: left content + right auth-column
- Stamp 88px, signature 110x42px, page-break-inside:avoid
- Applied to Quote, Invoice, Order

### Sales Accounts & Order Enrichment (March 26, 2026) - DONE
- **Backend**: `sales_orders_routes.py` — `/api/sales/orders` (list, filtered by sales user), `/api/sales/orders/{id}` (enriched detail)
- **Backend**: `order_sales_enrichment_service.py` — enriches orders with real sales profile from `users` collection
- **Admin orders also enriched** — existing `/api/admin/orders` and `/api/admin/orders/{id}` return `sales` object
- **Frontend**: `SalesOrdersPageV2.jsx` at `/staff/orders` — Table+Drawer with status filters, search
- **Frontend**: `SalesOrderDrawerV2.jsx` — Customer, Assigned Sales, Vendor, Line Items, Financials, Timeline
- **PDF**: Order template uses real `sales` data instead of "Konekt Sales Team" placeholder
- **Nav**: Staff sidebar includes "My Orders" link

### Tabbed Business Settings Hub - DONE
- 9-Tab Layout with CustomerActivityRulesCard, GeneratedStampBuilder, SignaturePad

### Customers CRM Page - DONE
- Stats Cards, Computed Status, Wide Profile Drawer with 5 Tabs

### Route Cleanup & Canonical Consolidation - DONE
- 14+ legacy routes removed, canonical Table+Drawer pattern

## Test Credentials
- Customer: `demo.customer@konekt.com` / `Demo123!`
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- **Single login URL**: `/login` for all roles

### Vendor Orders Cleanup (March 26, 2026) - DONE
- **Backend**: `vendor_orders_routes.py` — `/api/vendor/orders` (list, filtered by vendor), `/api/vendor/orders/{id}/status`, `/api/vendor/orders/{id}/note`
- **Source of truth**: `vendor_orders` collection ONLY (no fulfillment_jobs, no mixed fallbacks)
- **Frontend**: `MyOrdersPage.jsx` at `/partner/orders` — Full-width table, newest first, row click opens drawer
- **Frontend**: `VendorOrderDrawer.jsx` — Vendor order no, customer info, Konekt sales contact, work details, timeline, status update actions
- **Legacy cleanup**: `/partner/fulfillment` route removed, redirects to `/partner/orders`; sidebar updated to "My Orders"
- **Vendor notification**: Added notification creation on payment approval vendor_order push
- **Test**: 100% pass (21/21 backend, all frontend UI tests) — iteration_126.json

## Prioritized Backlog

### P1 — Upcoming
- Connect live payment gateway (KwikPay/Stripe)
- Final Launch Verification Checklist
- Next Layer Ops (Customer Invoice Table enrichment, Admin Order Auto-Assignment, Stored Notifications, Shared Drawer Design System)

### P2 — Future
- Twilio WhatsApp credentials (blocked on user API keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization
