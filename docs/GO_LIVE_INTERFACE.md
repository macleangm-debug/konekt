# Konekt Go-Live Interface

This codebase keeps all existing route packs, but introduces one **single go-live facade** for the critical commercial path:

`product/service -> invoice -> payment proof -> finance approval -> order`

## Why this was added

The repository has many route packs and experimental flows. Instead of deleting anything, the go-live layer gives the frontend and operations team a smaller, safer surface area for launch.

## New backend facade

Base path:

- `/api/live-commerce`

Core endpoints:

- `POST /api/live-commerce/product-checkout`
  - Creates checkout record + invoice
- `POST /api/live-commerce/quotes/{quote_id}/accept`
  - Converts accepted quote into invoice
- `POST /api/live-commerce/invoices/{invoice_id}/payment-intent`
  - Opens a payment intent for an invoice
- `POST /api/live-commerce/payments/{payment_id}/proof`
  - Submits uploaded bank transfer proof and marks invoice/payment as under review
- `GET /api/live-commerce/finance/queue`
  - Simplified finance queue with proof, customer, invoice, and amount data
- `POST /api/live-commerce/finance/proofs/{payment_proof_id}/approve`
  - Approves payment and creates order only when fully paid
- `POST /api/live-commerce/finance/proofs/{payment_proof_id}/reject`
  - Rejects proof and returns invoice to pending payment
- `GET /api/live-commerce/customers/{customer_id}/workspace`
  - Returns invoices, payments, and orders together

## New backend files

- `backend/core/live_commerce_service.py`
- `backend/live_commerce_routes.py`

## Frontend integration for go-live

New client wrapper:

- `frontend/src/lib/liveCommerceApi.js`

Updated pages:

- `frontend/src/pages/CheckoutPage.jsx`
- `frontend/src/pages/checkout/CheckoutPageV2.jsx`
- `frontend/src/pages/PaymentSelectionPage.jsx`
- `frontend/src/pages/BankTransferPage.jsx`
- `frontend/src/lib/uploadApi.js`

## Launch-safe rules enforced

- No order is created during checkout
- Payment proof is mandatory for bank transfer flow
- Submitted payment stays **Under Review**
- Only finance/admin approval can create the order
- Existing modules remain untouched for fallback or future expansion

## Recommended usage now

Use the new facade for launch-critical UX and leave older packs in place until after launch stabilization.
