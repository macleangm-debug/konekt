# Konekt - Promotional Materials Platform PRD

## Overview
Konekt is a B2B e-commerce platform for ordering customized promotional materials, office equipment, **Creative Design Services**, and exclusive branded clothing (KonektSeries). Based in Dar es Salaam, Tanzania.

**Vision**: The biggest B2B branding platform in East Africa — combining VistaPrint + Printful + Fiverr for corporate merchandise and design services.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Framer Motion, Shadcn UI, @dnd-kit/core
- **Backend**: FastAPI, Motor (async MongoDB)
- **Database**: MongoDB 7.0
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Email**: Resend API
- **PDF**: ReportLab for Zoho-style professional documents
- **Authentication**: JWT with role-based permissions
- **Deployment**: Docker Compose + Nginx

---

## What's Been Implemented ✅

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
- [ ] Fill real API keys (EMERGENT_LLM_KEY, RESEND_API_KEY)
- [ ] Point DNS
- [ ] Enable SSL

### P1 - Post-Launch (Week 1)
- [ ] File upload for design assets (currently only metadata)
- [ ] Connect email send stubs to Resend API
- [ ] Payment gateway (M-Pesa, Stripe)
- [ ] PDF watermarks for DRAFT/PAID/OVERDUE status
- [ ] Customer approval link for quotes
- [ ] Role-based permissions (admin/sales/production)

### P2 - Growth (Week 2-4)
- [ ] WhatsApp notifications
- [ ] Advanced referral gamification
- [ ] Inventory alerts
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

*Last updated: March 11, 2026 - Phase 6 Complete (Order Operations & Production Queue)*
