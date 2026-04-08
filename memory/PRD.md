# Konekt B2B E-Commerce Platform — Product Requirements Document

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) for the Tanzanian market with role-based access (Admin, Customer, Vendor/Partner, Sales), multi-vendor support, procurement infrastructure, and document branding.

## Core Architecture
- **Stack**: React + FastAPI + MongoDB
- **Portals**: Admin (`/admin`), Customer (`/account`), Vendor (`/partner`), Sales (`/staff`)
- **Auth**: JWT-based with role separation

## Key Technical Principles
- **Strict Payer/Customer Separation**: `customer_name` from business records, `payer_name` from payment proof
- **Vendor Privacy**: Vendors see only their vendor order number, base price, work details, and Konekt Sales Contact — no customer identity or margins
- **Status Propagation**: Internal statuses mapped to role-appropriate labels via `status_propagation_service.py`
- **Multi-Vendor POs**: POs generated from customer orders, grouped by vendor. No separate PO dashboard.

## Completed Features

### Phase A: Core Platform
- Unified login system with role-based routing
- Admin dashboard with summary cards, order management
- Customer marketplace with product/service ordering
- Vendor partner workspace with fulfillment tracking
- Sales workspace with order management and customer management

### Phase B: Payment & Approval
- Stripe sandbox payment gateway integration
- Payment proof upload and approval workflow
- Automated vendor order generation on payment approval
- Payment queue with Customer/Payer separation

### Phase C: Document System
- Canonical HTML-to-PDF generation (Invoices, Quotes, Delivery Notes, Statements, Purchase Orders)
- Programmatic Connected Triad SVG stamp
- Document Preview Panel in Admin Settings
- Business Settings hub (identity, contact, banking, tax)

### Phase D: Purchase Orders & Status Propagation
- Multi-vendor PO generation (grouped by vendor_id)
- Role-mapped status propagation:
  - Customer: processing, confirmed, in fulfillment, dispatched, delivered, completed
  - Vendor: assigned, acknowledged, in_production, ready, dispatched, delivered
  - Sales: full internal status chain
  - Admin: all statuses with human-readable labels
- Sales status override with mandatory audit notes

### Phase E: Status Timeline & UI Audit (Current Session)
- Status Timeline in admin order drawer showing full audit trail
- Deep UI audit across all 4 role portals
- Status propagation audit — verified all roles see correct labels
- Customer status filter updated with safe label options

## DB Schema
- `orders`: Core transaction with `status_audit_trail` array
- `vendor_orders`: Created with payment approval, contains `status_audit_trail`
- `users`: admin, customer, vendor, sales roles
- `payment_proofs`: Source of truth for payer_name

## Key API Endpoints
- `POST /api/admin/payments/{id}/approve` — LiveCommerceService
- `GET /api/admin/orders-ops` — Admin orders list
- `GET /api/vendor/orders` — Vendor orders (privacy-filtered)
- `GET /api/customer/orders` — Customer orders (status-mapped)
- `GET /api/sales/orders/{id}/audit-trail` — Audit trail for vendor orders
- `POST /api/sales/orders/{id}/status` — Sales override

## Backlog
- P1: Phase G: Discount Analytics Dashboard
- P2: Twilio WhatsApp/SMS integration (blocked on API key)
- P2: Resend email live mode (blocked on API key)
- P2: AI-assisted Auto Quote Suggestions
- P2: Mobile-first optimization
