# Customer UX Go-Live Fix Pack

This pack captures the agreed customer-side UX and state-flow decisions for Konekt so the frontend pass can be implemented without ambiguity.

## Locked Product Decisions

- Quotes page = commercial proposal stage
- Invoices page = payment and finance stage
- Orders page = fulfillment stage

## Customer Information Architecture

Use a unified customer transactions area with these sections:
- Quotes
- Invoices
- Orders

### Quotes
Purpose:
- review and respond to quotations

Default view:
- table on desktop
- cards optional, not default

Columns:
- Quote No
- Date
- Valid Until
- Type
- Amount
- Status
- Payment Status
- Actions

Actions:
- View
- Accept
- Reject
- Open Invoice / Pay Invoice

Statuses:
- Awaiting Approval
- Accepted
- Converted to Invoice
- Payment Under Review
- Rejected
- Expired

Rules:
- Product marketplace transactions should not remain as active items in Quotes after invoice creation
- Service and promo quotes should leave active Quotes once customer approves and invoice is generated
- Do not delete expired quotes after 30 days
- Mark them as Expired and keep them in history
- Acceptance must be disabled once expired
- Optional follow-up actions: Request Renewal, Contact Sales

### Invoices
Purpose:
- payment tracking and finance feedback

Columns:
- Invoice No
- Source Quote/Request
- Type
- Amount
- Payment Status
- Rejection Reason
- Last Updated
- Actions

Actions:
- View
- Submit Proof
- Resubmit Proof if rejected

Rules:
- This is the main customer workspace for payment tracking
- If finance rejects a payment, the rejection reason must be visible in detail view or drawer
- Customer must be able to resubmit proof after rejection
- Once payment proof is submitted, status must move to Under Review
- Once approved, invoice status becomes Paid

### Orders
Purpose:
- fulfillment tracking after approval

List fields:
- Order No
- Source Type
- Payment State
- Fulfillment State
- Vendor Release State
- Date
- Actions

Actions:
- View

Rules:
- Once payment is approved, order is created automatically
- Vendor order is created/released
- Sales assignment becomes active
- Customer sees order in Orders
- Vendor sees released order
- Sales sees assigned order for follow-up

## Flow Rules

### Product Marketplace
- If user checks out a fixed-price product, quote may be created internally for record purposes
- That quote is automatically considered approved by the customer
- Invoice is created immediately
- Customer primarily interacts with the invoice/payment stage
- After payment approval, order is created automatically

### Service Request
- Sales sends quote
- Customer approves quote
- Invoice is generated
- Quote leaves active Quotes and becomes an invoice/payment item
- After payment approval, order is created automatically

### Promo / Custom Request
- Same behavior as service flow
- Quote first
- Approval converts to invoice
- Payment approval creates order

## Payment Proof Page Fixes

### UX Changes
- Move payer name above proof upload
- Use strong label: Name on Bank Transfer
- Add placeholder: e.g. John M. Kassim / ABC Ltd
- Show helper text: Enter the name used when making the transfer so Finance can verify your payment.
- Add inline error state
- Highlight border red when invalid
- Auto-scroll to field on invalid submit
- Disable submit until:
  - payer name is filled
  - proof file is attached

### Acceptance Criteria
- User cannot submit without payer name
- User cannot submit without proof file
- Error is visible without needing toast-only feedback
- Field hierarchy makes payer name visually more important than before

## Quotes Page Redesign

### Default Behavior
- Table view is default on desktop
- Cards view remains optional

### Required Data
Every row should show:
- quote number
- date
- valid until
- type: Product / Service / Promo
- amount
- quote status
- payment status
- linked invoice status where relevant

### Action Labels
Do not use eye icon only.
Use explicit labels:
- View
- Accept
- Reject
- Pay Invoice / Open Invoice

### Acceptance Criteria
- A customer can understand what stage the quote is in without opening it
- Converted quotes no longer look like pending customer actions
- Payment-under-review state is clearly visible

## Invoices Page Enhancements

### Required Data
- invoice number
- linked quote/request
- amount
- payment status
- proof uploaded indicator
- rejection reason if any
- actions

### Required Behaviors
- Payment rejection reason visible in detail view
- Resubmit proof available after rejection
- Approved invoice becomes a paid record
- If approval creates an order, customer can navigate from invoice to order history

## Orders Page UX Pattern

### Replace Hard Split View
Use:
- desktop: list/table + right-side details drawer
- mobile: list + full-screen detail view or bottom sheet
- clear back navigation on mobile

### Order Details Should Show
- item summary
- timeline/status block
- payment state
- fulfillment state
- vendor/release state
- sales follow-up context where useful

### Acceptance Criteria
- Mobile users can understand the flow without cramped split layout
- Desktop users can scan orders quickly and inspect details without page confusion

## Service Request Customer Details

### Data Source
Pull from customer account/profile:
- full name / company name
- phone
- email
- saved address
- business/personal details

### UX Rules
- Show details as read-only summary by default
- Include Change button
- If details are missing, require completion once
- Once saved, reuse automatically in future service/promo requests

### Acceptance Criteria
- Returning customers are not forced to re-enter details
- Missing data is completed once and persisted
- Default view is display-first, not free-form editing

## Expired Quotes Policy

Do not delete expired quotes.

After 30 days:
- mark as Expired
- keep in quote history
- disable accept action
- optionally allow Request Renewal / Contact Sales

Reason:
- preserves commercial history
- avoids audit loss
- reduces confusion for returning customers

## Implementation Priority

### Pass 1
- Payment proof validation and visibility
- stronger field hierarchy
- disable submit until complete

### Pass 2
- Quotes page redesign to table-first
- add payment status and explicit actions
- show rejection reason in view
- clean quote to invoice transition states

### Pass 3
- Orders page redesign from hard split view to responsive list + drawer/detail screen

### Pass 4
- Service request account autofill + change button logic

## Dev Notes

Suggested implementation targets:
- frontend pages for checkout/payment proof
- customer quotes page
- customer invoices page
- customer orders page
- service request entry forms
- shared customer profile summary component

Recommended new shared UI components:
- CustomerProfileSummaryCard
- QuoteStatusBadge
- PaymentStatusBadge
- InvoiceDetailDrawer
- OrderDetailDrawer
- MobileOrderDetailSheet

## Final Goal

The customer should clearly understand three stages:
1. Quote = commercial decision
2. Invoice = payment/finance tracking
3. Order = fulfillment tracking

The UI should make these stages obvious without relying on hidden details or icons alone.
