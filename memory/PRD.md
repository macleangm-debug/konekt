# Konekt - B2B Commerce Platform PRD

## Overview
Konekt is a premium B2B e-commerce platform for promotional materials, office equipment, and design services. Based in Dar es Salaam, Tanzania.

**Vision**: The biggest B2B branding platform in East Africa

---

## Governance Model (Implemented March 24, 2026)

### Core Rule: Orders Created ONLY After Payment Approval

**Fixed-Price Products Flow:**
1. Customer adds products to cart
2. Checkout creates **Invoice** (no order yet)
3. Payment intent created (full or deposit)
4. Customer uploads payment proof (camera/file, no transaction reference)
5. Finance/Admin reviews proof in Finance Queue
6. **On approval**: Order + Vendor Orders + Sales Assignment created
7. On rejection: Invoice reverts to pending, customer can resubmit

**Services / Custom Work Flow:**
1. Customer or Sales creates quote request
2. Sales prepares quote via Instant Quote Builder
3. Customer or Sales accepts quote
4. Invoice created from accepted quote
5. Same payment → proof → approval flow as above

### Payment Proof Rules
- **No transaction reference field** — payer name + amount + file only
- Camera capture or file upload supported
- **Finance/Admin**: Can approve or reject
- **Sales**: Can view but CANNOT approve (403 blocked)

---

## Backend API Endpoints

### Payments Governance (`/api/payments-governance/*`)
| Endpoint | Description |
|----------|-------------|
| `POST /product-checkout` | Creates invoice only (no order) |
| `POST /invoice/payment-intent` | Creates payment intent (full/deposit) |
| `POST /payment-proof` | Upload proof (no reference field) |
| `GET /finance/queue` | Pending proofs for finance review |
| `POST /finance/approve` | Approve → creates order + assignments |
| `POST /finance/reject` | Reject with reason |
| `POST /quote/accept` | Accept quote → create invoice |
| `GET /customer/invoices` | Customer's invoices |
| `GET /customer/payments` | Customer's payments |

### Customer Account (`/api/customer-account/*`)
| Endpoint | Description |
|----------|-------------|
| `GET /profile` | Profile with phone prefixes + addresses |
| `PUT /profile` | Save profile |
| `GET /prefill` | Prefill for checkout |

---

## Frontend Components

### Cart Drawer (4-step governance flow)
- **Step 1 (Cart)**: Items, qty +/-, VAT breakdown
- **Step 2 (Checkout)**: Contact + "Same as contact" toggle + Delivery + Invoice details
- **Step 3 (Payment)**: Bank details with copy, camera/file proof upload
- **Step 4 (Done)**: "Payment Under Review" — order created after approval
- Saves missing details back to profile
- Hides AI assistant when open

### Finance Payments Queue (`/admin/finance-queue`)
- Split-view: proof list (left) + detail panel (right)
- Approve/Reject with reason
- Shows invoice items, amounts, payer details

### Admin Orders Split View (`/admin/orders`)
- Table/Card toggle (table default on desktop)
- Split-view: order list (left) + detail (right)
- Customer info, delivery, items, totals, timeline

### Marketplace V5 (`/account/marketplace`)
- **3 Tabs**: Products, Services, Promotional Materials
- Adaptive search + group filter
- Skeleton loading + "Load More" lazy pagination
- Product detail modal with variants (colors, sizes)

### My Account (`/account/my-account`)
- Personal/Business toggle
- Phone prefix dropdowns
- Up to 3 delivery addresses with default
- Quote/Invoice client defaults

---

## Status Labels
| Raw Status | Display Label |
|-----------|---------------|
| pending | Awaiting Your Approval |
| pending_payment | Unpaid |
| payment_under_review | Payment Under Review |
| paid | Paid |
| processing | Processing |
| proof_rejected | Proof Rejected |

---

## Credentials
| Account | Email | Password | URL |
|---------|-------|----------|-----|
| Admin | admin@konekt.co.tz | KnktcKk_L-hw1wSyquvd! | `/admin/login` |
| Customer | demo.customer@konekt.com | Demo123! | `/login` |
| Partner | demo.partner@konekt.com | Partner123! | `/partner-login` |
| Staff/Sales | admin@konekt.co.tz | KnktcKk_L-hw1wSyquvd! | `/staff-login` |

---

## Remaining Tasks

### P0
- [ ] Configure Twilio WhatsApp credentials

### P1 - Launch Critical
- [x] UI Polish Pack
- [x] Checkout Flow
- [x] Sales Command Center + Quote Engine
- [x] Customer Account Unification
- [x] Customer Payment Flow
- [x] Final Commercial Flow Pack
- [x] Payments + Fulfillment Governance Pack
- [ ] Final Launch Verification Checklist
- [ ] Live payment gateway (KwikPay/Stripe)
- [ ] DNS/SSL setup

### P2 - Growth
- [ ] One-click reorder / Saved Carts
- [ ] AI-assisted quote suggestions
- [ ] Mobile-first optimization
- [ ] Advanced analytics
- [ ] Push notifications

---

## Testing History
| Iter | Feature | Result |
|------|---------|--------|
| 92 | UI Polish | 100% |
| 93 | Checkout Flow | 100% |
| 94 | Quote Engine + Sales Command | 100% |
| 95 | Customer Account Unification | 100% |
| 96 | Customer Payment Flow | 100% |
| 97 | Final Commercial Flow | 100% |
| 98 | Payments + Fulfillment Governance | 94.7% backend (18/19), 100% frontend |

*Last updated: March 24, 2026*
