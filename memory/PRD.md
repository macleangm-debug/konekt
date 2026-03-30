# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) for Tanzania. Role-based views for Customer, Admin, Vendor/Partner, and Sales. Canonical routing, automated order assignment at payment approval, invoice/order data enrichment. Live payment gateway integration.

## Architecture
- **Frontend**: React with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI (Python 3.11) with Motor (async MongoDB)
- **Database**: MongoDB (Konekt DB)
- **Payments**: Stripe (sandbox), KwikPay (pending keys)

## Active Approval Path (CRITICAL — DO NOT MODIFY WRONG FILE)
**Frontend**: PaymentsQueuePage.jsx → `adminApi.approvePayment()` → `POST /api/admin/payments/{proof_id}/approve`
**Backend**: `admin_facade_routes.py` → resolves admin name from JWT → calls `LiveCommerceService.approve_payment_proof()` in `/app/backend/core/live_commerce_service.py`

### Fields written at approval:
- **Invoice**: `approved_by=<real admin name>`, `approved_at=<ISO timestamp>`
- **Order**: `approved_by`, `approved_at`, `assigned_sales_id`, `assigned_sales_name`, `assigned_vendor_id`, `payer_name` (strict from proof only)
- **Vendor Order**: `vendor_id=<real partner_id>`, `vendor_order_no`, `base_price`, `status=assigned`
- **Sales Assignment**: `sales_owner_id`, `sales_owner_name`, `status=active_followup`
- **Notification**: `title=Payment Approved`, `target_url=/account/invoices`

### Vendor ID Resolution Chain (at approval):
1. Product catalog: `product.vendor_id` → `product.owner_vendor_id` → `product.uploaded_by_vendor_id` → `product.partner_id`
2. Fall back to `item.vendor_id` from invoice
3. Map to real `partner_users.partner_id` via DB lookup

### Payer/Customer Separation Rule (STRICT)
- `customer_name` = from user record or invoice customer fields ONLY
- `payer_name` = from `proof.payer_name` or `submission.payer_name` or `invoice.payer_name` ONLY
- NEVER: `proof.customer_name`, `billing.invoice_client_name`, `order.customer_name` as payer

## Completed Features (All Verified)
- Unified /login with role-based redirect
- Canonical routing: /account/*, /admin/*, /partner/*
- Stripe sandbox checkout, webhook, status polling
- Strict payer/customer separation across ALL routes
- Real admin name in approved_by (JWT-resolved)
- Product-based vendor_id resolution matching real partners
- Vendor privacy (no customer identity in API/UI)
- Customer notification on approval
- Checkout payer name prefill
- Dashboard link cleanup

## Acceptance Gates — ALL GREEN (Iteration 140)
| Gate | Status | Value |
|------|--------|-------|
| approved_by real name | ✅ | Konekt Administrator |
| approved_at valid ISO | ✅ | 2026-03-30T08:19:04 |
| assigned_vendor_id | ✅ | 69b827eae21f56c57362c6b7 |
| vendor_order created | ✅ | VO-KON-ORD-* with base_price |
| vendor sees order | ✅ | 6 orders in /partner/orders |
| vendor privacy | ✅ | No customer identity |
| payer ≠ customer | ✅ | payer=Don, customer=Demo Customer |
| admin order detail | ✅ | All fields populated |
| customer sales contact | ✅ | Janeth Msuya / +255710000001 |

## Upcoming Tasks (P1)
- End-to-end Stripe payment test with real test cards
- Resend email integration (requires user API key)
- Admin data entry: logo, TIN, BRN, bank details

## Backlog (P2)
- Twilio WhatsApp (blocked on API keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization
- KwikPay live payment gateway (blocked on API keys)
