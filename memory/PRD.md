# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth

## System Status: DEPLOYMENT READY — Canonical Checkout Flow

## 4 Sales Modes (Same Canonical Engine)
| Mode | Flow |
|---|---|
| Structured | Quote → Invoice → Order → Delivery → Completion |
| Remote | Order → Delivery → Public Confirmation |
| Walk-in/POS | Order → Payment → Auto Completion |
| Group Deal | Detail → Full-page Checkout (bank details + proof) → Admin Approve → Finalize → Orders + VBO |

## Group Deal Checkout Flow (CANONICAL — Feb 2026)

### Full-Page Checkout (NO POPUP)
- `/group-deals/:id` → "Join Deal" redirects to → `/group-deals/checkout?campaign_id=X`
- **Step 1 (Details)**: Name, phone, email, quantity selector (+/- buttons), Deal Summary sidebar
- **Step 2 (Payment & Proof)**: Bank details block (CRDB BANK, account name/number, SWIFT, branch — identical to normal checkout), payment reference (GDC-XXXX), amount to transfer, payment proof form
- **Step 3 (Confirmation)**: "Payment Submitted" + "Under Review" + commitment ref + share CTAs + Track Status link

### Payment Lifecycle
1. Join → `pending_payment` (NO count increment)
2. Submit proof → `payment_submitted` (admin sees in queue)
3. Admin approve → `committed` (NOW count increments)
4. Finalize → `order_created` (buyer orders + VBO)

### Admin Payment Queue
- Pending payments with customer details + bank reference
- One-click Approve per commitment

### Campaign Creation
- Products from catalog only (product selector)
- Structured pricing: Base Price (read-only) → Vendor Best Price → Deal Price
- Live Profit Calculator, margin ≥ 5% enforced

### Safety
- Duplicate join prevention, campaign lock after finalize
- Count only on approved payments
- Cancel handles all states

## Track Order = Universal Status Page
- Normal orders AND GDC-references
- Payment under review / approved / deal progress / order created / refund

## Key API Endpoints
- `/api/admin/group-deals/campaigns/{id}/join` — pending_payment + commitment_ref
- `/api/public/group-deals/submit-payment` — payment proof
- `/api/admin/group-deals/commitments/{ref}/approve-payment` — admin approve
- `/api/admin/group-deals/commitments/pending-payments` — queue
- `/api/public/group-deals/track` — track by phone or ref
- `/api/public/payment-info` — bank details (shared with normal checkout)

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!`

## Next: Batch 2 — KPI & Performance System
1. Settings Hub: Performance & Growth Targets
2. KPI Engine: profit/user, earnings/affiliate, channel aggregation
3. Performance Dashboard (/admin/performance)

## Backlog
- Twilio WhatsApp Integration
- Resend Email dispatch
- Commission alignment with distributable margin
