# Launch Verification Checklist

## WhatsApp Integration
- [ ] Twilio environment variables set (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)
- [ ] GET /api/whatsapp/status returns configuration status
- [ ] POST /api/whatsapp/send-live endpoint tested
- [ ] POST /api/whatsapp/event/payment-approved-live trigger tested
- [ ] POST /api/whatsapp/event/quote-ready-live trigger tested
- [ ] POST /api/whatsapp/event/order-shipped-live trigger tested
- [ ] GET /api/whatsapp/logs returns message history

## Onboarding
- [ ] First login shows OnboardingWizard via OnboardingGate
- [ ] Zero-order user shows wizard
- [ ] Returning user with orders can continue normally
- [ ] Wizard dismissal persists in localStorage

## Order Detail Timeline
- [ ] Product order shows product steps (Received → Payment → In Progress → Shipped → Delivered)
- [ ] Service order shows service steps (Received → Payment → In Progress → Quality Review → Completed)
- [ ] Timeline progress bar shows correct percentage
- [ ] Customer-safe status labels only (no internal jargon)

## Cart + Sales Assist
- [ ] Cart drawer opens when items added
- [ ] Cart shows items with prices and totals
- [ ] Remove item from cart works
- [ ] Checkout button navigates to checkout
- [ ] Sales assist button opens SalesAssistModalV2
- [ ] Sales assist modal shows cart context
- [ ] Sales assist modal submits request to /api/sales/assist-requests

## Marketplace Filters
- [ ] Search by product name works
- [ ] Filter by product group works
- [ ] Filter by subgroup works
- [ ] Subgroup dropdown updates based on group selection
- [ ] Clear filters button resets all filters
- [ ] Admin products respect taxonomy
- [ ] Vendor products respect taxonomy

## Quotes / Invoices
- [ ] Table view is default
- [ ] Card toggle switches to card view
- [ ] Quote PDF download button works (hook)
- [ ] Invoice opens inside account shell at /dashboard/invoices/:id
- [ ] Invoice detail shows items, total, status, download button

## Explore Page
- [ ] Marketplace tab shows products with filters
- [ ] Service Request tab shows guided form
- [ ] Tab switching preserves state
- [ ] Add to cart from marketplace opens cart drawer

## Routes Verified
- [ ] /dashboard/explore - Explore page
- [ ] /dashboard/orders/:orderId - Order detail
- [ ] /dashboard/invoices/:invoiceId - Invoice detail
- [ ] /account/explore - Account shell explore
- [ ] /admin/product-subgroups - Admin subgroups manager
- [ ] /partner/vendor-products - Vendor products manager
