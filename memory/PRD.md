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

#### 12. Codebase Pack 4+6 Combined - Admin Service Operations, Points & Launch Hardening ✅ NEW (March 15, 2026)
- **Admin Service Request Management**:
  - ServiceRequestsAdminPage (`/admin/service-requests`) - List all service requests with filters
  - ServiceRequestAdminDetailPage (`/admin/service-requests/:requestId`) - Full admin workflow
  - Assign staff, update status, add comments (internal/customer), upload deliverables
  - Timeline tracking for all service request changes
- **File Upload System**:
  - Upload route at `/api/uploads/service-request-file` for deliverables
  - Static file serving via `/uploads` path
  - Supports common file types (images, documents, PDFs)
- **Points Persistence Service**:
  - `apply_points_discount_to_document()` - Deduct points and record transaction
  - `award_points_to_customer()` - Add points with transaction logging
  - Transaction history stored in `referral_points_transactions` collection
- **Invoice Points Application**:
  - `/api/customer/points-apply/invoice/{invoice_id}` - Apply points to invoices
  - PointsUsageBox component shows available points and discount value
  - CustomerInvoiceDetailPage updated with points application UI
  - 1 point = 1 TZS conversion rate
- **Payment Reconciliation Service**:
  - `reconcile_invoice_payment()` - Centralized invoice payment handling
  - Used by payment admin verification and KwikPay webhook
  - Properly tracks partial payments and payment history
- **Launch Hardening**:
  - `/api/admin/launch-hardening/checklist` - Environment config checks
  - LaunchHardeningWidget component for admin dashboard
  - Checks: MongoDB, JWT, Resend, KwikPay, Frontend URL, Sender Email, Bank Transfer
- **PDF Document Labels**:
  - `pdf_document_labels.py` - Helper for consistent PDF branding
  - Tax label, business identity lines, currency formatting utilities

#### 13. Codebase Pack 7 Core - Affiliate Platform ✅ NEW (March 15, 2026)
- **Affiliate Application Review**:
  - AffiliateApplicationsPage (`/admin/affiliate-applications`) - Review applications
  - Approve/reject workflow with commission rate assignment
  - Creates affiliate profile on approval
- **Affiliate Dashboard**:
  - AffiliateDashboardPage (`/dashboard/affiliate`) - Self-service dashboard
  - Summary: total earned, approved, paid, payable balance
  - Partner identity: promo code, referral link, commission rate
  - Payout request submission
- **Public Footer Component**:
  - PublicFooter.jsx - Premium dark navy footer
  - Pre-footer CTA strip with "Start a Request" and "Refer & Earn"
  - 5-column layout: Brand, Products, Company, Support, Contact
  - WhatsApp integration button
- **Backend APIs**:
  - `/api/admin/affiliates/applications` - List applications
  - `/api/admin/affiliates/applications/{id}/review` - Approve/reject
  - `/api/affiliate/me` - Dashboard data
  - `/api/affiliate/me/payout-request` - Submit payout request

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
   - Service Requests ✅ NEW
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
   - Service Forms ✅ NEW
   - Referral Settings
   - Affiliates
   - Affiliate Applications ✅ NEW

7. **Settings**
   - Company Settings
   - Setup Lists
   - Users
   - Audit Log

---

## Testing Status

#### 17. Campaign + Affiliate Tracking Engine ✅ NEW (March 15, 2026)
- **Attribution Service** (`checkout_attribution_service.py`):
  - `resolve_affiliate_attribution()` - Looks up affiliate by promo code
  - `log_campaign_usage()` - Logs campaign redemptions to `campaign_usages` collection
- **Fraud Guard** (`affiliate_fraud_guard.py`):
  - `affiliate_conversion_allowed()` - Prevents duplicate commissions
  - `check_velocity_fraud()` - Detects suspicious conversion rates
- **Enhanced Commission Service**:
  - Integrated fraud guard checks
  - Campaign commission override support (`no_commission`, `override_rate`)
- **Checkout Endpoints**:
  - `POST /api/checkout/evaluate-campaign` - Returns best campaign + affiliate attribution
  - `POST /api/checkout/evaluate-campaigns` - Returns all applicable campaigns
  - `GET /api/checkout/detect-attribution` - Detects affiliate from cookie/URL
- **Order Attribution**:
  - Orders now store `affiliate_code`, `affiliate_email`, `affiliate_name`
  - Orders store `campaign_id`, `campaign_name`, `campaign_discount`
  - Campaign usage logged for analytics
- **Enhanced Performance Metrics**:
  - `campaign_usages` collection tracks all redemptions
  - Revenue calculation from both orders and invoices_v2
  - Commission totals aggregated per campaign
- **Testing**: 17/17 backend tests pass, frontend widget verified

#### 16. Stabilization v3 - Campaign Performance Metrics ✅ (March 15, 2026)
- **Backend API**:
  - `/api/admin/campaign-performance/summary` - Returns clicks, redemptions, revenue, commissions, conversion rate per campaign
  - Aggregates data from orders, invoices_v2, affiliate_clicks, affiliate_commissions
- **CampaignPerformanceWidget**:
  - Displays real-time metrics: Clicks, Redemptions, Revenue, Conversion %
  - Integrated into AdminDashboard, AffiliateCampaignsPage
- **CurrentPromotionsWidget**:
  - Shows active campaigns with dates and headlines
  - Integrated into AffiliateSettingsPage and AffiliateCampaignsPage
- **Affiliate Dashboard Consolidation**:
  - `frontend/src/pages/dashboard/AffiliateDashboardPage.jsx` is now the source of truth
  - `frontend/src/pages/affiliate/AffiliateDashboardPage.jsx` is a compatibility wrapper
- **Testing**: 9/9 backend tests pass, all widgets verified

#### 15. Attribution + Checkout Campaign Application Pack ✅ (March 15, 2026)
- **Checkout Campaign Evaluation API**:
  - `/api/checkout/evaluate-campaigns` - Evaluates active campaigns against checkout data
  - `/api/checkout/evaluate-affiliate-perk` - Validates affiliate code and returns perk eligibility
  - `/api/checkout/detect-attribution` - Detects affiliate from URL params or cookies
  - `/api/checkout/active-promotions` - Returns public promotions for display
- **Order Attribution**:
  - Guest orders now accept `affiliate_code`, `affiliate_email`, `campaign_id`, `campaign_name`, `campaign_discount`, `campaign_reward_type`
  - Attribution data stored on order documents
  - Automatic affiliate lookup from code to email
- **Frontend Checkout Integration**:
  - `CheckoutPage.jsx` - Integrated AffiliatePerkPreviewBox and campaign display
  - `CreativeServiceCheckoutPage.jsx` - Same integration for creative services
  - Shows detected affiliate banner when attribution cookie exists
  - Displays available campaigns with discount amounts
  - Order summary shows perk and campaign discount rows
- **Testing**: 21/21 backend tests pass, all frontend components verified

#### 14. Codebase Pack 8 - Launch Stabilization (Affiliate Platform) ✅ (March 15, 2026)
- **Affiliate Settings Admin**:
  - Full configuration page at `/admin/affiliate-settings`
  - Commission rules: type (percentage/fixed), default rate, trigger events
  - Tracking: cookie window, promo codes, referral links
  - Payout & Qualification: minimum payout, manual approval, terms URL
  - Customer Perk: discount type, value, cap, min order, categories, first order only
- **Click Tracking System**:
  - `/affiliate-track/{code}` - Tracks clicks and sets attribution cookie
  - Stores IP, user agent, timestamp for analytics
- **Commission Attribution**:
  - `create_affiliate_commission_on_closed_business()` - Only creates commission on paid business
  - Patched into `payment_admin_routes.py` and `kwikpay_webhook_routes.py`
  - No commission on clicks/leads/signups (configurable via settings)
- **Payout Approval Workflow**:
  - Admin page at `/admin/affiliate-payouts`
  - Status filter: pending, approved, paid, rejected
  - Approve → Mark Paid workflow with payment reference
- **Campaign Marketing System**:
  - Admin page at `/admin/affiliate-campaigns`
  - Campaign builder with reward, eligibility, limits, stacking, marketing fields
  - Auto-generated social share messages for WhatsApp, Instagram, Facebook, LinkedIn, X
  - Current promotions widget for admin dashboard
- **Campaign Evaluation Engine**:
  - `evaluate_campaigns_for_checkout()` - Checks all eligibility rules
  - Max uses per customer, total redemption limits
  - Category/service slug restrictions
- **Customer Perk Preview**:
  - `/api/affiliate-perks/preview` - Preview perk at checkout
  - `AffiliatePerkPreviewBox` component for checkout pages

### Iteration 34 (March 15, 2026) - Campaign + Affiliate Tracking Engine
- **Backend**: 17/17 tests passed (100%)
- **Frontend**: CampaignPerformanceWidget verified
- **New Services**: checkout_attribution_service.py, affiliate_fraud_guard.py
- **Enhanced**: Commission service with fraud guard, order creation with campaign usage logging

### Iteration 33 (March 15, 2026) - Stabilization v3: Campaign Performance
- **Backend**: 9/9 tests passed (100%)
- **Frontend**: All widgets verified (CampaignPerformanceWidget, CurrentPromotionsWidget)
- **New API**: /api/admin/campaign-performance/summary
- **Integrated**: Widgets into AdminDashboard, AffiliateCampaignsPage, AffiliateSettingsPage

### Iteration 32 (March 15, 2026) - Attribution + Checkout Campaign Pack
- **Backend**: 21/21 tests passed (100%)
- **Frontend**: CheckoutPage and CreativeServiceCheckoutPage verified
- **New Endpoints**: /api/checkout/evaluate-campaigns, /api/checkout/detect-attribution, etc.
- **Fixed**: React hooks violation in CreativeServiceCheckoutPage.jsx

### Iteration 31 (March 15, 2026) - Pack 8: Launch Stabilization
- **Backend**: 16/16 tests passed (100%)
- **Frontend**: All 3 new admin pages verified
- **New Pages**: Affiliate Settings, Affiliate Payouts, Promo Campaigns

### Iteration 25 (March 13, 2026) - Menu & Audit Logs
- **Backend**: 11/11 tests passed (100%)
- **Frontend**: All pages verified working
- **Fixed**: PDF export now supports query param tokens

### Launch Readiness Score: 2/9 (new enhanced checklist)
- mongo_url_configured: OK
- jwt_secret_configured: OK
- resend_configured: Missing
- kwikpay_base_url_configured: Missing
- kwikpay_api_key_configured: Missing
- kwikpay_secret_configured: Missing
- frontend_url_configured: Missing
- sender_email_configured: Missing
- bank_transfer_enabled: Missing

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

## New API Endpoints (Pack 6 Session)

### Points & Checkout
- `POST /api/customer/points-apply/invoice/{invoice_id}` - Apply points to invoice

### Admin Service Requests
- `GET /api/admin/service-requests` - List all service requests
- `GET /api/admin/service-requests/{id}` - Get service request detail
- `POST /api/admin/service-requests/{id}/assign` - Assign to staff
- `POST /api/admin/service-requests/{id}/status` - Update status
- `POST /api/admin/service-requests/{id}/comments` - Add comment
- `POST /api/admin/service-requests/{id}/deliverables` - Add deliverable

### Customer Service Requests
- `GET /api/customer/service-requests/{id}` - Get customer's service request
- `POST /api/customer/service-requests/{id}/revision` - Request revision

### Affiliate Platform
- `GET /api/admin/affiliates/applications` - List affiliate applications
- `POST /api/admin/affiliates/applications/{id}/review` - Review application
- `GET /api/affiliate/me` - Affiliate dashboard data
- `POST /api/affiliate/me/payout-request` - Submit payout request

### Checkout Campaign Attribution (NEW)
- `POST /api/checkout/evaluate-campaigns` - Evaluate active campaigns for checkout
- `POST /api/checkout/evaluate-affiliate-perk` - Validate affiliate perk eligibility
- `GET /api/checkout/detect-attribution` - Detect affiliate from cookies/URL
- `GET /api/checkout/active-promotions` - Get public promotions
- `POST /api/guest/orders` - Now accepts affiliate_code, campaign_id, etc.

### Launch Hardening
- `GET /api/admin/launch-hardening/checklist` - Environment config checks

### File Uploads
- `POST /api/uploads/service-request-file` - Upload service request file

### Audit Log (Previous Session)
- `GET /api/admin/audit` - List audit logs with filters
- `GET /api/admin/audit/entity/{type}/{id}` - Entity-specific logs
- `GET /api/admin/audit/actions` - Distinct action types
- `GET /api/admin/audit/entity-types` - Distinct entity types

### Launch Report
- `GET /api/admin/launch-report/json` - Readiness data as JSON
- `GET /api/admin/launch-report/pdf` - PDF report (supports ?token= query param)

---

## Remaining Tasks

### P0 - Immediate (Next Pack)
- [x] ~~Affiliate click/conversion tracking~~ DONE
- [x] ~~Payout approval workflow for admins~~ DONE
- [x] ~~Attribution + Checkout Campaign Application~~ DONE
- [ ] Final PDF refinement (quotes, invoices)
- [ ] Production launch checklist & E2E QA

### P1 - Integration & Polish
- [ ] Finalize KwikPay integration with live API
- [ ] Connect Resend email service
- [ ] Configure company tax settings

### P2 - Deployment
- [ ] Deployment hardening + production readiness checklist
- [ ] SSL/DNS verification
- [ ] Backup configuration
- [ ] Monitoring setup

### P3 - World-Class Affiliate Platform
- [ ] Affiliate partner asset library
- [ ] Partner tiers (Authorized, Premium, Strategic)
- [ ] Fraud checks for affiliate conversions
- [x] ~~Tracked clicks and conversions~~ DONE

### P4 - Future Enhancements
- [ ] WhatsApp notifications
- [ ] Mobile app
- [ ] 3D product customization

---

*Last updated: March 15, 2026 - Codebase Pack 6: Final Checkout Persistence, Points Redemption, Launch Hardening & Pack 7 Affiliate Platform Complete*
