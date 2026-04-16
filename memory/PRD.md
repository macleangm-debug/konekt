# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: 330 ITERATIONS, 100% PASS RATE

---

## LATEST CHANGES (330)

### Vendor Ops → Operations (renamed everywhere)
- Sidebar: "Operations" (not "Vendor Ops")
- VendorOpsPage title: "Operations"
- SystemItemSelector: "Request Price from Operations"
- All user-facing text uses "Operations" — vendor details hidden from sales

### Create Invoice CTA Removed
- Invoices page: no "Create Invoice" button
- Subtitle: "auto-generated from accepted quotes and marketplace checkout"
- Invoices are ONLY created from: accepted quotes OR marketplace checkout

### Document Numbering with Country Code
- Format: {PREFIX}-{COUNTRY}-{SEQUENCE} (e.g., QT-TZ-000001, IN-TZ-000001)
- Configurable in Settings Hub → Document Numbering
- use_shared_sequence: quote and invoice share same sequence number
- Backend service: /app/backend/services/document_numbering.py

### Product Add — Subcategory from Source of Truth
- Subcategory is dropdown from Settings Hub categories (not free text)
- "Request new subcategory" option → admin approval queue
- POST /api/admin/catalog/subcategory-requests

### Commission Engine — Tier Distribution Wired
- Reads Pricing Tier distribution_split: affiliate_pct, sales_pct, referral_pct, reserve_pct
- reserve_pct = promotion budget (year-round promotions)
- tier_applied: true in all commission calculations

### Bug Fix: Quote Status Update
- Fixed UUID vs ObjectId mismatch in admin_routes.py
- Now handles both ObjectId and string IDs across quotes/quotes_v2 collections

## ROLE SEPARATION (LOCKED)
- **Sales**: Select customer + items + qty. Request discount. Request status from Operations. CRM task updates only.
- **Operations**: Enter base prices, vendor follow-up, order status updates, fulfillment tracking.
- **Admin**: Approve discounts, configure settings, approve categories.
- **Finance**: Payment verification, commission payouts.

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`

## Remaining
- Service site visit flow (location-dependent pricing)
- Statement of Accounts document
- Further Operations page UI simplification
- Sales role restriction enforcement (no status updates)
