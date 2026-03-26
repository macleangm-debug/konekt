# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a comprehensive B2B e-commerce platform ("Konekt") for Tanzania, featuring product catalog, service quoting, order management, invoice generation, multi-role auth (Customer, Admin, Vendor/Partner), payment tracking, and AI-assisted commerce.

## Core Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + Motor (async MongoDB)
- **Database**: MongoDB (`konekt_db`)
- **PDF**: WeasyPrint HTML-to-PDF engine

## User Personas
- **Customer**: Browse products/services, place orders, view invoices/quotes, pay invoices
- **Admin**: Manage catalog, orders, invoices, quotes, vendors, CRM, analytics
- **Vendor/Partner**: Fulfill orders, manage catalog submissions

## What's Been Implemented

### Core Platform (Complete)
- Multi-role authentication (JWT)
- Product catalog with categories, pricing, variants
- Service catalog with quote request flow
- Promotional campaigns & affiliate system
- Shopping cart + checkout
- Order creation & management
- Invoice generation (auto from orders)
- Quote creation & management
- Loyalty points system
- Customer dashboard with activity feed
- Admin dashboard with KPIs
- Vendor/Partner portal
- PDF generation (Invoices, Quotes)

### Final UI Polish Pass (March 26, 2026) ✅
1. **Invoice Drawer Polish**: BrandLogo `md` size, status-aware PaymentStatusBlock (Paid in Full / Awaiting Payment with real bank details from .env)
2. **AI Widget Hidden**: AIChatWidget suppressed on all transaction drawer pages (/dashboard/invoices, /dashboard/quotes, /dashboard/orders)
3. **Invoice PDF Template**: Zoho-level design with status-aware payment block, real bank details from .env, CFO signature/stamp block on paid invoices
4. **Quotes Page**: Refactored from card layout to master Table + Right Drawer pattern matching Invoices
5. **Orders Page**: Polished to fully match master Table + Right Drawer pattern (removed Action column, added Amount column)
6. **Payment Info API**: New `/api/public/payment-info` endpoint serving bank details from .env

### Infrastructure
- Unified `invoices` collection (v2 archived)
- Unified BrandLogo system
- Admin Orders/Invoices → Payment Queue Table+Drawer pattern

## Acceptance Criteria Verified (13/13 Gates PASS)
- Invoices table: Date, Invoice, Payer, Amount, Status columns
- Sorted DESC by created_at
- Drawer: bigger logo, status badge, Bill To, PaymentStatusBlock
- Paid drawer: "Paid in Full" green
- Pending drawer: "Awaiting Payment" + CRDB BANK details
- Quotes table: Date, Quote, Items, Amount, Status
- Quote drawer: logo, items, totals, download
- Orders table: Date, Order, Amount, Payment, Fulfillment
- Order drawer: logo, vendor, sales person, items
- AI widget hidden on transaction pages
- /api/public/payment-info returns .env bank details
- PDF with status-aware payment + bank details
- CFO signature block on paid PDFs

## Key API Endpoints
- `POST /api/auth/login` — JWT login
- `GET /api/customer/invoices` — Customer invoices
- `GET /api/customer/orders` — Customer orders
- `GET /api/customer/quotes` — Customer quotes
- `GET /api/public/payment-info` — Bank details from .env
- `GET /api/pdf/invoices/{id}` — Invoice PDF download
- `GET /api/pdf/quotes/{id}` — Quote PDF download
- `GET /api/admin/payment-settings` — Admin payment config

## Test Credentials
- Customer: `demo.customer@konekt.com` / `Demo123!`
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`

## Prioritized Backlog

### P1 — Upcoming
- Connect live payment gateway (KwikPay/Stripe)
- Final Launch Verification Checklist

### P2 — Future
- Twilio WhatsApp credentials (blocked on user API keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization
