# Konekt - B2B Commerce Platform PRD

## Overview
Konekt is a premium B2B e-commerce platform for promotional materials, office equipment, and design services. Based in Dar es Salaam, Tanzania.

**Vision**: The biggest B2B branding platform in East Africa

---

## Customer Payment Flow (Implemented March 24, 2026)

### My Account (`/account/my-account`)
- Personal/Business account type toggle
- Contact fields (name, phone, email)
- Business fields (business name, TIN, VAT number) — shown when Business selected
- Default Delivery Details (recipient, phone, address, city, region)
- Default Invoice Details (client name, phone, email, TIN)
- Save persists to `customer_profiles` collection

### Cart Drawer Complete Flow (`CartDrawerCompleteFlow`)
- Replaces old CartDrawerV2 on `/account/*` routes
- Quantity +/- controls with editable input
- VAT (18%) breakdown: Subtotal, VAT, Total
- Two-step flow: Cart → Checkout
- Checkout step prefills Contact, Delivery, Invoice details from saved profile
- Complete Payment creates Order + Invoice + Payment in one API call
- `POST /api/customer-payment/checkout-fixed-price`

### Quote Approval → Invoice
- `POST /api/customer-payment/approve-quote-create-invoice`
- Creates invoice from approved quote, updates quote status

### New Backend Routes
- `GET /api/customer-account/profile?customer_id=<id>`
- `PUT /api/customer-account/profile`
- `GET /api/customer-account/prefill?customer_id=<id>`
- `POST /api/customer-payment/checkout-fixed-price`
- `POST /api/customer-payment/approve-quote-create-invoice`

### New Frontend Components
| Component | Purpose |
|-----------|---------|
| `MyAccountProfilePage.jsx` | Personal/Business profile form |
| `CartDrawerCompleteFlow.jsx` | Full payment cart drawer |
| `MarketplaceTabsV4.jsx` | Products + Services + Promo tabs |
| `AdaptiveMarketplaceSearch.jsx` | Tab-aware search |
| `EmptyQuotesStateRestored.jsx` | Empty quotes state |
| `EmptyInvoicesStateRestored.jsx` | Empty invoices state |
| `useCustomerProfile.js` | Profile data hook |

---

## Customer Account Unification (Implemented March 24, 2026)

### Unified Marketplace (`/account/marketplace`)
- **Products Tab** (default): 41 products in compact 5-column grid with Add button → Cart Drawer
- **Services Tab**: 4 service templates → Detail Showcase → Quote Request Form
- Tab state synced via URL params (`?tab=products` / `?tab=services`)

### Removed from Customer Side
- Cart page (replaced by Cart Drawer + topbar button)
- Services page (merged into Marketplace Services tab)
- Let Sales Assist page (available as link in Cart Drawer checkout)

---

## Sales Command Center (`/staff/command-center`)
- 4-column dispatch board (New Leads, Follow-ups, Overdue, Ready to Close)
- Instant Quote Builder (embedded, sales-only)
- Lead auto-fill when clicking from dispatch board

---

## Checkout Flow
Cart Drawer → Checkout Panel (slide-in) → Quote Submitted  
`POST /api/customer/checkout-quote`

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
- [ ] Final Launch Verification Checklist
- [ ] Live payment gateway (KwikPay/Stripe)
- [ ] DNS/SSL setup

### P2 - Growth
- [ ] One-click reorder
- [ ] Saved addresses
- [ ] AI-assisted quote suggestions
- [ ] Quote templates per service
- [ ] WhatsApp checkout trigger
- [ ] Mobile-first optimization
- [ ] Advanced analytics
- [ ] Push notifications

---

## Testing
| Iteration | Feature | Result |
|-----------|---------|--------|
| 92 | UI Polish | 100% |
| 93 | Checkout Flow | 100% |
| 94 | Quote Engine + Sales Command | 100% |
| 95 | Customer Account Unification | 100% |
| 96 | Customer Payment Flow Completion | 100% (13/13 backend, all frontend) |

*Last updated: March 24, 2026*
