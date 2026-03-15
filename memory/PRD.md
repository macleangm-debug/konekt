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

## Feature-Complete Status as of March 13, 2026

### Core Modules Implemented

#### 1. Inventory System
- **Product Variants**: SKU-level stock tracking with attributes
- **Warehouses**: Full CRUD with capacity tracking
- **Raw Materials**: CRUD with stock adjustment functionality
- **Stock Transfers**: Move stock between warehouses with movement tracking
- **Stock Movement History**: Complete ledger of all stock changes
- **Stock Reserve/Deduct**: Real order-level stock reservation and deduction

#### 2. Financial System
- **Central Payments**: Record payments and allocate to multiple invoices
- **Multi-Invoice Payment Allocation**: Partial payments across invoices
- **Customer Statements**: Transaction history with running balance
- **Statement PDF Export**: Professional PDF generation
- **Customer-Facing Statement View**: Customers can view their own statements

#### 3. Creative Services
- **Dynamic Brief System**: Service-specific forms with custom fields
- **Billable Add-ons**: Copywriting, rush delivery, source files
- **Collaboration Portal**: Comments, revision requests, file deliverables
- **Project Dashboard**: Customer and admin views

#### 4. Affiliate Program
- **Partner Dashboard**: Self-service for affiliates
- **Commission Tracking**: Automatic commission on referred sales
- **Payout Requests**: Affiliates can request payouts
- **Self-Service Dashboard**: Full affiliate self-service functionality

#### 5. Business OS Admin
- **CRM Pipeline**: Lead management with kanban views
- **Document Workflow**: Quote → Order → Invoice visualization
- **Production Queue**: Kanban with task visibility toggle
- **Tasks Page**: My Tasks vs Team Overview toggle
- **Setup Pages**: Industries, Sources, Payment Terms configuration
- **Launch Readiness**: QA dashboard with PDF export

#### 6. Activity Logs / Audit Trail
- **Audit Log API**: Track user actions
- **Audit Log Page**: Filter and view system activity
- **Entity Audit Panel**: Reusable component for entity history

#### 7. Deployment & Monitoring
- **Health Endpoints**: /api/health, /api/health/ready
- **Security Headers**: X-Frame-Options, CSP, etc.
- **Team Role Management**: Staff role assignment API
- **Launch Readiness PDF**: Go-live certification report

#### 8. Customer Portal Redesign ✅ (March 13, 2026) + Pack 1 Enhancements (March 15, 2026)
- **CustomerPortalLayout**: New dedicated sidebar layout with grouped navigation (Orders & Sales, Services, Account, Rewards)
- **CustomerDashboardHome**: Rich dashboard with banner carousel, stats cards, action cards
- **ClientBannerCarousel**: Rotating promotional banners with navigation
- **ReferralPointsBanner**: Shows referral code with copy button and points balance
- **CustomerQuotesPage**: View/filter quotes (all/pending/approved/rejected) with approve/convert flow
- **CustomerQuoteDetailPage**: Quote detail with approval workflow and convert-to-invoice
- **CustomerInvoicesPage**: View/filter invoices (all/unpaid/paid/overdue) with Pay Now buttons
- **CustomerInvoiceDetailPage**: Invoice detail with line items, totals, Pay Now option
- **CustomerOrdersPage**: View/filter orders (all/active/completed/cancelled)
- **AddressesPage**: Full CRUD with country dropdown, phone prefix auto-selection
- **ReferralsPage**: Referral code, copy/share buttons, stats, referral list
- **PointsPage**: Points balance, earning methods, transaction history

#### 9. Codebase Pack 1 - Service Flow Alignment ✅ NEW (March 15, 2026)
- **COUNTRIES constant**: 11 countries with dial codes for Tanzania, Kenya, Uganda, Rwanda, etc.
- **Phone prefix auto-selection**: Country dropdown automatically updates phone prefix
- **Creative Service payment choice**: "Pay now" vs "Request quote first" options
- **Save address checkbox**: Option to save delivery details for future orders
- **Creative Service Checkout Page**: Review page before payment with completion options
- **Customer Orders API**: New `/api/customer/orders` endpoint
- **Referrals Overview API**: New `/api/customer/referrals/overview` endpoint
- **ReferralPointsBanner**: Reusable component showing referral code and points on dashboard
- **EmptyStateCard**: Reusable empty state component with action buttons

#### 10. Codebase Pack 2 - Service-Specific Dynamic Forms ✅ NEW (March 15, 2026)
- **Service Forms System**: 9 pre-configured service forms with dynamic schemas
  - Creative Services: Logo Design, Flyer Design, Brochure Design, Company Profile Design, Banner Design
  - Copywriting Services: Full business copywriting service
  - Maintenance Services: Equipment Repair Request, Preventive Maintenance
  - Support Services: Technical Support Request
- **Dynamic Form Rendering**: DynamicServiceForm component handles text, textarea, select, radio, number, date fields
- **Pricing Add-ons**: Each service has optional add-ons with individual pricing
- **Service Request Engine**: Unified submission for all service categories
- **Backend Routes**:
  - `/api/service-forms/public` - List all active service forms (with category filter)
  - `/api/service-forms/public/slug/{slug}` - Get service form by slug
  - `/api/service-forms/admin` - Admin list (requires auth)
  - `/api/service-requests` - Create service request with answers and add-ons
- **Frontend Pages**:
  - ServicesHubPage (`/services`) - Services grouped by category with cards
  - ServiceRequestPage (`/services/:slug/request`) - Dynamic form based on service schema
  - Admin ServiceFormsPage (`/admin/service-forms`) - Service form management
- **Seed Script**: `seed_service_forms.py` for database population

#### 11. Codebase Pack 3 - Portal Polish & Conversion Optimization ✅ NEW (March 15, 2026)
- **EmptyStateCard Enhancement**: Added secondary CTA support, improved styling with conversion-focused messaging
- **PromoArtCards Component**: Upsell cards for design services, referrals, and maintenance on customer pages
- **Service Request Tracking**:
  - ServiceRequestsPage (`/dashboard/service-requests`) - Customer can view all service requests
  - ServiceRequestDetailPage (`/dashboard/service-requests/:requestId`) - Detailed view with pricing summary
  - Added Service Requests nav item in CustomerPortalLayout
- **Stronger Referrals Commercialization**:
  - ReferralPointsBanner upgraded with stronger messaging, "Use My Points" CTA
  - ReferralsPage with WhatsApp share, how-it-works cards, referral list
  - PointsPage with use case cards (Creative Services, Products, Growth Tips)
- **Checkout Points Messaging**: PointsUsageHint component for checkout pages
- **Better Empty States**:
  - CustomerInvoicesPage: Secondary CTA to "View Quotes"
  - CustomerQuotesPage: Secondary CTA to "Browse Products"  
  - MaintenanceDashboardPage: PromoArtCards, better empty state with service links
- **Portal Navigation**: CustomerDashboardHome now includes PromoArtCards section

---

## Admin Navigation Structure (Simplified)

The admin sidebar is now organized into logical groups:

1. **Dashboard & Overview**
   - Dashboard
   - Launch Readiness

2. **Sales**
   - CRM Pipeline
   - Quotes
   - Customers

3. **Operations**
   - Orders
   - Order Operations
   - Production Queue
   - Tasks

4. **Inventory**
   - Products
   - Stock Items
   - Stock Movements
   - Transfers
   - Warehouses
   - Raw Materials

5. **Finance**
   - Invoices
   - Central Payments
   - Record Payment
   - Statements
   - Document Flow

6. **Marketing**
   - Hero Banners
   - Creative Services
   - Referral Settings
   - Affiliates
   - Applications

7. **Settings**
   - Company Settings
   - Setup Lists
   - Users
   - Audit Log

---

## Testing Status

### Iteration 25 (March 13, 2026) - Menu & Audit Logs
- **Backend**: 11/11 tests passed (100%)
- **Frontend**: All pages verified working
- **Fixed**: PDF export now supports query param tokens

### Launch Readiness Score: 7/8
- has_products: OK
- has_variants: OK
- has_creative_services: OK
- has_banners: OK
- has_warehouses: OK
- has_company_name: OK (needs setup)
- has_tax_config: Missing
- has_currency: Missing

---

## Admin Credentials
| Account | Email | Note |
|---------|-------|------|
| Primary Admin | admin@konekt.co.tz | Password: KnktcKk_L-hw1wSyquvd! |
| Backup Admin | backup@konekt.co.tz | Password: Bkup5YEZWhHyFjkd5njz! |

---

## Mocked/Placeholder Integrations
1. **KwikPay** - Payment adapter is placeholder
2. **OpenAI** - AI features are mocked
3. **Resend** - Email hooks exist but not connected

---

## New API Endpoints (This Session)

### Audit Log
- `GET /api/admin/audit` - List audit logs with filters
- `GET /api/admin/audit/entity/{type}/{id}` - Entity-specific logs
- `GET /api/admin/audit/actions` - Distinct action types
- `GET /api/admin/audit/entity-types` - Distinct entity types

### Launch Report
- `GET /api/admin/launch-report/json` - Readiness data as JSON
- `GET /api/admin/launch-report/pdf` - PDF report (supports ?token= query param)

---

## Remaining Tasks

### P1 - Integration & Polish
- [ ] Finalize KwikPay integration with live API
- [ ] Connect Resend email service
- [ ] PDF document polish (quotes, invoices)
- [ ] Configure company tax settings

### P2 - Deployment
- [ ] Deployment hardening + production readiness checklist
- [ ] SSL/DNS verification
- [ ] Backup configuration
- [ ] Monitoring setup

### P3 - Future Enhancements
- [ ] WhatsApp notifications
- [ ] Mobile app
- [ ] 3D product customization

---

*Last updated: March 15, 2026 - Codebase Pack 3: Portal Polish & Conversion Optimization Complete*
