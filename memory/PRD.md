# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) for Tanzania. Role-based views for Customer, Admin, Vendor/Partner, and Sales. Canonical routing, automated order assignment at payment approval, invoice/order data enrichment. Live payment gateway integration.

## Architecture
- **Frontend**: React with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI (Python 3.11) with Motor (async MongoDB)
- **Database**: MongoDB (Konekt DB)
- **Payments**: Stripe (sandbox), KwikPay (pending keys)
- **Email**: Resend (pending API key)
- **Messaging**: Twilio WhatsApp (pending API keys)

## Active Approval Path (CRITICAL)
**Frontend**: PaymentsQueuePage.jsx → `adminApi.approvePayment()` → `POST /api/admin/payments/{proof_id}/approve`
**Backend**: admin_facade_routes.py → `LiveCommerceService.approve_payment_proof()` in `/app/backend/core/live_commerce_service.py`

This is the ONLY active approval path. Do NOT modify `admin_flow_fixes_routes.py` for approval logic — it's a secondary/backup path.

### Fields written at approval:
- **Invoice**: `approved_by`, `approved_at`, `status=paid`, `payment_status=approved`
- **Order**: `approved_by`, `approved_at`, `assigned_sales_id`, `assigned_sales_name`, `assigned_vendor_id`, `payer_name` (strict)
- **Vendor Order**: `vendor_id`, `order_id`, `vendor_order_no`, `base_price`, `status=assigned`
- **Sales Assignment**: `sales_owner_id`, `sales_owner_name`, `status=active_followup`
- **Notification**: `title=Payment Approved`, `target_url=/account/invoices`

### Payer/Customer Separation Rule
- `customer_name` = registered customer/business name (from user record or invoice)
- `payer_name` = ONLY from `proof.payer_name` or `submission.payer_name` or `invoice.payer_name`
- NEVER fall back from customer_name to payer_name or vice versa

## Completed Features

### Phase 1-3: Core Platform + Stripe (Done)
- Unified /login, canonical routing, product/invoice/order system
- Stripe sandbox checkout, webhook, status polling

### Phase 4-5: Surgical Fixes (Done)
- Strict payer/customer separation across all routes
- Vendor privacy (no customer identity)
- Dashboard link cleanup (/dashboard/* → /account/*)
- Checkout payer name prefill

### Phase 6: Active Approval Flow Fix (Done — March 29, 2026)
- Fixed LiveCommerceService.approve_payment_proof() — the ACTUAL active path
- All fields now persist: approved_by, approved_at, vendor_order, sales_assignment, notification
- Existing orders get updated with assignments when re-approved
- Customer name resolved from user record when missing on invoice

## Acceptance Gates — ALL GREEN (Iteration 139)
| Gate | Status |
|------|--------|
| Order: approved_by populated | ✅ admin |
| Order: approved_at valid ISO | ✅ 2026-03-29T15:36:48 |
| Order: assigned_sales_id | ✅ sales-demo-001 |
| Order: assigned_vendor_id | ✅ from items |
| Order: payer_name strict | ✅ from proof only |
| Invoice: approved_by/at | ✅ |
| Vendor order created | ✅ with vendor_order_no, base_price |
| Sales assignment created | ✅ |
| Customer notification | ✅ Payment Approved |
| Admin UI columns | ✅ Payer, Approved By |
| Vendor privacy | ✅ no customer identity |
| Customer sales contact | ✅ real name/phone/email |

## Key API Endpoints
- `POST /api/admin/payments/{id}/approve` — **ACTIVE** approval path
- `GET /api/admin/orders-ops` — Admin enriched orders
- `GET /api/admin/invoices/list` — Admin enriched invoices
- `GET /api/vendor/orders` — Vendor orders (privacy-compliant)
- `GET /api/customer/invoices` — Customer invoices
- `GET /api/customer/orders` — Customer orders with sales contact
- `POST /api/payments/stripe/checkout/invoice` — Stripe checkout

## Upcoming Tasks (P1)
- End-to-end Stripe payment test with real test cards
- Resend email integration (requires user API key)
- Admin data entry: logo, TIN, BRN, bank account details

## Backlog (P2)
- Twilio WhatsApp (blocked on API keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization
- KwikPay live payment gateway (blocked on API keys)
