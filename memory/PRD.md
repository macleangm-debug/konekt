# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth

## System Status: Production-Grade + Revenue Engine + Group Deals Optimized

## 4 Sales Modes (Same Canonical Engine)
| Mode | Flow |
|---|---|
| Structured | Quote → Invoice → Order → Delivery → Completion |
| Remote | Order → Delivery → Public Confirmation |
| Walk-in/POS | Order → Payment → Auto Completion |
| Group Deal | Campaign → Commitments → Admin Finalize → Buyer Orders + Vendor Back Order |

## Group Deal Campaign System (REFINED — Feb 2026)
- **Core rule**: Join = commitment ONLY. No auto-success. Admin-controlled finalize.
- **Lifecycle**: active → (threshold_met flag) → finalized (by admin) / failed (by admin)
- **Commitment states**: committed → order_created (on finalize) / refund_pending (on cancel) → refunded
- **Finalize creates**: Individual buyer orders + ONE aggregated vendor back order (VBO)
- **Vendor Back Order**: Single aggregated record (total qty, vendor cost, product, preparation status)
- **Homepage integration**: Top 3-6 deals, progress bars, timers, trust messaging, ranked by progress/urgency
- **Mobile UX**: Sticky "Join Deal" CTA on mobile, bottom-sheet join modal
- **Post-join**: Live progress, remaining spots, "Invite friends to unlock faster", WhatsApp + Copy Link share
- **Trust messaging**: "Activates once minimum is reached", "Full refund if campaign fails"
- **Public API hides**: vendor_cost, vendor_threshold, margins, commission data, threshold_met
- **Safety**: 5% minimum margin threshold, blocks below vendor cost

## Customer Portal (Mobile-Optimized — Feb 2026)
- Orders, Invoices, Quotes: Card-based layout on mobile (md:hidden), table on desktop
- Document viewing: StandardDrawerShell (full-width on mobile, right-panel on desktop)
- Track Order: 6-step lifecycle, fulfillment-aware CTA
- Confirm Completion: Accessible from mobile cards + drawer

## Messaging Event Hooks (Prepared — Feb 2026)
- Backend event triggers defined: quote_created, invoice_issued, order_dispatched, awaiting_confirmation, order_completed, efd_ready, group_deal_joined, group_deal_finalized, group_deal_failed, refund_processed
- Standard payload structures ready for Twilio/Resend integration
- Message templates defined per event type
- No fake UI — backend prep only

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

## Key API Endpoints
- `/api/admin/group-deals/campaigns` — CRUD
- `/api/admin/group-deals/campaigns/{id}/join` — commitment only
- `/api/admin/group-deals/campaigns/{id}/finalize` — buyer orders + VBO
- `/api/admin/group-deals/campaigns/{id}/cancel` — fail + refund_pending
- `/api/admin/group-deals/campaigns/{id}/process-refunds` — mark refunded
- `/api/admin/group-deals/vendor-back-orders` — list VBOs
- `/api/public/group-deals` — ranked active deals
- `/api/public/group-deals/featured` — top 6 for homepage
- `/api/public/group-deals/{id}` — deal detail (hides internals)

## Backlog
- Twilio WhatsApp Integration (blocked on keys — hooks ready)
- Resend Email Integration (blocked on keys — hooks ready)
