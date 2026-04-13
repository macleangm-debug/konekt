# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth

## System Status: DEPLOYMENT READY — Payment Flow Corrected

## 4 Sales Modes (Same Canonical Engine)
| Mode | Flow |
|---|---|
| Structured | Quote → Invoice → Order → Delivery → Completion |
| Remote | Order → Delivery → Public Confirmation |
| Walk-in/POS | Order → Payment → Auto Completion |
| Group Deal | Join(pending_payment) → Submit Payment → Admin Approve → Committed → Finalize → Orders + VBO |

## Group Deal Payment Flow (CORRECTED — Feb 2026)

### Payment Lifecycle (Admin-verified)
1. **Join Deal** → `pending_payment` (commitment created, NO count increment)
2. **Submit Payment Proof** → `payment_submitted` (bank ref, amount, method recorded)
3. **Admin Approves** → `committed` + `payment_status: approved` (NOW count increments)
4. **Campaign Finalize** → `order_created` (buyer orders + VBO created)

### Track Order = Universal Status Page
- Supports both normal orders AND group deal commitments
- Enter order number OR GDC-reference
- Shows: payment under review / approved / deal progress / order created / refund status

### Admin Payment Queue
- Pending payments listed with customer details, bank reference
- One-click "Approve" per commitment
- Count only increments after approval

### Campaign Creation (Catalog-linked)
- Products from marketplace catalog only (no free text)
- Structured pricing: Base Price (read-only) → Vendor Best Price → Deal Price
- Live Profit Calculator with SAFE/WARNING/BLOCKED
- Margin ≥ 5% enforced

### Safety
- Duplicate join prevention (same phone)
- Campaign locked after finalize
- Count only on approved payments
- Cancel handles all states → refund_pending

## Customer Portal (Mobile-Optimized)
- Orders, Invoices, Quotes, Group Deals: Cards on mobile, table on desktop
- Account Group Deals shows all commitment statuses including payment_submitted

## Key API Endpoints
- `/api/admin/group-deals/campaigns/{id}/join` — pending_payment + commitment_ref
- `/api/public/group-deals/submit-payment` — payment proof submission
- `/api/admin/group-deals/commitments/{ref}/approve-payment` — admin approve
- `/api/admin/group-deals/commitments/pending-payments` — queue
- `/api/public/group-deals/track` — track by phone or ref
- `/api/admin/group-deals/campaigns/{id}/finalize` — orders + VBO
- `/api/admin/group-deals/products/search` — catalog search

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!`

## Next: Batch 2 — KPI & Performance System
1. Settings Hub: Performance & Growth Targets
2. KPI Engine: profit/user, earnings/affiliate, channel aggregation
3. Performance Dashboard (/admin/performance)

## Backlog
- Twilio WhatsApp Integration (hooks ready)
- Resend Email dispatch
- Commission alignment with distributable margin
