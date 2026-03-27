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

### UI Cleanup & Role Views Pass (March 27, 2026) - DONE
- **Customer Invoice Wording**: "Payment Under Review" when proof submitted (never "Waiting for payment")
- **Customer Invoice Table**: Columns → Date, Invoice No, Type, Amount, Payer Name, Payment Status
- **Admin Orders**: Tabs → All, New, Assigned, In Progress, Completed (removed "Awaiting Release")
- **Admin Orders Drawer**: 7 enriched sections (Summary, Customer, Assignment, Payment, Fulfillment, Timeline, Admin Actions)
- **Admin Invoices**: Columns → Date, Invoice No, Customer, Type, Amount, Payer Name, Payment Status, Invoice Status, Linked Ref (no action column)
- **Sign Out**: Moved from sidebar bottom to top-right profile dropdown for Admin, Customer, Partner
- **Vendor Privacy**: Customer identity removed, base price added, status flow → Assigned → Work Scheduled → In Progress → Ready → Completed
- **Test**: 100% pass (34/34 backend, all frontend UI) — iteration_127.json

### Unresolved Fixes Pack (March 27, 2026) - DONE
- **Customer-Safe Timeline**: Flow-type-specific labels (Product: Ordered→Confirmed→In Progress→QC→Ready→Completed; Service: Requested→Scheduled→In Progress→Review→Completed; Promo: Submitted→Processing→Active→Completed). Customer never sees vendor-internal labels.
- **Invoice payer_name**: Persisted at proof submission, returned by all invoice APIs, shown in customer + admin tables.
- **Auto-Assignment**: At payment approval — vendor auto-assigned from product owner, sales via round-robin, vendor_orders created with status "assigned", notifications created for customer + vendor + sales.
- **Stored Notifications**: Real notifications in bell (unread count) + dashboard card for customer/vendor/sales. Fixed is_read mismatch bug.
- **Route Cleanup**: /dashboard-legacy/* → /dashboard redirect. /partner/fulfillment → /partner/orders. fulfillment-jobs → vendor/orders (307 redirect). Partner dashboard stats now read from vendor_orders (not fulfillment_jobs).
- **Test**: 100% pass (12/12 backend, all frontend UI) — iteration_128.json

### Route/API Cleanup Audit (March 27, 2026) - DONE
- **Invoice payer_name**: Priority chain: `invoice.payer_name` → proof `payer_name` → `billing.invoice_client_name` → `customer_name`. Proof lookup added as fallback.
- **Vendor notifications**: All links changed from `/partner/fulfillment` → `/partner/orders`. Backend files fixed: `notification_trigger_service.py`, `production_progress_routes.py`, `customer_notifications_routes.py`, `quote_engine_routes.py`.
- **PartnerFulfillmentPage.jsx**: Physically deleted. `/partner/fulfillment` redirects to `/partner/orders`.
- **Canonical customer shell**: `/account/*` is the ONLY active customer portal. `/dashboard/*` and `/dashboard-legacy/*` redirect to `/account/*`. All sidebar links, login redirect, notification links, and email templates updated.
- **Admin payments**: Only `PaymentsQueuePage` at `/admin/payments` is active. No duplicates.
- **Password visibility**: Show/hide toggle added to `LoginPageV2.jsx` (unified login for all roles).
- **Test**: 100% pass (12/12 backend, all frontend UI) — iteration_129.json

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
