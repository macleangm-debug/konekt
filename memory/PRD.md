# Konekt - B2B Commerce Platform PRD

## Overview
Konekt is a premium B2B e-commerce platform for promotional materials, office equipment, and design services. Based in Dar es Salaam, Tanzania.

**Vision**: The biggest B2B branding platform in East Africa

---

## Architecture: Live Commerce Engine (Go-Live Facade)

### Single Source of Truth
All production-critical commerce logic lives in `backend/core/live_commerce_service.py`. Old route packs remain intact but the go-live path uses:

```
/api/live-commerce/*  →  LiveCommerceService  →  MongoDB
```

### Master Flow (Centralized)
```
Product Checkout → Invoice Created
    ↓
Payment Intent (full or deposit)
    ↓
Proof Upload → Status: under_review
    ↓
Finance Queue (admin/finance only)
    ↓
Approve → Order + Vendor Orders + Sales Assignment + Commissions
   OR
Reject → Invoice reverts to pending_payment
```

### Key Design Rules
- **No order before approval** — enforced at service level
- **Idempotency** — approving same proof twice doesn't duplicate orders
- **Role gating** — only finance/admin can approve (sales gets 403)
- **Partial payment** — correctly detected, no order until fully paid
- **Commission trigger** — non-margin-touching, fires after order creation

---

## Backend API Endpoints

### Live Commerce (`/api/live-commerce/*`) — PRIMARY
| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `POST /product-checkout` | Create invoice from cart items |
| `POST /quotes/{id}/accept` | Accept quote → create invoice |
| `POST /invoices/{id}/payment-intent` | Create payment intent (full/deposit) |
| `POST /payments/{id}/proof` | Submit payment proof |
| `GET /finance/queue` | Finance review queue |
| `POST /finance/proofs/{id}/approve` | Approve → create order if fully paid |
| `POST /finance/proofs/{id}/reject` | Reject → revert to pending |
| `GET /customers/{id}/workspace` | Customer invoices/payments/orders |

### Multi-Request (`/api/multi-request/*`)
| Endpoint | Description |
|----------|-------------|
| `GET /service-taxonomy` | Service groups with subgroups |
| `POST /promo-bundle` | Multi-item promo request |
| `POST /service-bundle` | Multi-service request |

### Referral + Commission (`/api/referral-commission/*`)
| Endpoint | Description |
|----------|-------------|
| `GET /rules` | Commission rules |
| `PUT /rules` | Update commission rules |
| `POST /affiliate/create` | Create affiliate |
| `GET /admin/affiliates` | Affiliate list with stats |

### Legacy Routes (Still Active)
- `/api/payments-governance/*` — original governance routes
- `/api/admin-flow-fixes/*` — admin flow fixes
- `/api/payment-submission-fixes/*` — payment submission fixes

---

## Frontend Architecture

### Go-Live Payment Flow Pages
| Route | Component | Purpose |
|-------|-----------|---------|
| `/checkout` | CheckoutPage | Cart → Invoice via live commerce |
| `/checkout/v2` | CheckoutPageV2 | Alternative checkout flow |
| `/payment/select` | PaymentSelectionPage | Payment method selection |
| `/payment/bank-transfer` | BankTransferPage | Bank details + proof upload |
| `/payment/pending` | PaymentPendingPage | "Payment Under Review" status |

### Admin Pages
| Route | Component |
|-------|-----------|
| `/admin/affiliate-manager` | 3-tab: Affiliates, Commission Rules, Promo Benefit |
| `/admin/service-taxonomy` | Service groups/subgroups management |
| `/admin/service-leads` | CRM for leads |
| `/admin/finance-queue` | Approve/reject proofs |
| `/admin/orders` | Orders split view |

### Cart Flow
- `CartDrawerCompleteFlow` — 4-step cart with LockedSavedDetailsSection + ConfirmActionModal
- Uses `liveCommerceApi` for checkout and `uploadApi` for proof uploads

---

## Credentials
| Account | Email | Password | URL |
|---------|-------|----------|-----|
| Admin | admin@konekt.co.tz | KnktcKk_L-hw1wSyquvd! | `/admin/login` |
| Customer | demo.customer@konekt.com | Demo123! | `/login` |
| Partner | demo.partner@konekt.com | Partner123! | `/partner-login` |

---

## Bank Details (Go-Live)
| Field | Value |
|-------|-------|
| Bank | CRDB BANK |
| Account | KONEKT LIMITED |
| Number | 015C8841347002 |
| Branch | Main Branch |
| SWIFT | CORUTZTZ |
| Currency | TZS |

---

## Task Status

### Completed
- [x] UI Polish Pack
- [x] Checkout Flow
- [x] Sales Command Center + Quote Engine
- [x] Customer Account Unification
- [x] Customer Payment Flow
- [x] Final Commercial Flow Pack
- [x] Payments + Fulfillment Governance Pack
- [x] Admin Simplification + Payments Fixes Pack
- [x] Referral + Sales Commission Governance Pack
- [x] Payment Confirmation + Affiliate Promo Pack
- [x] Multi-Service + Promo Taxonomy Pack
- [x] **Go-Live Commerce Engine** (centralized facade)

### Remaining
- [ ] Configure Twilio WhatsApp credentials (P0)
- [ ] Final Launch Verification Checklist (P1)
- [ ] Live payment gateway — KwikPay/Stripe (P1)
- [ ] DNS/SSL setup (P1)
- [ ] One-click reorder / Saved Carts (P2)
- [ ] AI-assisted quote suggestions (P2)
- [ ] Mobile-first optimization (P2)
- [ ] Advanced analytics (P2)

---

## Testing History
| Iter | Feature | Result |
|------|---------|--------|
| 99 | Admin Simplification | 100% |
| 100 | Referral + Commission | 100% (27/27) |
| 101 | Multi-Service + Taxonomy | 100% (16/16) |
| 102 | **Go-Live Commerce Engine** | **100% (15/15 backend, 100% frontend)** |

*Last updated: March 24, 2026*
