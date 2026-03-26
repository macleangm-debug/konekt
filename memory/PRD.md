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
- Multi-role authentication (JWT), Product/Service/Promo catalogs
- Shopping cart + checkout, Order/Invoice/Quote CRUD
- Loyalty points, Affiliate system, Admin/Vendor/Customer dashboards
- PDF generation (Invoices, Quotes, Orders)

### Unified Auth System (March 26, 2026) - DONE
- Single `/login` page for ALL roles (Customer, Admin, Partner)
- Role-based routing: admin→`/admin`, partner→`/partner`, customer→`/dashboard`
- `clearAllAuth()` clears ALL token keys on logout
- `/admin/login` and `/partner-login` redirect to `/login`

### PDF Layout V2 — Cut-Off Fix (March 26, 2026) - DONE
- **Combined payment-auth-section** grid: left content (bank/terms/sales) + right auth-column (signature stacked on stamp)
- Stamp reduced to 88px, signature to 110x42px (prevents overflow)
- `page-break-inside: avoid` on payment-auth-section, signature, stamp, footer, totals
- Footer margin reduced (18px), thinner border (1px)
- Applied to all 3 document types: Quote, Invoice, Order
- Quote: Terms & Conditions (left) + Auth (right)
- Invoice: Bank Transfer Details (left) + Auth (right)
- Order: Sales Contact (left) + Auth (right)

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

## Prioritized Backlog

### P0 — Next Layer Ops (from ops pack)
1. Customer Invoice Table enrichment (Date, Invoice No, Type, Amount, Payer, Status)
2. Admin Order Auto-Assignment (sales + vendor on payment approval)
3. Stored Notifications (real collection, bell icon, dashboard visibility)
4. Shared Drawer Design System (MasterDrawerFrame)
5. Sales Orders List + Drawer

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
