# Konekt - B2B Commerce Platform PRD

## Overview
Konekt is a premium B2B e-commerce platform for promotional materials, office equipment, and design services. Based in Dar es Salaam, Tanzania.

**Vision**: The biggest B2B branding platform in East Africa

---

## Sales Command Center (Updated March 24, 2026)

### Uber-Style Dispatch Board + Instant Quote Builder
**Route**: `/staff/command-center` (Staff/Admin only)

**Layout**:
1. **Hero** — Title, refresh button
2. **Dispatch Board** — 4 priority columns (New Leads, Follow-ups Due, Overdue, Ready to Close)
3. **Instant Quote Builder** — Embedded below dispatch. Click a lead → auto-fills builder

**APIs**:
- `GET /api/sales-command/dispatch-summary` — Returns counts + lists
- `POST /api/sales-command/claim-lead` — Assign lead
- `POST /api/sales-command/mark-followup` — Mark followed up
- `POST /api/instant-quote/preview` — Calculate pricing with margin/buffer/VAT

**Pricing Engine**:
| Component | Value |
|-----------|-------|
| Company Margin | 20% |
| Distribution Buffer | 10% |
| VAT | 18% |

**Key Decision**: Instant Quote moved from customer-facing (`/account/instant-quote`) to sales-only tool embedded in Command Center. Customers see "Request Quote" → Sales builds quote internally.

---

## Checkout Flow (March 23, 2026)
Cart Drawer → Checkout Panel (slide-in) → Quote Submitted  
`POST /api/customer/checkout-quote`

---

## UI Polish Pack (March 23, 2026)
BrandLogoFinal, Design System, Layout Upgrades, Micro-interactions

---

## Credentials
| Account | Email | Password | URL |
|---------|-------|----------|-----|
| Admin | admin@konekt.co.tz | KnktcKk_L-hw1wSyquvd! | `/admin/login` |
| Customer | demo.customer@konekt.com | Demo123! | `/login` |
| Partner | demo.partner@konekt.com | Partner123! | `/partner-login` |

---

## Remaining Tasks

### P0 - Immediate
- [ ] Configure Twilio credentials for WhatsApp

### P1 - Launch Critical
- [x] UI Polish Pack - DONE
- [x] Checkout Flow - DONE
- [x] Instant Quote Engine (sales-only) - DONE
- [x] Sales Command Center - DONE
- [ ] Final Launch Verification Checklist
- [ ] Connect live payment gateway
- [ ] DNS/SSL setup

### P2 - Growth
- [ ] One-click reorder
- [ ] Saved addresses
- [ ] Auto Quote Suggestions (AI-assisted pricing)
- [ ] One-click Quote Templates per service
- [ ] WhatsApp checkout trigger
- [ ] Mobile-first optimization
- [ ] Advanced analytics
- [ ] Push notifications

---

## Testing
| Iteration | Feature | Result |
|-----------|---------|--------|
| 92 | UI Polish Pack | 100% pass |
| 93 | Checkout Flow | 100% pass |
| 94 | Instant Quote + Sales Command | 100% pass (14/14 backend) |

*Last updated: March 24, 2026*
