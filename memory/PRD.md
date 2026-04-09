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
- **Notification System**: Event-triggered, actionable, role-based in-app notifications via existing infrastructure

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
- Role-mapped status propagation (customer-safe, vendor-safe, sales, admin)
- Sales status override with mandatory audit notes

### Phase E: Status Timeline & UI Audit
- Status Timeline in admin order drawer showing full audit trail
- Deep UI audit across all 4 role portals (100% pass)
- Status propagation audit verified across all roles
- Customer status filter updated with safe label options

### Phase H: Notification Center (Current Session)
- Event-triggered in-app notifications using existing notification infrastructure
- No new routes created — extended existing `notification_routes.py`
- Notification events: order_created, payment_verified, order_in_fulfillment, order_dispatched, order_delivered, order_delayed, vendor_order_assigned, sales_order_assigned, sales_delay_flagged, admin_sales_override
- Role-based filtering: customers see order progress, sales see delays + assignments, vendors see assignments, admin sees exceptions
- Actionable CTA deep links: View Order → `/account/orders/{id}`, Review Order → `/admin/orders`, etc.
- Enhanced all 3 notification bell components (admin, shared, standalone) with CTA labels, unread indicators, priority badges
- Fixed mark-all-read bug (now sets both `is_read` and `read` fields)

## Notification Event Map

| Event | Notify Roles | CTA |
|-------|-------------|-----|
| Order created | customer + sales | View Order / Open Order |
| Payment verified | customer | Track Order |
| In fulfillment | customer | Track Order |
| Dispatched | customer | Track Delivery |
| Delivered | customer | View Order |
| Delayed | customer + sales | View Order / Review Delay |
| Vendor assigned | vendor | View Assignment |
| Sales override | admin | Review Order |

## DB Schema
- `orders`: Core transaction with `status_audit_trail` array
- `vendor_orders`: Created with payment approval, contains `status_audit_trail`
- `users`: admin, customer, vendor, sales roles
- `payment_proofs`: Source of truth for payer_name
- `notifications`: id, title, message, type, priority, action_key, entity_type, entity_id, recipient_user_id, recipient_role, target_url, cta_label, is_read, read, created_at

## Key API Endpoints
- `POST /api/admin/payments/{id}/approve` — LiveCommerceService
- `GET /api/admin/orders-ops` — Admin orders list
- `GET /api/vendor/orders` — Vendor orders (privacy-filtered)
- `GET /api/customer/orders` — Customer orders (status-mapped)
- `GET /api/notifications` — User notifications (role-filtered)
- `GET /api/notifications/unread-count` — Unread count
- `PUT /api/notifications/{id}/read` — Mark single read
- `PUT /api/notifications/mark-all-read` — Mark all read

## Backlog
- P1: Phase G: Discount Analytics Dashboard
- P2: Twilio WhatsApp/SMS integration (blocked on API key)
- P2: Resend email live mode (blocked on API key)
- P2: AI-assisted Auto Quote Suggestions
- P2: Mobile-first optimization
