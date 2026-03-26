# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a comprehensive B2B e-commerce platform ("Konekt") for Tanzania, featuring product catalog, service quoting, order management, invoice generation, multi-role auth (Customer, Admin, Vendor/Partner), payment tracking, and AI-assisted commerce.

## Core Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB (`konekt_db`)
- **PDF**: WeasyPrint HTML-to-PDF engine

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
- AI Widget hidden on transaction pages
- Dynamic contact details in Admin Invoice Branding settings
- Multi-page PDF layout support with @page CSS
- Custom logo embedding in generated SVG stamps

### Canonical UI Reuse Consolidation (March 26, 2026) - DONE
**Admin Pages Consolidated:**
- `/admin/payments` (+ central-payments, payment-proofs, finance-queue) → PaymentsQueuePage (canonical Table+Drawer)
- `/admin/orders` (+ orders-ops, orders-legacy) → OrdersPage with tabs (All, Awaiting Release, Released, Completed)
- `/admin/quotes` → QuotesRequestsPage (unified quotes & requests)
- `/admin/invoices` → InvoicesPage (action column removed, row click opens drawer)

**Table Pattern Standardized:**
- Date column on the left across all admin tables
- Admin orders sorted newest first
- Consistent column structure: Date → ID → Customer → Amount → Status

**Sidebar Updates:**
- Admin: "Payments Queue" → /admin/payments (canonical route)
- Partner: "Fulfillment Queue" → "My Orders"

**Route Consolidation:**
- `/account/orders` → OrdersPageV2
- All duplicate payment routes → PaymentsQueuePage
- All duplicate order routes → OrdersPage

**API Methods Added:**
- `getPaymentsQueue`, `getPaymentDetail`, `approvePayment`, `rejectPayment`
- `getOrderDetail`, `releaseToVendor`

## Key API Endpoints
- `POST /api/auth/login`, `POST /api/admin/auth/login`
- `GET /api/admin/payments/queue`, `GET /api/admin/payments/{id}`, `POST /api/admin/payments/{id}/approve`, `POST /api/admin/payments/{id}/reject`
- `GET /api/admin/orders/list`, `GET /api/admin/orders/{id}`, `POST /api/admin/orders/{id}/release-to-vendor`
- `GET /api/admin/quotes/list`
- `GET /api/admin/invoices/list`
- `GET/POST /api/admin/settings/invoice-branding`
- `GET /api/pdf/invoices/{id}`, `GET /api/pdf/invoices/{id}/preview`
- `GET /api/pdf/quotes/{id}`, `GET /api/pdf/orders/{id}`

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
