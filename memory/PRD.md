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
- PDF generation (Invoices, Quotes)

### Final UI Polish Pass (March 26, 2026) - DONE
- Invoice Drawer: BrandLogo md, status-aware PaymentStatusBlock (Paid/Awaiting with real bank details)
- Invoice PDF: Zoho-level template with bank details, dynamic CFO signature/stamp
- AI Widget hidden on transaction pages
- Payment Info API: `/api/public/payment-info`

### Quotes & Orders Full Rewrite (March 26, 2026) - DONE
**Quotes Page (Decision Stage):**
- Table: Date, Quote No, Type, Amount, Valid Until, Status, Payment Status
- Drawer: Customer Info, Quote Details + Prepared By, Line Items, Totals, Accept/Reject/Download, Expiry countdown

**Orders Page (Fulfillment Tracking):**
- Table: Date, Order No, Source, Amount, Payment, Fulfillment
- Drawer: Order Summary, Customer, PROMINENT Sales Person (Call/Email/WhatsApp), Fulfillment/Vendor, Items, Timeline, "Need help?"

### Invoice Branding & Authorization (March 26, 2026) - DONE
**Admin Settings Hub → Invoice Branding section:**
- CFO Name, Title, Show Signature toggle, Signature upload
- Company Stamp: Generated (Circle/Square, Blue/Red/Black, company details) or Uploaded
- Generated stamp as SVG with curved text, double borders, registration/TIN
- Live Invoice Footer Preview panel
- Settings saved to MongoDB `business_settings` collection
- PDF generator reads branding settings dynamically
- Light preview shown in customer invoice drawer for finalized invoices

## Key API Endpoints
- `POST /api/auth/login`, `POST /api/admin/auth/login`
- `GET /api/customer/invoices`, `GET /api/customer/orders`, `GET /api/customer/quotes`
- `GET /api/public/payment-info`
- `GET/POST /api/admin/settings/invoice-branding`
- `POST /api/admin/settings/invoice-branding/signature-upload`
- `POST /api/admin/settings/invoice-branding/stamp-upload`
- `POST /api/admin/settings/invoice-branding/generate-stamp`
- `GET /api/pdf/invoices/{id}`, `GET /api/pdf/quotes/{id}`

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
