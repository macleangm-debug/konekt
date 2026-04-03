# Konekt API Wiring Pack

This bundle wires the P0 frontend pages to real components and backend APIs.

## Included
- Checkout page wired to checkout points validation and payment settings
- Invoice payment page wired to invoice detail + payment proof submit
- Sales queue page wired to sales opportunities API
- Lead-aware service detail page wired to guest lead capture and account-mode submission
- API route helpers
- App route snippets

## Assumptions
- `api` helper exists at `frontend/src/lib/api`
- Tailwind-based UI components exist where referenced (`PageHeader`, `SurfaceCard`)
- Backend routes already exist or are aligned to:
  - `/api/checkout-points/validate`
  - `/api/admin/payment-settings`
  - `/api/invoices/:invoiceId`
  - `/api/payment-proofs`
  - `/api/sales-opportunities/my-queue`
  - `/api/public-services/types`
  - `/api/public-services/types/:serviceKey`
  - `/api/guest-leads`
  - `/api/customer/service-requests`
  - `/api/customer/business-pricing-requests`

## Main integration notes
- Bank transfer is the only active payment option.
- Other payment methods are visible but disabled with “Not available”.
- Invoice payment is invoice-driven; no manual invoice ID field.
- Service detail uses soft lead capture for guests and account-mode submission for logged-in users.
