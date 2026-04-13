# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth

## System Status: DEPLOYMENT READY

## 4 Sales Modes (Same Canonical Engine)
| Mode | Flow |
|---|---|
| Structured | Quote → Invoice → Order → Delivery → Completion |
| Remote | Order → Delivery → Public Confirmation |
| Walk-in/POS | Order → Payment → Auto Completion |
| Group Deal | Campaign → Commitments (multi-unit) → Admin Finalize → Buyer Orders + Vendor Back Order |

## Group Deal Campaign System (COMPLETE — Feb 2026)

### Core Rules
- **Join = commitment ONLY** — no orders, no auto-success
- **Admin-controlled finalize** — creates buyer orders + ONE aggregated VBO
- **Success threshold based on UNITS, not buyer count**
- **Overflow allowed** (112/100 is valid — better for revenue)
- **Duplicate join prevention** (same phone blocked)
- **Campaign locked after finalize** (no new joins)

### Lifecycle
- active → (threshold_met flag) → finalized (by admin) / failed (by admin)
- Commitment states: `committed` → `order_created` / `refund_pending` → `refunded`

### Display
- Progress: "X/Y units committed" (primary), "Z buyers" (secondary)
- Admin: Units / Buyers / Avg per buyer / Committed revenue

### Deal of the Day
- `is_featured` flag — only 1 active at a time
- Requires ≥30% progress to feature
- Shows in homepage hero with urgency messaging
- Admin toggle: Set Featured / Unfeatured

### Account Group Deals (/account/group-deals)
- Personal view of user's commitments (not marketplace)
- Card-based mobile layout, sorted: active → successful → failed → refunded
- Links to orders (on success) / shows refund status (on failure)
- Share buttons for active deals

### Safety
- 5% minimum margin threshold
- Duplicate join prevention (same phone)
- Campaign lock after finalize
- Refund amount = paid amount

### Trust Messaging
- "Activates once minimum is reached"
- "Full refund if campaign fails"
- "Secure payment"

## Customer Portal (Mobile-Optimized)
- Orders, Invoices, Quotes, Group Deals: Card-based on mobile, table on desktop
- Document viewing: StandardDrawerShell (full-width mobile, right-panel desktop)
- Track Order: 6-step lifecycle, fulfillment-aware CTA
- Confirm Completion: Accessible on mobile

## Messaging Event Hooks (Backend-Ready)
- 14 event types with standard payloads
- Templates ready for Twilio/Resend dispatch
- Wired into group deal lifecycle (join, finalize, cancel)
- Resend API key configured in .env

## All Complete Systems
- Document System (Canonical Renderer, 4 Templates, WYSIWYG PDF)
- Delivery Closure (Dual-mode, locked records, audit trail)
- Public Completion (Token/Phone/Order#)
- Walk-in POS Sale + Account Mapping
- Advanced Analytics + Data Integrity Dashboard
- Settings Hub (unified, pricing tiers source-of-truth)
- Business Client Validation (VRN + BRN)
- EFD Receipt Workflow

## Key API Endpoints
- `/api/admin/group-deals/campaigns` — CRUD
- `/api/admin/group-deals/campaigns/{id}/join` — commitment (multi-unit)
- `/api/admin/group-deals/campaigns/{id}/finalize` — buyer orders + VBO
- `/api/admin/group-deals/campaigns/{id}/cancel` — fail + refund_pending
- `/api/admin/group-deals/campaigns/{id}/process-refunds` — mark refunded
- `/api/admin/group-deals/campaigns/{id}/set-featured` — Deal of the Day
- `/api/admin/group-deals/vendor-back-orders` — list VBOs
- `/api/public/group-deals` — ranked active deals
- `/api/public/group-deals/featured` — top 6 for homepage
- `/api/public/group-deals/deal-of-the-day` — featured deal
- `/api/customer/group-deals?phone=X` — user's commitments

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`

## Backlog
- Twilio WhatsApp Integration (hooks ready, keys needed)
- Resend Email Integration (key configured, dispatch implementation)
- First 3 launch campaigns (product selection + pricing)
