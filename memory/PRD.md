# Konekt - B2B Commerce Platform PRD

## Overview
Konekt is a premium B2B e-commerce platform for promotional materials, office equipment, and design services. Based in Dar es Salaam, Tanzania.

**Vision**: The biggest B2B branding platform in East Africa

---

## Final Commercial Flow Pack (Implemented March 24, 2026)

### My Account (`/account/my-account`) — MyAccountPageV2
- Personal/Business account type toggle
- Phone prefix dropdown (+255, +254, +256, +250, +257)
- Contact fields: name, phone (with prefix), email
- Business fields: business name, TIN, VAT number (shown when Business selected)
- Default Quote & Invoice Details: client name, phone, email, TIN
- Up to 3 delivery addresses with labels, default selection, add/remove
- Save persists to `customer_profiles` collection

### Cart → Checkout → Payment → Proof Flow (CartDrawerCompleteFlow)
- **Step 1 (Cart)**: Quantity +/- controls, VAT (18%) breakdown, Remove items
- **Step 2 (Checkout)**: Contact details, "Same as contact details" toggle for delivery, delivery address, invoice client details — all prefilled from profile
- **Step 3 (Payment)**: Order confirmation, bank transfer details with copy-to-clipboard, payment proof upload form (payer name, reference number, amount)
- **Step 4 (Done)**: Confirmation with order/invoice numbers, "Payment Under Review" status
- Saves missing checkout details back to My Account profile
- Creates: checkout + invoice + order + vendor orders + sales assignment + order events
- AI Chat widget hides when cart is open

### Marketplace V5 (`/account/marketplace`) — MarketplaceUnifiedPageV3
- **3 Tabs**: Products, Services, Promotional Materials
- Adaptive search/filter with group dropdown
- Skeleton loading + "Load More" lazy pagination (20 per page)
- Products → Cart → Checkout (no quotes)
- Services → Quote Request Form (via ServiceDetailShowcase)
- Promotional Materials → filtered product view

### Orders Split View (`/account/orders`) — OrdersSplitView
- **Table view** (default): Left list + right detail preview with items, totals, timeline
- **Card view**: Grid of order cards with status badges
- TableCardToggle component (reusable)
- Human-readable status labels: Unpaid, Payment Under Review, Paid, Processing, Ready to Fulfill

### Status Labels (Unified)
| Raw Status | Display Label |
|-----------|---------------|
| pending | Awaiting Your Approval |
| pending_payment | Unpaid |
| payment_proof_uploaded | Payment Under Review |
| paid | Paid |
| approved | Accepted |
| processing | Processing |

### Payment Proof Approval Rules
- **Uploadable by**: Customer
- **Visible to**: Admin, Finance, Sales
- **Approvable by**: Admin, Finance ONLY (Sales cannot approve)

### Invoices & Quotes Pages
- Updated with TableCardToggle
- Status labels use human-readable mapping
- Restored empty states with links back to marketplace

---

## Backend API Endpoints

### Customer Account (`profile_router`)
- `GET /api/customer-account/profile?customer_id=<id>` — Returns profile with phone_prefix_options
- `PUT /api/customer-account/profile` — Saves profile (addresses, business info, etc.)
- `GET /api/customer-account/prefill?customer_id=<id>` — Returns saved details for checkout prefill

### Commercial Flow (`flow_router`)
- `POST /api/commercial-flow/create-product-checkout` — Full checkout: order + invoice + vendor orders + sales assignment + event
- `POST /api/commercial-flow/payment-proof` — Upload payment proof
- `POST /api/commercial-flow/payment-proof/approve` — Finance/Admin only approval
- `POST /api/commercial-flow/quote/accept-and-create-invoice` — Quote → Invoice (full or deposit)
- `GET /api/commercial-flow/orders/split-view?customer_id=<id>` — Orders with timeline
- `GET /api/commercial-flow/invoices?customer_id=<id>` — Invoices with status labels
- `GET /api/commercial-flow/payment-proofs?invoice_id=<id>` — Payment proofs for invoice

---

## Business Rules
- **Fixed-price products**: Cart → Checkout → Payment → Proof (NO quotes)
- **Services / Custom items**: Quote Request → Quote Approval → Invoice
- **Instant Quote Builder**: Sales-side only (never visible to customers)
- **Payment types**: Full Payment or Deposit + Balance
- **Deposit flow**: Quote accepted → deposit invoice → deposit paid → service starts → balance invoice later

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
- [ ] Configure Twilio WhatsApp credentials (deferred — waiting for user keys)

### P1 - Launch Critical
- [x] UI Polish Pack
- [x] Checkout Flow
- [x] Sales Command Center + Quote Engine
- [x] Customer Account Unification
- [x] Customer Payment Flow Completion
- [x] Final Commercial Flow Pack (My Account, Cart/Checkout/Payment, Marketplace V5, Orders Split View, Status Labels)
- [ ] Final Launch Verification Checklist
- [ ] Live payment gateway (KwikPay/Stripe)
- [ ] DNS/SSL setup

### P2 - Growth
- [ ] One-click reorder
- [ ] AI-assisted quote suggestions
- [ ] Quote templates per service
- [ ] WhatsApp checkout trigger
- [ ] Mobile-first optimization
- [ ] Advanced analytics
- [ ] Push notifications

---

## Testing History
| Iteration | Feature | Result |
|-----------|---------|--------|
| 92 | UI Polish | 100% |
| 93 | Checkout Flow | 100% |
| 94 | Quote Engine + Sales Command | 100% |
| 95 | Customer Account Unification | 100% |
| 96 | Customer Payment Flow (simple) | 100% (13/13 backend) |
| 97 | Final Commercial Flow Pack | 100% backend (19/19), 95% frontend |

*Last updated: March 24, 2026*
