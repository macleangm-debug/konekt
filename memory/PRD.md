# Konekt - Promotional Materials Platform PRD

## Overview
Konekt is a B2B e-commerce platform for ordering customized promotional materials, office equipment, **Creative Design Services**, and exclusive branded clothing (KonektSeries). Based in Dar es Salaam, Tanzania.

**Vision**: The biggest B2B branding platform in East Africa — combining VistaPrint + Printful + Fiverr for corporate merchandise and design services.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Framer Motion, Shadcn UI, @dnd-kit/core
- **Backend**: FastAPI, Motor (async MongoDB)
- **Database**: MongoDB 7.0
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key (MOCKED)
- **Email**: Resend API (MOCKED - ready for integration)
- **PDF**: ReportLab for premium professional documents
- **Authentication**: JWT with role-based permissions
- **Deployment**: Docker Compose + Nginx

---

## Latest Session Updates (March 23, 2026)

### Progressive Input & Checkout-to-Quote Pack ✅ COMPLETED

**What was built:**

#### 1. Fixed "Submit Request" Button (P0 🔴)
- **File**: `/app/frontend/src/components/account/ServiceDynamicRequestForm.jsx`
- Added `onClick` handler with form validation
- Calls `POST /api/customer/in-account-service-requests`
- Shows success state with "Request Submitted!" message
- "Submit Another Request" button to reset form

#### 2. Progressive Input Checkout Page (P0 🔴)
- **File**: `/app/frontend/src/pages/account/AccountCheckoutPage.jsx`
- Multi-field delivery address form:
  - Street Address *
  - City *
  - Region * (dropdown with all Tanzania regions)
  - Postal Code
  - Contact Phone *
  - Landmark / Additional Info
  - Delivery Notes
- "Save this address for future orders" checkbox
- VAT calculation (18% configurable)
- **Delivery Disclaimer**: "This cost does not include delivery. On delivery, you will be contacted."
- Creates **Quote** (not Invoice) on submit

#### 3. Customer Checkout Quote API
- **File**: `/app/backend/customer_checkout_quote_routes.py`
- `POST /api/customer/checkout-quote` - Creates quote with:
  - Line items, subtotal, VAT %, VAT amount, total
  - Delivery address (multi-field)
  - Status: "pending"
  - Stores in `quotes_v2` collection

#### 4. Admin Catalog Setup Page (P0 🔴)
- **File**: `/app/frontend/src/pages/admin/AdminCatalogSetupPage.jsx`
- Route: `/admin/catalog-setup`
- **Services Tab**: Add/Edit/Delete services with sub-services
- **Products Tab**: Add/Edit/Delete product categories with variants
- Modal form for creating/editing items
- Single source of truth for all dropdowns

#### 5. Admin Catalog API
- **File**: `/app/backend/admin_catalog_routes.py`
- `GET/POST/PUT/DELETE /api/admin/catalog/services`
- `GET/POST/PUT/DELETE /api/admin/catalog/products`
- `GET /api/admin/catalog/tree` - Combined tree for dropdowns

#### 6. Admin Deliveries Page (P1 🟠)
- **File**: `/app/frontend/src/pages/admin/AdminDeliveriesPage.jsx`
- Route: `/admin/deliveries`
- Stats cards: Pending, Ready for Pickup, In Transit, Delivered
- Filter tabs for each status
- Delivery detail modal with status workflow:
  - pending → ready_for_pickup → in_transit → delivered
  - Can cancel at any stage

#### 7. Admin Deliveries API
- **File**: `/app/backend/admin_deliveries_routes.py`
- `GET /api/admin/deliveries` - List with status filter
- `GET /api/admin/deliveries/{id}` - Single delivery
- `PATCH /api/admin/deliveries/{id}/status` - Update status
- `POST /api/admin/deliveries` - Create manual delivery

#### 8. VAT Configuration
- Added `vat_percent: 18.0` to Admin Settings Hub
- **File**: `/app/backend/admin_settings_hub_routes.py` - `commercial.vat_percent`
- **File**: `/app/frontend/src/pages/admin/AdminSettingsHubPage.jsx` - VAT % field

---

## Admin Navigation Updates
New items added:
- **Catalog Setup** (under Settings) - `/admin/catalog-setup` - highlighted
- **Deliveries** (under Operations) - `/admin/deliveries` - highlighted

---

## Test Results (Iteration 85)
- **Backend**: 21/21 tests passed (100%)
- **Frontend**: All UI tests passed
- **Test File**: `/app/backend/tests/test_checkout_catalog_deliveries.py`

---

## Remaining Tasks

### P1 - High Priority
- [ ] Customer Help Page redesign (make it engaging with CTAs)
- [ ] Empty State designs for Quotes and Invoices pages
- [ ] Global Confirmation Modal component
- [ ] TIN Number collection during Invoice creation

### P2 - Medium Priority
- [ ] Convert Specific Services to structured backend tags
- [ ] Partner Intelligence Engine (auto-routing)
- [ ] Partner performance scoring system
- [ ] WhatsApp automation integration

### P3 - Deployment
- [ ] Connect Resend live (need `RESEND_API_KEY`)
- [ ] Connect KwikPay live (need credentials)
- [ ] SSL/DNS verification
- [ ] Monitoring setup

---

## Admin Credentials
| Account | Email | Password |
|---------|-------|----------|
| Primary Admin | admin@konekt.co.tz | KnktcKk_L-hw1wSyquvd! |
| Demo Customer | demo.customer@konekt.com | Demo123! |
| Demo Partner | demo.partner@konekt.com | Partner123! |

---

## Key Architectural Decisions

### Checkout-to-Quote Flow
1. Customer adds items to cart
2. Goes to `/account/checkout`
3. Fills multi-field delivery address
4. Sees subtotal + VAT (18%) + total
5. Clicks "Proceed to Checkout" → Creates **Quote** (not Invoice)
6. Customer reviews Quote → Clicks "Pay" → Quote converts to Invoice
7. Payment completes the order

### Catalog Single Source of Truth
- Admin manages Services + Products at `/admin/catalog-setup`
- Data stored in `catalog_services` and `catalog_products` collections
- Dropdowns in customer flows pull from `/api/admin/catalog/tree`

### Delivery Tracking
- Deliveries auto-created from quotes with delivery_address
- Courier partner uses `/admin/deliveries` to manage shipments
- Status workflow: pending → ready_for_pickup → in_transit → delivered

---

*Last updated: March 23, 2026 - Progressive Input & Checkout-to-Quote Pack Complete*
