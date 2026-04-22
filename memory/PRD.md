# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: 346 ITERATIONS — 100% PASS RATE

---

## ALL FEATURES COMPLETE (Apr 17-20, 2026)

### Country Intelligence (Latest - Batch 10)
1. **Auto-detect user country** — Browser timezone → /api/geo/detect-country → auto-sets marketplace country (Africa/Dar_es_Salaam→TZ, Africa/Nairobi→KE, Africa/Kampala→UG)
2. **Admin Country Reports** — /admin/country-reports with period selector (week/month/quarter/year). Shows revenue, profit, margin, orders, quotes, invoices, new customers, outstanding — broken down by TZ/KE/UG. Export to JSON.
3. **Reports API** — GET /api/admin/reports/summary, /vendors, /customers with period and country params.
4. **Marketplace auto-detect** — On first load, detects user's timezone and auto-selects their country in the marketplace selector.

### Full Feature Manifest (24 Features, All Verified)
1. Dashboard Profit Tracking + Revenue & Profit dual-line chart
2. Admin-Only Credit Terms on Customer Profiles
3. Service Site Visit 2-Stage Flow
4. Statement of Accounts branded rendering
5. Multi-Country Config + Document Numbering
6. Order Status Restrictions (Sales blocked)
7. Quote Creation with branded live preview
8. Marketplace service cards fix
9. Go-Live Reset (Testing → Live mode)
10. Impersonate Users + Return Banner
11. "Customize this" CTA on products
12. Credit Terms at Checkout
13. Feedback/Issue Widget + Admin Inbox + Badge
14. Vendor-Category Assignments + Order Auto-Splitting
15. Number & Currency Format Settings
16. Admin Override Promo (all distributable margin)
17. Services in Quote Creation
18. Micro-interactions (card lift, button press, stagger)
19. Vendor Order Auto-Routing
20. Country Switcher (admin + marketplace)
21. Anti-Bot Protection (honeypot + timing + rate limiting)
22. Multi-Country Data Isolation (country_code on entities)
23. Country Expansion Pages (non-live markets)
24. Country Reports + Geo Auto-Detection

### Production Launch (Apr 21, 2026)
25. **Emergent badge hidden** for production (CSS override in index.html)
26. **Konekt Triad logo** enforced site-wide — all other logo variants deleted; only `konekt-triad-logo.svg`, `konekt-triad-icon.png`, `konekt-triad-full.png` remain
27. **Domain linked** — konekt.co.tz live via Zesha DNS (A records 162.159.142.117, 172.66.2.113 + CNAME www → konekt.co.tz, DNS-only)

### Group Deal Command Center (Apr 21, 2026)
28. **Expired deals auto-hide** from Deal of the Day (backend `deadline > now` filter + frontend fallback)
29. **Unified table + drawer UI** on /admin/group-deals — one single table (Product / Price / Progress / Buyers / Payments / Revenue / Status / Deadline), click row → drawer with full details and all actions (View buyers, Contact buyers, Push to Sales, Mark vendor paid, Cancel & refund)
30. **Lifecycle stages**: Live / Needs Decision / In Fulfillment / Closed tabs + red "Needs Decision" banner
31. **Commission engine for Group Deals** — 5% of margin (configurable per-campaign, defaults from settings), attributed via buyer's promo code → affiliate OR sales wallet, min payout floor TZS 50,000, credited on finalize
32. **P&L per finalized campaign** — revenue / vendor cost / margin / commissions / Konekt net profit
33. **Vendor payout tracker** — admin marks vendor paid with reference; status syncs to vendor's dashboard
34. **Group Deal vendor orders** — finalize creates an aggregated `vendor_order` (is_group_deal: true, no client details) that surfaces on vendor dashboard with amber "GD" badge
35. **Inline Approve** for payment_submitted buyers in the View Buyers modal (replaces old separate Pending Payments section)
36. **Contact Buyers modal** — WhatsApp bulk open, email BCC, copy phones/emails/message, template with {name} personalization
37. **Help (?) icon redesigned** — circular navy gradient button with float + pulsing aura + bouncing accent dot, respects prefers-reduced-motion

### Vendor Operations RFQ Workflow (Apr 21, 2026)
38. **Vendor-facing RFQ inbox** — new page `/partner/vendor/quote-requests` + sidebar link. Desktop table + mobile cards + drawer. 5 stat tabs (Awaiting/Quoted/Won/Lost/Expired).
39. **Vendor submits quote online** — base price, lead time, notes → lands in Ops review state (never auto-propagates)
40. **Vendor can decline** with reason
41. **RFQ auto-expiry** — checked on read; vendor quote marked `expired` if past `quote_expiry` or `sent_at + default_quote_expiry_hours`
42. **Notifications** — vendor gets notified on new RFQ sent + award/not-selected decision. Ops gets notified on vendor quote submission.
43. **Konekt pricing-engine reference** on each Ops quote card — shows Konekt expected sell price, min sell, margin % beside the vendor's base price, so Ops always compares against source of truth
44. **RFQ stats card** on vendor dashboard — "X quote requests awaiting you" with animated amber banner
45. **Competitor price isolation** — vendor only sees their own quote row; competitor prices never exposed

### Vendor Ops UX Overhaul — Task-First Design (Apr 22, 2026)
46. **Kanban board replaces the crammed RFQ table** — 4 columns (NEW / WAITING FOR VENDORS / PICK A WINNER / DONE) with colour-coded dots, progress bars, and a single stage-specific CTA per card
47. **Urgent "What needs me?" strip** at top — red when work pending (*"N quotes need a winner · N new to send"*), green ✓ *"All clear"* otherwise
48. **Plain-language vocabulary** — `prettyStatus()` helper maps internal statuses to plain English ("Waiting for vendors", "All quotes in", "Ready for customer", etc.)
49. **Wizard stepper for RFQ detail** — 5 steps (Details → Pick vendors → Wait for quotes → Pick a winner → Done). ONE decision visible per step, stepper bar at top shows progress at a glance
50. **Konekt-as-single-client model** — vendor-facing endpoints now scrub ALL end-customer identity:
    - `/api/vendor/orders` returns `client_name: "Konekt Operations"`, no customer_name/customer_phone/sales_name/sales_phone/sales_email
    - `/api/vendor/quote-requests` returns `requested_by: "Konekt Operations"` and sanitizes free-text notes (`_sanitize_for_vendor`) to strip phone/email patterns before showing
    - Vendor Order drawer UI now labels contact section "Konekt Operations (your client)" — no salesperson exposed
    - Dashboard job cards show "Konekt Operations" as client
51. **Step-specific UX**:
    - Step 2 shows vendor checklist with preferred-vendor badge + "Send Request →" primary CTA
    - Step 3 shows per-vendor status rail (Quoted ✓ / Declined / Waiting…) + collapsible manual entry
    - Step 4 shows big quote cards (BEST PRICE badge), inline Konekt sell/min sell/margin reference, huge "Pick this winner →" button
    - Step 5 shows emerald success screen with final numbers grid + **"Send to Sales →"** button that hands off to the assigned salesperson with notification

### Product SKU Foundation (Apr 22, 2026)
52. **Konekt SKU generator** (`services/sku_service.py`) — single source of truth
53. **Pattern**: `{PREFIX}-{COUNTRY}-{CATEGORY}-{RANDOM}` → `KNT-TZ-OEQ-A7K92M` — country-isolated for multi-country rollout
54. **Auto-derive category code** from category name with admin override option (Settings Hub → catalog → categories → code)
55. **Collision checking** — retries up to 5 times, falls back to extra random chars
56. **Vendor SKU separation** — every product row now has `sku` (Konekt-owned, auto) + `vendor_sku` (vendor's own, optional)
57. **Wired into all product creation paths**: admin catalog import, partner catalog create, partner bulk upload (with upsert-by-vendor_sku dedupe), vendor-ops direct-create
58. **Legacy format auto-upgrade** — if stored sku_format doesn't include `{COUNTRY}`, generator forces the new pattern

### Vendor Ops Quick Wins (Apr 22, 2026)
59. **Send to Sales handoff** — `/api/vendor-ops/price-requests/{id}/handoff-to-sales` flips status to `quoted_to_customer` and notifies the originating salesperson with a deep link to the quote builder
60. **Konekt suggests vendors** — `/api/vendor-ops/price-requests/{id}/suggested-vendors` scores vendors by preferred status + past wins + responsiveness + recent declines; UI chip in Step 2 lets Ops one-click pick the top recommendations
61. **Supply Review endpoint** — `/api/admin/vendor-supply/review-dashboard` now exists (was previously a 404). Returns products with health classification (critical/warning/healthy), specific issue list per product, margin % check, pricing integrity stats
62. **Konekt-as-client scrub** on vendor orders — no more end-customer/sales PII leaked through vendor-facing APIs

## Key Backend Routes (added this batch)
- `/api/vendor/quote-requests[/stats|/{id}|/{id}/respond|/{id}/decline]` (vendor-facing)
- `/api/admin/group-deals/campaigns/{id}/vendor-payout` (payout toggle + vendor-order sync)
- `/api/admin/group-deals/campaigns/{id}/broadcast[s]` (log outbound blasts)
- Ops `/api/vendor-ops/price-requests/{id}` now returns `pricing_references[]`

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
