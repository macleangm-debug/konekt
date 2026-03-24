# Customer UX Acceptance Checklist

## Payment Proof
- [ ] Payer name is displayed above proof upload
- [ ] Helper text explains why payer name matters
- [ ] Submit is disabled until payer name and proof are provided
- [ ] Inline validation appears if payer name is missing
- [ ] Inline validation appears if proof is missing
- [ ] Invalid submit scrolls to the missing payer-name field

## Quotes
- [ ] Desktop default is table view
- [ ] Quote table shows type, amount, valid until, quote status, payment status
- [ ] Action labels are explicit, not icon-only
- [ ] Converted quotes no longer appear like pending approvals
- [ ] Expired quotes are visible in history, not deleted
- [ ] Expired quotes cannot be accepted

## Invoices
- [ ] Invoice page is primary payment-tracking area
- [ ] Rejection reason is visible when payment is rejected
- [ ] Resubmit proof action exists after rejection
- [ ] Under-review state is visible after proof submission
- [ ] Paid state is visible after approval

## Orders
- [ ] Approved invoice creates order automatically
- [ ] Customer can see created order
- [ ] Orders page works clearly on mobile
- [ ] Desktop uses list + detail drawer pattern
- [ ] Mobile uses detail screen or bottom sheet pattern

## Service Requests
- [ ] Customer details are prefetched from account
- [ ] Existing details are shown read-only by default
- [ ] Change button allows editing when needed
- [ ] Missing details are requested once and saved for reuse

## Business Logic
- [ ] Product checkout goes directly to invoice stage for customer-facing flow
- [ ] Approved service/promo quotes move to invoice stage
- [ ] Quotes older than 30 days become expired, not deleted
