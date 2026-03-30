# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a B2B e-commerce platform (Konekt) for Tanzania. Role-based views for Customer, Admin, Vendor/Partner, and Sales. Canonical routing, automated order assignment at payment approval, invoice/order data enrichment. Live payment gateway integration.

## Architecture
- **Frontend**: React with Shadcn/UI, Tailwind CSS
- **Backend**: FastAPI (Python 3.11) with Motor (async MongoDB)
- **Database**: MongoDB (Konekt DB)
- **Payments**: Stripe (sandbox), KwikPay (pending keys)

## Active Approval Path
`POST /api/admin/payments/{proof_id}/approve` → `admin_facade_routes.py` → JWT-resolved admin name → `LiveCommerceService.approve_payment_proof()` in `live_commerce_service.py`

## Launch Verification Status — ALL GREEN (Iteration 141)
| Test | Status |
|------|--------|
| Customer login + redirect | ✅ |
| Customer product browsing | ✅ |
| Customer invoices payer_name | ✅ |
| Customer orders sales contact | ✅ |
| Customer notifications | ✅ |
| Stripe checkout | ✅ |
| Admin orders (all columns) | ✅ |
| Admin order detail (all fields) | ✅ |
| Admin payments queue | ✅ |
| Admin approval flow | ✅ |
| Vendor orders (privacy) | ✅ |
| Customer sidebar /account/* | ✅ |
| Go-live readiness | ✅ |
| Pay Invoice button | ✅ |
| Fresh data payer_name | ✅ |

## Go-Live Readiness — Needs Admin Action
- ❌ Logo upload
- ❌ TIN / Business Registration Number
- ❌ Bank account name/number
- ❌ Resend email API key / sender email

## Upcoming Tasks (P1)
- Admin configuration (logo, TIN, bank details) — data entry, not code
- Resend email integration (blocked on API key)
- Stripe live keys (when ready)

## Backlog (P2)
- Twilio WhatsApp (blocked on API keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization
- KwikPay live payment gateway (blocked on API keys)
