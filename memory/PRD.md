# Konekt - B2B Commerce Platform PRD

## Overview
Konekt is a premium B2B e-commerce platform for promotional materials, office equipment, and design services. Based in Dar es Salaam, Tanzania.

**Vision**: The biggest B2B branding platform in East Africa

---

## Architecture: Live Commerce Engine

### Single Source of Truth
`backend/core/live_commerce_service.py` — centralized facade for production commerce.

```
/api/live-commerce/*  →  LiveCommerceService  →  MongoDB
```

### Master Flow
```
Product Checkout → Invoice → Payment Intent → Proof Upload (with payer name)
    → Finance Queue → Approve/Reject → Order + Vendor Orders + Commissions
```

---

## Customer UX (Go-Live Fix Pack)

### Pass 1: Payment Proof Validation (BankTransferPage)
- "Name on Bank Transfer" field ABOVE proof upload
- Helper text explaining why it's needed
- Inline error states (red border + message)
- Submit disabled until payer name + proof filled

### Pass 2: Quotes (Table-First)
- Columns: Quote #, Date, Valid Until, Type, Amount, Status, Payment, Actions
- Explicit action labels: View, Accept, Pay Invoice
- Expired quotes retained as history with disabled actions
- Search + status filter

### Pass 3: Invoices (Enhanced)
- Columns: Invoice #, Source, Type, Amount, Payment Status, Rejection Reason, Actions
- Unpaid total alert banner
- Resubmit Proof link for rejected invoices
- Navigate to Order from paid invoices

### Pass 4: Orders (Responsive Drawer)
- Table: Order #, Date, Items, Total, Status, Payment
- Click row → detail drawer with items, totals, delivery, status banner
- Desktop: slide-in drawer | Mobile-ready

---

## Backend API Endpoints

### Live Commerce (`/api/live-commerce/*`) — PRIMARY
| Endpoint | Description |
|----------|-------------|
| `POST /product-checkout` | Create invoice from cart |
| `POST /quotes/{id}/accept` | Accept quote → invoice |
| `POST /invoices/{id}/payment-intent` | Create payment intent |
| `POST /payments/{id}/proof` | Submit proof (payer name required) |
| `GET /finance/queue` | Finance review queue |
| `POST /finance/proofs/{id}/approve` | Approve → order if fully paid |
| `POST /finance/proofs/{id}/reject` | Reject → revert to pending |
| `GET /customers/{id}/workspace` | Customer dashboard data |

### Other Active Routes
- `/api/multi-request/*` — Service taxonomy, promo/service bundles
- `/api/referral-commission/*` — Affiliate + commission management
- `/api/admin-flow-fixes/*` — Admin operations
- `/api/uploads/*` — File uploads

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
- [x] UI Polish Pack
- [x] Checkout Flow + Sales Command Center + Quote Engine
- [x] Customer Account Unification + Payment Flow
- [x] Final Commercial Flow + Payments Governance
- [x] Admin Simplification + Payments Fixes
- [x] Referral + Sales Commission Governance
- [x] Payment Confirmation + Affiliate Promo
- [x] Multi-Service + Promo Taxonomy
- [x] **Go-Live Commerce Engine** (centralized facade)
- [x] **Customer UX Go-Live Fix Pack** (4 passes)

### Remaining
- [ ] Configure Twilio WhatsApp credentials (P0)
- [ ] Finance/Admin bug-fix pass (P1)
- [ ] Final Launch Verification Checklist (P1)
- [ ] Live payment gateway — KwikPay/Stripe (P1)
- [ ] DNS/SSL setup (P1)
- [ ] One-click reorder / Saved Carts (P2)
- [ ] Mobile-first optimization (P2)
- [ ] Advanced analytics (P2)

---

## Testing History
| Iter | Feature | Result |
|------|---------|--------|
| 99 | Admin Simplification | 100% |
| 100 | Referral + Commission | 100% (27/27) |
| 101 | Multi-Service + Taxonomy | 100% (16/16) |
| 102 | Go-Live Commerce Engine | 100% (15/15) |
| 103 | **Customer UX Go-Live Fix Pack** | **100% (15/15 backend, 100% frontend)** |

*Last updated: March 24, 2026*
