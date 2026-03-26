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

### Final UI Polish Pass (March 26, 2026) - COMPLETED
1. **Invoice Drawer**: BrandLogo `md`, status-aware PaymentStatusBlock (Paid in Full / Awaiting Payment with real CRDB bank details)
2. **Invoice PDF**: Zoho-level template with bank details, CFO signature/stamp on paid invoices
3. **AI Widget Hidden**: On all transaction pages (/dashboard/invoices, /dashboard/quotes, /dashboard/orders)
4. **Payment Info API**: `/api/public/payment-info` endpoint

### Quotes & Orders Full Rewrite (March 26, 2026) - COMPLETED
**Quotes Page (Decision Stage):**
- Table: Date, Quote No, Type, Amount, Valid Until, Status, Payment Status
- Drawer: Customer Info, Quote Details (Prepared By, Valid Until), Line Items table, Totals
- Actions: Accept/Reject/Download for pending quotes
- Expiry countdown, Converted to Invoice indicator for accepted quotes

**Orders Page (Fulfillment Tracking):**
- Table: Date, Order No, Source, Amount, Payment, Fulfillment
- Drawer sections:
  1. Order Summary (linked Invoice/Quote)
  2. Customer Details
  3. **Assigned Sales Person** (PROMINENT - Call/Email/WhatsApp buttons)
  4. Fulfillment/Vendor (small, not prominent)
  5. Order Items / Work Details
  6. Totals
  7. Timeline (Order Created → Payment Approved → Vendor Assigned → Work Started → Completed)
  8. "Need help?" → Call Sales / WhatsApp
- NO payment buttons in Orders drawer

### System Consistency Rules (Enforced)
- All 3 pages: full table, no action column, click row → drawer, same logo header, same spacing
- Page purposes locked: Quotes=Decision, Invoices=Payment, Orders=Fulfillment

## Key API Endpoints
- `POST /api/auth/login` — JWT login
- `GET /api/customer/invoices`, `GET /api/customer/orders`, `GET /api/customer/quotes`
- `GET /api/public/payment-info` — Bank details from .env
- `GET /api/pdf/invoices/{id}`, `GET /api/pdf/quotes/{id}` — PDF download

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
