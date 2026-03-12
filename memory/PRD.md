# Konekt - Promotional Materials Platform PRD

## Overview
Konekt is a B2B e-commerce platform for ordering customized promotional materials, office equipment, **Creative Design Services**, and exclusive branded clothing (KonektSeries). Based in Dar es Salaam, Tanzania.

**Vision**: The biggest B2B branding platform in East Africa — combining VistaPrint + Printful + Fiverr for corporate merchandise and design services.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Framer Motion, Shadcn UI, @dnd-kit/core
- **Backend**: FastAPI, Motor (async MongoDB)
- **Database**: MongoDB 7.0
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Email**: Resend API (MOCKED - ready for integration)
- **PDF**: ReportLab for premium professional documents
- **Authentication**: JWT with role-based permissions
- **Deployment**: Docker Compose + Nginx

---

## What's Been Implemented ✅

### March 11, 2026 - Phase 9: Per-Client Payment Terms (TESTED ✅)

#### New Backend Files
- [x] `customer_models.py` - CustomerCreate/CustomerUpdate with payment term fields
- [x] `payment_terms_utils.py` - resolve_payment_terms(), calculate_due_date()
- [x] `customer_admin_routes.py` - Full CRUD for B2B customers with payment terms

#### Payment Term Types Supported
- Due on Receipt
- Net 7, Net 14, Net 30
- 50% Upfront / 50% on Delivery
- Advance Payment Required
- Credit Account
- Custom Terms (configurable days)

#### Payment Terms Flow
- **Customer Profile**: Stores payment_term_type, payment_term_days, payment_term_label, payment_term_notes, credit_limit
- **Quote Creation**: Auto-applies customer's payment terms when email matches
- **Invoice Creation**: Auto-calculates due date based on payment terms
- **PDF Documents**: Displays payment terms in info card (Issue Date, Due Date, Payment Terms)

#### Test Results (iteration_10.json)
- Backend: 100% (18/18 tests passed)
- Frontend: 100% verified

---

### March 12, 2026 - Phase 10: Polished Quote & Invoice UI (TESTED ✅)

#### New Shared Components
- [x] `frontend/src/components/admin/CustomerSummaryCard.jsx` - Company, contact, email, TIN, BRN display
- [x] `frontend/src/components/admin/PaymentTermsCard.jsx` - Payment terms, notes, credit limit
- [x] `frontend/src/components/admin/TaxSummaryCard.jsx` - Subtotal, VAT, discount, total
- [x] `frontend/src/components/admin/LineItemsEditor.jsx` - SKU lookup, qty, price, total

#### New Frontend Utilities
- [x] `frontend/src/utils/finance.js` - formatMoney(), calculateTotals()

#### Polished Pages
- [x] `QuotesPage.jsx` - Customer dropdown, auto-fill, payment terms preview, SKU pricing lookup
- [x] `InvoicesPage.jsx` - Due date auto-calculation, Convert Order form, status management

#### Key Features
- Customer selection dropdown with auto-fill of all fields (name, email, company, phone, address, TIN, BRN)
- CustomerSummaryCard and PaymentTermsCard appear when customer selected
- LineItemsEditor with SKU-based pricing lookup from inventory
- TaxSummaryCard with real-time calculation
- Quote actions: PDF export, Send email, Convert to Order
- Invoice actions: PDF export, Send email, Status dropdown (draft/sent/paid/overdue/cancelled)
- Convert Order to Invoice form with automatic payment terms

#### API Endpoints Added
- `GET /api/admin/inventory/items/by-sku/{sku}` - SKU pricing lookup

#### Test Results (iteration_11.json)
- Backend: 94% (15/16 tests passed)
- Frontend: 100% verified

---

### March 12, 2026 - Phase 13: Referral Settings, Points Wallet & Affiliate System (TESTED ✅)

#### New Backend Files
- [x] `referral_models.py` - ReferralSettings Pydantic model
- [x] `referral_settings_routes.py` - Admin referral settings CRUD
- [x] `points_service.py` - Points wallet helpers (add_points, redeem_points)
- [x] `referral_reward_service.py` - Points calculation from purchase amounts
- [x] `customer_points_routes.py` - Customer points wallet API
- [x] `admin_points_routes.py` - Admin points wallets/transactions
- [x] `referral_hooks.py` - Auto-reward referrers on paid orders
- [x] `affiliate_models.py` - Affiliate Pydantic model
- [x] `affiliate_commission_models.py` - Commission/Payout models
- [x] `affiliate_service.py` - Commission calculation helper
- [x] `affiliate_public_routes.py` - Public affiliate code lookup
- [x] `affiliate_admin_routes.py` - Affiliate CRUD
- [x] `affiliate_commission_routes.py` - Commission approve/pay workflow
- [x] `affiliate_payout_routes.py` - Payout request workflow
- [x] `affiliate_hooks.py` - Auto-create commission on paid orders

#### New Frontend Files
- [x] `lib/customerRewardsApi.js` - Customer rewards API helper
- [x] `lib/affiliateApi.js` - Affiliate admin API helper
- [x] `pages/admin/ReferralSettingsPage.jsx` - Admin referral config
- [x] `pages/admin/AffiliatesPage.jsx` - Affiliate partner management
- [x] `pages/admin/AffiliateCommissionsPage.jsx` - Commission tracking
- [x] `pages/admin/AffiliatePayoutsPage.jsx` - Payout management
- [x] `pages/MyPointsPage.jsx` - Customer points dashboard
- [x] `pages/AffiliateLandingPage.jsx` - Public /a/{code} landing

#### Key Features
**Referral System (Points-based, for customers):**
- Admin-controlled settings: points per amount, trigger events, caps
- Points wallet per user with transaction history
- Auto-reward referrers when referred users make purchases
- Configurable share messages for WhatsApp/social
- Points redemption at checkout (planned for checkout integration)

**Affiliate System (Commission-based, for partners):**
- Affiliate partners with promo codes and tracking links
- Configurable commission (percentage or fixed)
- Attribution tracking for orders using affiliate codes
- Commission ledger with approve → pay workflow
- Payout request system for settlement
- Public landing pages at /a/{code}

#### API Endpoints Added
- `GET/PUT /api/admin/referral-settings` - Referral program config
- `GET /api/customer/points/me` - User's wallet and transactions
- `GET /api/customer/points/balance` - Quick balance check
- `GET /api/admin/points/wallets` - All user wallets
- `GET /api/admin/points/transactions` - All transactions
- `GET /api/admin/affiliates` - List affiliates
- `POST /api/admin/affiliates` - Create affiliate
- `PATCH /api/admin/affiliates/{id}` - Update affiliate
- `DELETE /api/admin/affiliates/{id}` - Delete affiliate
- `GET /api/affiliates/code/{code}` - Public affiliate lookup
- `GET /api/admin/affiliate-commissions` - List commissions
- `POST /api/admin/affiliate-commissions/{id}/approve` - Approve
- `POST /api/admin/affiliate-commissions/{id}/mark-paid` - Mark paid
- `GET /api/affiliate-payouts/admin` - List payouts
- `POST /api/affiliate-payouts/admin` - Create payout request
- `POST /api/affiliate-payouts/admin/{id}/approve` - Approve
- `POST /api/affiliate-payouts/admin/{id}/mark-paid` - Mark paid

#### Test Results (iteration_14.json)
- Backend: 100% (22/22 tests passed)
- Frontend: 100% verified
- Test affiliate created: Partner Marketing Agency (PARTNER10, 10%)

---

### March 12, 2026 - Phase 12: Rotating Hero Banner & Strengthened Referral Program (TESTED ✅)

#### New Backend Files
- [x] `hero_banner_models.py` - HeroBannerCreate, HeroBannerUpdate, HeroBannerOut models
- [x] `hero_banner_routes.py` - Full CRUD endpoints for hero banner management
- [x] `referral_public_routes.py` - Public referral code lookup and settings
- [x] `customer_referral_routes.py` - Customer referral stats and transactions

#### New Frontend Files
- [x] `components/HeroCarousel.jsx` - Rotating hero carousel with auto-play, navigation, and dots
- [x] `lib/heroBannerApi.js` - Hero banner API helper
- [x] `lib/referralApi.js` - Referral API helper
- [x] `pages/admin/HeroBannersPage.jsx` - Admin UI for CRUD hero banners
- [x] `pages/ReferralLandingPage.jsx` - Public /r/{code} referral landing page
- [x] `pages/MyReferralsPage.jsx` - Customer referral dashboard with social sharing

#### Updated Files
- [x] `LandingNew.js` - Integrated HeroCarousel component
- [x] `AdminLayout.js` - Added Hero Banners nav link
- [x] `CustomerDashboard.jsx` - Added My Referrals card
- [x] `App.js` - Added new routes for hero banners and referrals
- [x] `server.py` - Registered new routers

#### Hero Banner Features
- Admin can create/edit/delete hero banners with title, subtitle, description
- Desktop and mobile image URLs
- Primary and secondary CTA buttons
- Badge text (e.g., "Limited Time", "New")
- Theme selection (dark/light)
- Position ordering
- Active/inactive toggle
- Date-based scheduling (starts_at, ends_at)
- Auto-rotation every 5 seconds on landing page
- Navigation arrows and dot indicators

#### Referral Program Features
- Public referral landing page at /r/{code}
- Shows referrer name and discount percentage
- "Create Account" CTA with pre-filled referral code
- My Referrals dashboard in customer portal
- Stats: Total Referrals, Successful, Total Earned
- Copy referral link and code buttons
- Social sharing: WhatsApp, Facebook, X (Twitter), Email
- Configurable share messages from admin

#### API Endpoints
- `GET /api/hero-banners/active` - Public, returns active banners sorted by position
- `GET /api/hero-banners/admin` - Admin, returns all banners
- `POST /api/hero-banners/admin` - Admin, create banner
- `PATCH /api/hero-banners/admin/{id}` - Admin, update banner
- `DELETE /api/hero-banners/admin/{id}` - Admin, delete banner
- `GET /api/referrals/code/{code}` - Public, get referrer info
- `GET /api/referrals/settings/public` - Public, get referral program settings
- `GET /api/customer/referrals/me` - Authenticated, get user's referral data
- `GET /api/customer/referrals/stats` - Authenticated, get referral stats

#### Test Results (iteration_13.json)
- Backend: 100% (14/14 tests passed)
- Frontend: 100% verified
- Seeded 3 hero banners for testing: New Year Sale, Creative Services, KonektSeries Collection
- Fixed token key mismatch in referralApi.js and heroBannerApi.js

---

### March 12, 2026 - Phase 11: Bank Transfer Proof Upload & Payment Visibility (TESTED ✅)

#### New Backend Files
- [x] `upload_config.py` - Upload directories and public URL helpers
- [x] `upload_utils.py` - File validation, save, and storage utilities
- [x] `payment_upload_routes.py` - POST /api/uploads/payment-proof

#### Updated Backend
- [x] `bank_transfer_routes.py` - Added proof_filename to BankTransferMarkSubmitted
- [x] `customer_order_routes.py` - Added payment_status field to orders
- [x] `server.py` - Static files mounted at /static for file serving

#### New Frontend Components
- [x] `components/PaymentStatusBadge.jsx` - Styled status badges (unpaid, pending, paid, etc.)
- [x] `lib/uploadApi.js` - uploadPaymentProof() helper

#### Updated Frontend Pages
- [x] `BankTransferPage.jsx` - Full proof upload with drag-drop, preview, upload button
- [x] `CustomerDashboard.jsx` - Payment status badge on orders
- [x] `OrderTrackingPage.jsx` - Payment status badge in header
- [x] `pages/admin/PaymentsPage.jsx` - Admin payment review with Verify/Reject actions

#### Key Features
- File upload with validation (images, PDFs, max 10MB)
- Drag-and-drop interface for proof upload
- Copy-to-clipboard for bank details and payment reference
- Admin can view proof files, verify or reject payments
- Payment status badges flow through: Dashboard → Order Tracking → Admin

#### API Endpoints
- `POST /api/uploads/payment-proof` - Upload payment proof file
- Files stored at `/app/static/uploads/payment_proofs/{date}/`

#### Test Results (iteration_12.json)
- Backend: 88% (14/16 tests passed)
- Frontend: 100% verified
- Features verified: proof upload, bank transfer submission, admin verify/reject, status badges

---

### March 11, 2026 - Phase 8: World-Class Platform Upgrades (TESTED ✅)

#### PDF Design Upgrade
- [x] `pdf_service.py` - Complete rewrite with premium Zoho/Stripe-style design
  - Navy branded header bar with logo
  - Two-column company/bill-to layout
  - Striped table rows with clear hierarchy
  - Gold accent dividers
  - Premium totals card with visual emphasis
  - Professional footer with notes, terms, payment instructions

#### New Customer-Facing Features
- [x] `CheckoutPage.jsx` - Guest checkout with customer details, delivery, order summary
- [x] `CustomerDashboard.jsx` - Dashboard with 4 quick access cards, recent orders, open quotes
- [x] `OrderTrackingPage.jsx` - Order tracking with visual timeline
- [x] `OrderConfirmationPage.jsx` - Success page with next steps
- [x] `OrderTimeline.jsx` - 9-step visual timeline component

#### New Backend Routes
- [x] `customer_order_routes.py` - Guest order creation and tracking
  - `POST /api/guest/orders` - Create order without authentication
  - `GET /api/guest/orders/{id}` - Get guest order details
  - `GET /api/orders/track/{id}` - Public order tracking

#### Customer Flow Improvements
- Guest checkout (no login required to place order)
- Order confirmation with clear next steps
- Visual order tracking with 9 status stages
- Customer dashboard for repeat business

#### Test Results (iteration_8.json)
- Backend: 100% (17/17 tests passed)
- Frontend: 100% verified
- Features tested: Guest orders, PDF export, order tracking, customer dashboard, timeline

---

### March 11, 2026 - Phase 7: Quote Kanban Board (TESTED ✅)

#### New Backend Files
- [x] `quote_pipeline_routes.py` - Pipeline API for Kanban board at `/api/admin/quotes/pipeline`

#### New Frontend Pages
- [x] `QuoteKanbanPage.jsx` - Visual sales pipeline with drag-and-drop

#### Quote Kanban Features
- 4-column Kanban board: Draft → Sent → Approved → Converted
- Drag-and-drop quote cards between columns (using @dnd-kit/core)
- Quote details drawer with customer info, line items, totals
- Actions: Change status, Convert to Order, Export PDF, Send Quote
- Search functionality to filter quotes by number, customer, or company
- Summary stats: All Quotes count, Draft count, Approved count, Total Value
- "Other" section for rejected/expired quotes

#### API Endpoints
- `GET /api/admin/quotes/pipeline` - Returns quotes grouped by status
- `PATCH /api/admin/quotes/{id}/move?status={status}` - Move quote to new stage
- `GET /api/admin/quotes/pipeline/stats` - Pipeline statistics

#### Test Results (iteration_7.json)
- Backend: 100% (11/11 tests passed)
- Frontend: 100% verified
- Features tested: Pipeline API, move operations, Kanban UI, drawer, status changes

---

### March 11, 2026 - Phase 6: Order Operations & Production Queue (TESTED ✅)

#### New Backend Files
- [x] `order_ops_models.py` - Models for orders, inventory reservation, production queue
- [x] `order_ops_routes.py` - Order operations at `/api/admin/orders-ops`
- [x] `production_routes.py` - Production queue at `/api/admin/production`
- [x] `document_send_routes.py` - Email send stubs (ready for Resend integration)

#### New Frontend Pages
- [x] `OrdersPageOps.jsx` - Order management with reserve inventory, assign tasks, send to production
- [x] `ProductionQueuePage.jsx` - Kanban board for production tracking with status sync to orders

#### Order Operations Features
- List/filter orders by status
- Update order status with history tracking
- Reserve inventory for orders (prevents over-reservation)
- Assign tasks directly from orders (links to admin tasks)
- Send orders to production queue
- Convert orders to invoices

#### Production Queue Features
- Kanban board view (7 columns: queued → completed)
- Status updates sync back to linked order
- Priority badges (low/medium/high/urgent)
- Stats dashboard (total, queued, in_progress, completed, blocked)
- Full history tracking

#### Test Results (iteration_6.json)
- Backend: 100% (23/23 tests passed)
- Frontend: 100% verified
- Features tested: Order ops, inventory reservation, task assignment, production queue, status sync

---

### March 11, 2026 - Phase 5: Quote → Order → Invoice → PDF Workflow (TESTED ✅)

#### New Backend Files
- [x] `quote_models.py` - Pydantic models for quotes, invoices, company settings
- [x] `settings_routes.py` - Company branding API at `/api/admin/settings/company`
- [x] `quote_routes.py` - Quotes v2 API at `/api/admin/quotes-v2`
- [x] `invoice_routes.py` - Invoices v2 API at `/api/admin/invoices-v2`
- [x] `pdf_service.py` - Zoho-style PDF generator with ReportLab
- [x] `pdf_routes.py` - PDF export at `/api/admin/pdf/quote/{id}` and `/api/admin/pdf/invoice/{id}`

#### New Frontend Pages
- [x] `QuotesPageNew.jsx` - Create quotes with line items, PDF export, convert to order/invoice
- [x] `InvoicesPage.js` - Updated with PDF export, convert from order, payment tracking
- [x] `CompanySettingsPage.jsx` - Company branding for PDFs (logo, address, banking, terms)

#### Complete Workflow
```
Lead → Quote (draft) → Quote (sent) → Quote (approved) → Order → Invoice → Payment → PAID
                    ↓                      ↓
              PDF Export              PDF Export
```

#### PDF Features (Zoho-style)
- Company logo and branding
- Professional header with document number and status badge
- Customer billing details
- Line items table with quantities and totals
- Subtotal, tax, discount, total breakdown
- Payment instructions and terms
- Footer with timestamp

#### Test Results (iteration_5.json)
- Backend: 100% (21/21 tests passed)
- Frontend: 100% verified
- Features tested: Company Settings, Quotes v2, Invoices v2, PDF Export, Full E2E Workflow

---

### March 11, 2026 - Phase 4: Admin Business Operating System (TESTED ✅)

#### Admin Business OS Pages
- [x] `CRMPage.js` - CRM pipeline with lead management, status updates, filtering
- [x] `TasksPage.js` - Task management with Kanban board view, priorities
- [x] `InventoryPage.js` - Inventory tracking with stock movements (in/out/adjustment)
- [x] `InvoicesPage.js` - Invoice management with line items, payments, status tracking
- [x] `AdminQuotes.js` - Quote management with convert to order/invoice

#### Admin Business OS API Routes (`admin_routes.py`)
- [x] `GET /api/admin/dashboard/summary` - Dashboard metrics
- [x] CRM CRUD: `/api/admin/crm/leads` (POST, GET, PATCH, DELETE)
- [x] Tasks CRUD: `/api/admin/tasks` (POST, GET, PATCH, DELETE)  
- [x] Inventory: `/api/admin/inventory/items`, `/api/admin/inventory/movements`
- [x] Invoices: `/api/admin/invoices` (POST, GET, PATCH), `/payments` (POST)
- [x] Quotes: `/api/admin/quotes` (POST, GET, PATCH), convert-to-order, convert-to-invoice
- [x] Customers: `/api/admin/customers` (GET)

#### Test Results (iteration_4.json)
- Backend: 100% (35/35 tests passed)
- Frontend: 100% verified
- Features tested: CRM, Tasks, Inventory, Invoices, Quotes, Service Orders, Creative Services

---

### March 11, 2026 - Phase 3: Full Creative Services Flow

#### New Frontend Pages
- [x] `CreativeServicesPage.js` - Service listing with category filters
- [x] `ServiceDetail.js` - Service detail with package selection
- [x] `DesignBriefForm.js` - Complete design brief submission form with AI assistance
- [x] `LandingNew.js` - World-class homepage

#### New Backend Routes
- [x] `POST /api/service-orders` - Create service order
- [x] `GET /api/service-orders` - List all service orders
- [x] `GET /api/service-orders/{id}` - Get specific order
- [x] `PATCH /api/service-orders/{id}/status` - Update order status
- [x] `POST /api/service-orders/{id}/notes` - Add designer notes
- [x] `GET /api/admin/service-orders/stats` - Dashboard stats

#### Service Order Flow
```
Customer selects service → Chooses package → Fills brief → AI assists → Submits order
     ↓
Admin receives order → Reviews brief → Assigns designer → Creates draft → Sends for review
     ↓
Customer reviews → Requests revisions → Approves final → Receives files
```

#### Service Statuses
```
pending → brief_review → in_design → draft_sent → revision_requested → approved → final_delivery → completed
```

---

## Product Catalog

| Branch | Products | Type |
|--------|----------|------|
| Promotional Materials | 13 | Physical, Customizable |
| Office Equipment | 6 | Physical |
| KonektSeries | 5 | Physical, Ready-to-buy |
| **Creative Services** | **8** | **Services with packages** |
| **Total** | **32** | |

---

## Frontend Routes

### Customer Routes
```
/                       - Landing page
/products               - Product catalog
/product/:id            - Product detail
/customize/:id          - Product customization canvas
/cart                   - Shopping cart
/auth                   - Login/Register
/dashboard              - Customer dashboard
/orders/:id             - Order tracking
/creative-services      - Design services listing  (NEW)
/services/:id           - Service detail + brief   (NEW)
/services/maintenance   - Equipment maintenance
```

### Admin Routes
```
/admin/login            - Admin login
/admin                  - Dashboard
/admin/orders           - Order management
/admin/products         - Product CRUD
/admin/crm              - CRM Pipeline (NEW)
/admin/tasks            - Task Management (NEW)
/admin/inventory        - Inventory Tracking (NEW)
/admin/invoices         - Invoice Management (NEW)
/admin/quotes           - Quote Management (NEW)
/admin/users            - User management
/admin/offers           - Promotional offers
/admin/referrals        - Referral program
/admin/maintenance      - Maintenance requests
/admin/stock            - Stock Management
```

---

## API Endpoints

### Service Orders (NEW)
```
POST   /api/service-orders              - Create service order
GET    /api/service-orders              - List orders (admin)
GET    /api/service-orders/{id}         - Get order details
PATCH  /api/service-orders/{id}/status  - Update status
POST   /api/service-orders/{id}/notes   - Add designer note
GET    /api/admin/service-orders/stats  - Dashboard stats
GET    /api/service-orders/customer/{email} - Customer orders
```

### AI Services
```
POST /api/ai/recommend-products      - Product recommendations
POST /api/ai/generate-design-brief   - Design brief generator
POST /api/ai/generate-logo-concept   - Logo concept ideas
POST /api/ai/suggest-price           - Pricing suggestions
GET  /api/ai/service-packages/{type} - Package tiers
```

### Products
```
GET  /api/products           - List all products
GET  /api/products/{id}      - Product detail
GET  /api/products/categories/list
```

### Customer
```
POST /api/auth/register/login
GET  /api/orders
POST /api/orders
POST /api/chat
POST /api/logo/generate
```

### Admin Business OS (NEW)
```
GET    /api/admin/dashboard/summary     - Dashboard metrics
POST   /api/admin/crm/leads             - Create lead
GET    /api/admin/crm/leads             - List leads
GET    /api/admin/crm/leads/{id}        - Get lead
PATCH  /api/admin/crm/leads/{id}/status - Update lead status
DELETE /api/admin/crm/leads/{id}        - Delete lead
POST   /api/admin/tasks                 - Create task
GET    /api/admin/tasks                 - List tasks
PATCH  /api/admin/tasks/{id}/status     - Update task status
DELETE /api/admin/tasks/{id}            - Delete task
POST   /api/admin/inventory/items       - Create inventory item
GET    /api/admin/inventory/items       - List inventory items
POST   /api/admin/inventory/movements   - Create stock movement
GET    /api/admin/inventory/movements   - List stock movements
GET    /api/admin/inventory/low-stock   - Get low stock items
POST   /api/admin/invoices              - Create invoice
GET    /api/admin/invoices              - List invoices
PATCH  /api/admin/invoices/{id}/status  - Update invoice status
POST   /api/admin/invoices/{id}/payments - Add payment
POST   /api/admin/quotes                - Create quote
GET    /api/admin/quotes                - List quotes
PATCH  /api/admin/quotes/{id}/status    - Update quote status
POST   /api/admin/quotes/{id}/convert-to-order   - Convert to order
POST   /api/admin/quotes/{id}/convert-to-invoice - Convert to invoice
GET    /api/admin/customers             - List customers
GET    /api/admin/customers/{id}        - Get customer with orders
```

### Quote/Invoice v2 & PDF Export (NEW)
```
GET/PUT /api/admin/settings/company     - Company branding settings
POST    /api/admin/quotes-v2            - Create quote with line items
GET     /api/admin/quotes-v2            - List all quotes
GET     /api/admin/quotes-v2/{id}       - Get quote by ID
PATCH   /api/admin/quotes-v2/{id}/status - Update quote status
POST    /api/admin/quotes-v2/convert-to-order - Convert quote to order
POST    /api/admin/quotes-v2/{id}/convert-to-invoice - Convert quote to invoice
POST    /api/admin/invoices-v2          - Create invoice with line items
GET     /api/admin/invoices-v2          - List all invoices
GET     /api/admin/invoices-v2/{id}     - Get invoice by ID
PATCH   /api/admin/invoices-v2/{id}/status - Update invoice status
POST    /api/admin/invoices-v2/{id}/payments - Add payment
POST    /api/admin/invoices-v2/convert-from-order - Create invoice from order
GET     /api/admin/pdf/quote/{id}       - Export quote as PDF
GET     /api/admin/pdf/invoice/{id}     - Export invoice as PDF
```

### Order Operations & Production Queue (NEW)
```
GET     /api/admin/orders-ops           - List all orders
GET     /api/admin/orders-ops/{id}      - Get single order
PATCH   /api/admin/orders-ops/{id}/status - Update order status with history
POST    /api/admin/orders-ops/reserve-inventory - Reserve inventory for order
POST    /api/admin/orders-ops/assign-task - Create task linked to order
POST    /api/admin/orders-ops/send-to-production - Add order to production queue
GET     /api/admin/production/queue     - List production queue items
GET     /api/admin/production/queue/{id} - Get production item
PATCH   /api/admin/production/queue/{id}/status - Update production status (syncs to order)
GET     /api/admin/production/stats     - Production queue statistics
POST    /api/admin/send/quote/{id}      - Send quote email (stub)
POST    /api/admin/send/invoice/{id}    - Send invoice email (stub)
POST    /api/admin/send/order/{id}/confirmation - Send order confirmation (stub)
```

### Admin
```
POST /api/admin/auth/login
GET  /api/admin/analytics/*
GET  /api/admin/orders/*
GET  /api/admin/products/*
```

---

## File Structure

```
/app
├── backend/
│   ├── server.py              # Main FastAPI
│   ├── ai_services.py         # AI recommendation endpoints
│   ├── service_orders.py      # Creative service orders (NEW)
│   ├── sales_routes.py        # Sales CRM
│   ├── sales_automation.py    # Automation engine
│   ├── email_service.py       # Resend integration
│   ├── seed_products.py       # Database seeder
│   ├── Dockerfile
│   └── .env.production
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingNew.js           # World-class homepage
│   │   │   ├── CreativeServicesPage.js # Services listing (NEW)
│   │   │   ├── ServiceDetail.js        # Service detail (NEW)
│   │   │   ├── Products.js
│   │   │   └── admin/
│   │   ├── components/
│   │   │   ├── DesignBriefForm.js      # Brief form (NEW)
│   │   │   └── ...
│   │   ├── lib/
│   │   │   └── api.js                  # API client (NEW)
│   │   └── contexts/
│   ├── Dockerfile
│   └── nginx.conf
│
├── nginx/nginx.conf
├── docker-compose.yml
├── deploy.sh
└── memory/PRD.md
```

---

## Deployment

```bash
# Configure
cp backend/.env.production backend/.env
# Edit with real values

# Deploy
./deploy.sh build
./deploy.sh start
./deploy.sh seed
./deploy.sh status

# SSL
./deploy.sh ssl
```

---

## Admin Credentials

| Account | Email | Note |
|---------|-------|------|
| Primary Admin | admin@konekt.co.tz | Password rotated |
| Backup Admin | backup@konekt.co.tz | Emergency access |

---

## Backlog

### P0 - Ready for Launch ✅
- [x] All deployment files
- [x] Database seeded (32 products)
- [x] Admin credentials secured
- [x] Creative services flow complete
- [x] Service order management
- [x] Admin Business OS (CRM, Tasks, Inventory, Invoices, Quotes) - TESTED
- [x] Quote → Order → Invoice → PDF workflow - TESTED
- [x] Company branding settings for PDFs
- [x] Order Operations & Production Queue - TESTED
- [x] Inventory reservation for orders
- [x] Task assignment from orders
- [x] Per-Client Payment Terms - TESTED
- [x] Polished Quote & Invoice Admin UI - TESTED
- [x] Bank Transfer Proof Upload & Payment Visibility - TESTED
- [x] Rotating Hero Banner System - TESTED
- [x] Strengthened Referral Program with Social Sharing - TESTED
- [x] Platform Alignment Phase A - TESTED (UnifiedHero, Structured Creative Services, CRM Settings, Inventory Variants, Central Payments, Statements, Quotes View Toggle, Client Promo Strip)
- [ ] Fill real API keys (EMERGENT_LLM_KEY, RESEND_API_KEY)
- [ ] Point DNS
- [ ] Enable SSL

### P1 - Post-Launch (Week 1)
- [ ] Platform Alignment Phase B - Client page filters, CRM Kanban inside CRM page, Inventory module merge
- [ ] Platform Alignment Phase C - Affiliate application flow, Partner portal
- [ ] File upload for design assets (currently only metadata)
- [ ] Connect email send stubs to Resend API
- [ ] Payment gateway (M-Pesa, Stripe)
- [ ] PDF watermarks for DRAFT/PAID/OVERDUE status
- [ ] Customer approval link for quotes
- [ ] Role-based permissions (admin/sales/production)

### P2 - Growth (Week 2-4)
- [ ] WhatsApp notifications
- [ ] Advanced referral gamification
- [ ] Inventory alerts (partial - low stock alerts API ready)
- [ ] B2B team accounts
- [ ] Saved brand assets
- [ ] Sequential invoice numbering rules
- [ ] Multiple currencies support
- [ ] Statement of account export
- [ ] Audit trail for all admin actions

### P3 - Future
- [ ] Mobile app
- [ ] 3D product customization
- [ ] AR preview
- [ ] AI brand builder

---

## Customer Journey

### Promotional Products Flow
```
Landing → Browse Products → Product Detail → Customize → Cart → Login → Order → Track → Reorder
```

### Creative Services Flow (NEW)
```
Landing → Creative Services → Service Detail → Choose Package → Fill Brief → AI Assist → Submit → Dashboard → Track → Review Drafts → Approve → Download
```

### Quote to Invoice Flow (NEW)
```
CRM Lead → Create Quote → Send to Customer → Customer Approves → Convert to Order → Production → Convert to Invoice → Add Payments → PAID
```

### Order Operations Flow (NEW)
```
Order Created → Reserve Inventory → Assign Tasks → Send to Production → Track Production → Quality Check → Ready for Dispatch → Delivered
```

---

### March 12, 2026 - Phase 14: Platform Alignment - Phase A (TESTED ✅)

#### What Changed
Major architectural alignment to unify the platform UX and business logic. This is part of a multi-phase project to make Konekt feel like one coherent system.

#### New Backend Files
- [x] `creative_service_models.py` - CreativeService with brief_fields and addons
- [x] `creative_service_routes_v2.py` - Structured creative services with service-specific briefs
- [x] `crm_settings_routes.py` - Admin-configurable CRM settings (industries, sources)
- [x] `inventory_variant_routes.py` - SKU-level inventory variants linked to products
- [x] `payment_records_models.py` - ManualPaymentCreate, PaymentAllocationItem
- [x] `central_payments_routes.py` - Central payment management with allocations
- [x] `statement_routes.py` - Statement of account and aging reports

#### New Frontend Components
- [x] `UnifiedHero.jsx` - Unified rotating hero integrated into existing hero layout (replaces floating HeroCarousel)
- [x] `ClientPromoStrip.jsx` - Rotating promotional strip on customer dashboard
- [x] `CentralPaymentsPage.jsx` - Central payment management page
- [x] `StatementPage.jsx` - Statement of account page

#### Updated Frontend Components
- [x] `LandingNew.js` - Uses UnifiedHero instead of HeroCarousel
- [x] `CustomerDashboard.jsx` - Includes ClientPromoStrip
- [x] `QuotesPage.jsx` - List/Cards/Kanban view toggle integrated (removed separate Quote Kanban page)
- [x] `AdminLayout.js` - Updated sidebar: Finance section (Payments, Statements, Bank Transfers), Operations section

#### Key Features Implemented
1. **Unified Hero Rotator** - Dynamic hero content from database with Quick Journey card
2. **Structured Creative Services** - Service-specific brief forms with billable add-ons (copywriting, rush, source files)
3. **CRM Settings** - Admin-configurable industries (18) and lead sources (16)
4. **Inventory Variants** - SKU-level stock tracking with product linking
5. **Central Payments Module** - Payment recording, allocation to invoices, partial payments
6. **Statement of Accounts** - Transaction history with running balance, aging report
7. **Quotes View Toggle** - List/Cards/Kanban views in single page
8. **Client Promo Strip** - Rotating promotional messages in customer dashboard

#### New API Endpoints
- `GET /api/creative-services-v2` - List active creative services
- `GET /api/creative-services-v2/all` - Admin: list all services
- `POST /api/creative-services-v2/admin` - Create service
- `POST /api/creative-services-v2/orders` - Submit service order with brief
- `GET /api/admin/crm-settings` - Get CRM settings
- `PUT /api/admin/crm-settings` - Update CRM settings
- `GET /api/admin/inventory-variants` - List inventory variants
- `POST /api/admin/inventory-variants` - Create variant
- `GET /api/admin/inventory-variants/low-stock/alerts` - Low stock alerts
- `GET /api/admin/central-payments` - List payments
- `POST /api/admin/central-payments` - Record manual payment
- `GET /api/admin/central-payments/stats/summary` - Payment statistics
- `GET /api/admin/statements/customer/{email}` - Customer statement
- `GET /api/admin/statements/customer/{email}/aging` - Aging report

#### Test Results (iteration_15.json)
- Backend: 100% (18/18 tests passed)
- Frontend: 100% verified

---

### March 12, 2026 - Phase 15: Inventory Module Consolidation (TESTED ✅)

#### What Changed
Merged the separate "Inventory" and "Stock Management" modules into a unified "Inventory" section. Built a new Inventory Variants (SKUs) management UI with full CRUD functionality and product linking.

#### New Frontend Files
- [x] `InventoryVariantsPage.jsx` - Full CRUD UI for product variants with SKU, attributes, stock levels, pricing

#### Updated Frontend Files
- [x] `AdminLayout.js` - Consolidated sidebar navigation: removed separate "Stock Management" and "Operations/Inventory", added unified "Inventory" section with "Stock Items" and "Product Variants"
- [x] `App.js` - Added route `/admin/inventory/variants` for new variants page
- [x] `api.js` - Fixed token interceptor to check for `konekt_admin_token` first (admin auth) then `token` (customer auth)
- [x] `InventoryPage.js` - Added `data-testid` attributes for testing

#### Key Features Implemented
1. **Unified Inventory Navigation** - Single "Inventory" section in admin sidebar with "Stock Items" and "Product Variants" links
2. **Inventory Variants UI** - Full CRUD interface for managing product variants:
   - Stats dashboard: Total, Active, Low Stock, Total Stock Value
   - Low stock alert banner with toggle
   - Search by SKU, product, or warehouse location
   - Filter by parent product dropdown
   - Create/Edit modal with: Parent Product select, SKU input, Variant Attributes (size/color/material), Stock on Hand, Reserved Stock, Reorder Level, Unit Cost, Selling Price, Warehouse Location
   - Edit and Delete (soft delete) actions in table
3. **API Token Fix** - Fixed authentication interceptor to properly use admin tokens stored as `konekt_admin_token`

#### API Endpoints (Backend already existed)
- `GET /api/admin/inventory-variants` - List all variants (supports ?product_id filter)
- `POST /api/admin/inventory-variants` - Create variant
- `GET /api/admin/inventory-variants/{id}` - Get single variant
- `PUT /api/admin/inventory-variants/{id}` - Update variant
- `DELETE /api/admin/inventory-variants/{id}` - Soft delete variant
- `GET /api/admin/inventory-variants/low-stock/alerts` - Low stock alerts

#### Test Results (iteration_18.json)
- Backend: 100% (21/21 tests passed)
- Frontend: 100% verified
- Features tested: Sidebar navigation, Variants CRUD, Low stock alerts, Search/Filter, CRM views, Customers filters

---

*Last updated: March 12, 2026 - Phase 15 Complete (Inventory Module Consolidation)*
