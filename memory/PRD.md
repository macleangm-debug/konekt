# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth

## System Status: Production-Grade + Revenue Engine

## 4 Sales Modes (Same Canonical Engine)
| Mode | Flow |
|---|---|
| Structured | Quote → Invoice → Order → Delivery → Completion |
| Remote | Order → Delivery → Public Confirmation |
| Walk-in/POS | Order → Payment → Auto Completion |
| Group Deal | Campaign → Commitments → Finalize → Orders |

## Group Deal Campaign System (NEW — Complete)
- **Backend**: GroupDealCampaign + GroupDealCommitment entities
- **Admin** (/admin/group-deals): Create campaigns with live profit calculator, manage lifecycle
- **Public** (/group-deals): Deal cards with progress bars, countdown timers, trust messaging
- **Join flow**: Name + Phone + Payment → Commitment
- **Success**: vendor_threshold reached → admin finalizes → orders created for all buyers
- **Failure**: deadline + target not met → cancel → refund_pending
- **Safety**: 5% minimum margin threshold, blocks below vendor cost
- **Public API hides**: vendor_cost, vendor_threshold, margins, commission data

## All Complete Systems
- Document System (Canonical Renderer, 4 Templates, WYSIWYG PDF)
- Delivery Closure (Dual-mode, locked records, audit trail)
- Public Completion (Token/Phone/Order# → 3-screen mobile)
- Track Order (6-step lifecycle, fulfillment-aware CTA)
- Walk-in POS Sale (one-screen, auto-completion, assisted commission)
- Advanced Analytics (KPIs, revenue trends, channels, funnel, operations health)
- Data Integrity Dashboard (health score, compliance/order/fulfillment monitoring)
- Settings Hub (unified, pricing tiers source-of-truth)
- Business Client Validation (VRN + BRN)
- EFD Receipt Workflow (on-demand)
- Customer Portal (/account) with completion CTA + documents
- Account Mapping (phone → historical orders)

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Customer: `test@konekt.tz` / `TestUser123!`
- Vendor: `demo.partner@konekt.com` / `Partner123!`
- Staff/Sales: `staff@konekt.co.tz` / `Staff123!`
