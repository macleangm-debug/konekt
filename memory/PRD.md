# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email) | Pillow (Image Processing)

## System Status: FULL WIRING AUDIT COMPLETE — 324 ITERATIONS, 100% PASS

---

## CORE COMMERCIAL PRINCIPLES (LOCKED)

### Separation of Responsibilities
- **Sales**: Selects customer, selects items from catalog, sets quantity ONLY. Cannot edit prices.
- **Vendor Ops**: Manages vendors, enters base prices only. Pricing engine calculates sell prices.
- **Pricing Engine**: Single source of truth for all selling prices, margins, discounts.
- **Admin**: Approves discount requests, configures margins and categories.

### Commercial Flow
```
CRM Lead → Quote (items from catalog) → Vendor Ops prices unpriced items →
Quote sent → Customer accepts → Invoice + Order (pending_payment) →
Payment approved → Order confirmed → Fulfillment
```

---

## QUOTE CREATION — SIMPLIFIED (324)
- 3-step flow: Select Customer → Add Items from Catalog → Summary
- Customer: Select from existing list or "New Client" minimal form
- Items: SystemItemSelector with READ-ONLY prices (not editable by sales)
- Unpriced items: "Request Price from Vendor Ops" button → POST /api/vendor-ops/price-requests
- Quote saves as `waiting_for_pricing` until all items priced
- Discount requests: "Request Discount" → approval workflow via /api/staff/discount-requests
- Quote cannot be sent until all items have prices from system

## SYSTEM ITEM SELECTOR (324)
- Prices displayed as read-only text (div, not input)
- Sales can ONLY change quantity
- "Needs Pricing" badge for items without sell price
- "Request Price from Vendor Ops" sends pricing request
- "Sent to Vendor Ops" badge after request submitted

## VENDOR OPS (323)
- 4 tabs: Pricing Requests, Orders/Fulfillment, Vendors, Products
- Pricing Requests: see pending price requests, enter base prices
- Orders: see all vendor-related orders with fulfillment status
- Simple and operational — no complex forms

## CATEGORY CONFIG (320)
- Admin → Catalog Workspace → Expandable config cards
- display_mode, commercial_mode, sourcing_mode per category
- 5 advanced toggles per category

## COMMERCIAL FLOW (319)
- Quote → Approved → Invoice + Order (pending_payment)
- Payment → confirmed + fulfillment unlocked
- Marketplace checkout → same flow

## AFFILIATE SYSTEM (323)
- Admin form aligned with public application (all fields)
- 3 tabs: Affiliates, Performance, Withdrawals
- Withdrawal flow: requested → approved → paid

## GROUP DEALS (323)
- 5-step wizard: Product → Pricing → Target → Promotion → Review

## BULK IMPORT (323)
- CSV upload for catalog items with validation

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!`
- Vendor Ops: `vops.test@konekt.co.tz` / `VendorOps123!`

## Remaining / Next
- (P0) First real product listing end-to-end
- (P0) First live Group Deal execution
- (P0) Activate internal sales + external affiliates
- (P2) Light micro-interactions
- (Phase 2) Vendor Ops SLA automation, split orders
