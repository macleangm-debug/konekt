# Konekt - B2B Commerce Platform PRD

## Overview
Konekt is a premium B2B e-commerce platform for promotional materials, office equipment, and design services. Based in Dar es Salaam, Tanzania.

**Vision**: The biggest B2B branding platform in East Africa

---

## Architecture: Live Commerce Engine

### Single Source of Truth
`backend/core/live_commerce_service.py` — centralized facade for production commerce.

### Admin Facade (Strangler Fig Pattern)
`backend/admin_facade_routes.py` — unified admin operations facade with 40+ endpoints.

### Master Flow
```
Product Checkout → Invoice → Payment Intent → Proof Upload (with payer name)
    → Finance Queue → Approve/Reject → Order + Vendor Orders + Commissions
```

---

## Admin CRM Refactor — COMPLETE (Pass 1-5)

### Pass 1: Backend Facade — COMPLETE
11 core endpoints: Dashboard, Payments, Invoices, Orders, Quotes

### Pass 2: Core Admin Pages — COMPLETE
PaymentsQueuePage, InvoicesPage, OrdersPage, QuotesRequestsPage

### Pass 3: Sales CRM, Customers, Vendors — COMPLETE
- **SalesCrmPage** `/admin/crm` — 3 tabs: Leads, Accounts, Performance
- **CustomersPageV3** `/admin/customers` — Table with orders, referrals, sales assignments + detail drawer
- **VendorsPage** `/admin/vendors` — Table with active orders, released jobs, status toggle

### Pass 4: Affiliates, Catalog, Settings — COMPLETE
- **AffiliatesReferralsPage** `/admin/affiliates` — 4 tabs: Affiliates, Referrals, Commissions, Payouts
- **ProductsServicesPage** `/admin/products-services` — 4 tabs: Products, Promo Items, Services, Groups
- **BusinessSettingsPageV2** `/admin/business-settings` — 4 sections: Profile (TZ defaults), Commercial Rules, Affiliate Defaults, Notifications

### Pass 5: Audit, Users, Roles — COMPLETE
- **UsersRolesPage** `/admin/users-roles` — User list with role assignment, status toggle
- **AuditLogPageV2** `/admin/audit` — Audit log with action filter

### Sidebar Structure
Dashboard | Sales (CRM, Quotes, Customers, Vendors) | Operations (Orders, Service Leads, Deliveries) | Finance (Payments Queue, Invoices) | Marketing (Affiliates & Referrals) | Catalog (Products & Services, Stock Items) | Settings (Business Settings, Users & Roles, Audit Log, Service Taxonomy)

---

## Admin Facade API Endpoints (`/api/admin/*`)

| Group | Endpoints |
|-------|-----------|
| Dashboard | `/dashboard/summary`, `/dashboard/pending-actions` |
| Payments | `/payments/queue`, `/payments/{id}`, `/payments/{id}/approve`, `/payments/{id}/reject` |
| Invoices | `/invoices/list`, `/invoices/{id}` |
| Orders | `/orders/list`, `/orders/{id}`, `/orders/{id}/release-to-vendor`, `/orders/{id}/update-status` |
| Quotes | `/quotes/list` |
| Sales CRM | `/sales-crm/leads`, `/sales-crm/accounts`, `/sales-crm/performance`, `/sales-crm/assign-lead`, `/sales-crm/update-lead-status` |
| Customers | `/customers/list`, `/customers/detail/{id}`, `/customers/{id}/assign-sales` |
| Vendors | `/vendors/list`, `/vendors/{id}`, `/vendors/{id}/toggle-status` |
| Affiliates | `/affiliates/list`, `/affiliates/{id}/toggle-status`, `/referrals/list`, `/commissions/list`, `/payouts/list`, `/payouts/{id}/approve` |
| Catalog | `/catalog/products`, `/catalog/services`, `/catalog/groups`, `/catalog/promo-items` |
| Settings | `/settings/business-profile` (GET/POST), `/settings/commercial-rules` (GET/POST), `/settings/affiliate-defaults` (GET/POST), `/settings/notifications` (GET/POST) |
| Users | `/users/list`, `/users/{id}/assign-role`, `/users/{id}/toggle-status` |
| Audit | `/audit/list`, `/audit/actions` |

---

## Credentials
| Account | Email | Password | URL |
|---------|-------|----------|-----|
| Admin | admin@konekt.co.tz | KnktcKk_L-hw1wSyquvd! | `/admin/login` |
| Customer | demo.customer@konekt.com | Demo123! | `/login` |
| Partner | demo.partner@konekt.com | Partner123! | `/partner-login` |

---

## Task Status

### Completed
- [x] All prior packs (UI Polish, Checkout, Payments, Referrals, Multi-Service, Commerce Engine, Customer UX)
- [x] **Admin CRM Refactor - Pass 1** (Backend facade)
- [x] **Admin CRM Refactor - Pass 2** (Payments, Invoices, Orders, Quotes pages)
- [x] **Admin CRM Refactor - Pass 3** (Sales CRM, Customers, Vendors pages)
- [x] **Admin CRM Refactor - Pass 4** (Affiliates, Products/Services, Business Settings pages)
- [x] **Admin CRM Refactor - Pass 5** (Users & Roles, Audit Log pages)
- [x] **Patch Round 1 & 2** (Cart dedup, notification triggers, invoice statuses, vendor visibility)
- [x] **Core Engine** — Quote System, Sales CRM UI, Installment Payment Logic (Deposit + Balance)
- [x] **UI/UX + Data Link Fix Round** — Table+drawer standardization, customer orders visibility, vendor orders linkage, sales contact enrichment
- [x] **Stabilization Pass** — Source-of-truth locked (1 source per page), notification wiring fixed (recipient_user_id), vendor sidebar cleaned (My Orders, no affiliates), branded doc preview, admin sidebar light theme

### Remaining
- [ ] Configure Twilio WhatsApp credentials (P2)
- [ ] Final Launch Verification Checklist (P1)
- [ ] Live payment gateway — KwikPay/Stripe (P1)
- [ ] DNS/SSL setup (P1)
- [ ] One-click reorder / Saved Carts (P2)
- [ ] Mobile-first optimization (P2)
- [ ] Advanced analytics (P2)
- [ ] AI-assisted Auto Quote Suggestions (P2)

---

## Testing History
| Iter | Feature | Result |
|------|---------|--------|
| 99 | Admin Simplification | 100% |
| 100 | Referral + Commission | 100% (27/27) |
| 101 | Multi-Service + Taxonomy | 100% (16/16) |
| 102 | Go-Live Commerce Engine | 100% (15/15) |
| 103 | Customer UX Go-Live Fix Pack | 100% (15/15 backend, 100% frontend) |
| 104 | Admin CRM Refactor Pass 2 | 100% (20/20 backend, 4/4 pages) |
| 105 | **Admin CRM Refactor Pass 3/4/5** | **97% (29/30 backend, 8/8 pages)** |
| 106-107 | Patch Round 1 & 2 | 100% |
| 108 | **Core Engine (Quotes + Installments)** | **100% (18/18 backend, 100% frontend)** |
| 109 | **UI/UX + Data Link Fix Round** | **94% (15/16 backend, 100% frontend)** |
| 110 | **Stabilization Pass (Source-of-Truth + Notifications + Vendor)** | **100% (17/17 backend, 100% frontend)** |

---

## Core Engine Architecture

### Quote Flow
```
Admin Creates Quote (draft) → Sends to Customer (sent) → Customer Accepts (converted) → Invoice + Splits Created
                                                        → Customer Rejects (rejected) → Notifies Sales
```

### Key Endpoints
| Endpoint | Description |
|----------|-------------|
| `POST /api/quotes-engine/create` | Admin creates quote (supports full/installment payment) |
| `POST /api/quotes-engine/{id}/send` | Admin sends quote to customer |
| `POST /api/customer/quotes/{id}/approve` | Customer accepts quote → auto-creates invoice + splits |
| `POST /api/customer/quotes/{id}/reject` | Customer rejects quote with reason |
| `GET /api/customer/invoices/{id}/splits` | Get installment splits for invoice |

### Installment Logic
- Quotes with `payment_type: "installment"` and `deposit_percent > 0`
- On acceptance: Creates invoice + two `invoice_splits` (deposit + balance)
- Invoice `amount_due` set to deposit amount initially
- Customer can select which split to pay on the payment page

*Last updated: March 25, 2026*
