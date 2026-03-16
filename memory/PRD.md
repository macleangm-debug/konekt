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

#### 19. Attribution Persistence + Collection Unification Pack ✅ NEW (March 16, 2026)
- **User Registration Attribution**:
  - `UserCreate` model accepts `affiliate_code`, `campaign_id`
  - Register route uses `attribution_capture_service` to hydrate affiliate
  - Attribution fields stored on user document
- **Quote Attribution**:
  - `QuoteCreate` model includes full attribution fields
  - Quote creation uses `quotes_v2` collection
  - Attribution block: `affiliate_code`, `campaign_id`, `campaign_name`, `attribution_captured_at`
- **Invoice Attribution**:
  - Quote→Invoice conversion inherits all attribution fields
  - Uses `invoices_v2` collection for new invoices
  - `inherit_attribution_from_document()` preserves chain
- **Collection Unification**:
  - `quotes_v2` primary, `quotes` fallback
  - `invoices_v2` primary, `invoices` fallback
  - Listing endpoints dedupe by document number
- **Frontend Attribution**:
  - `App.js` calls `bootstrapAffiliateAttribution()` on load
  - `Auth.js` sends `affiliate_code` from localStorage on registration
  - URL params (`affiliate`, `ref`, `partner`) captured and persisted
- **Testing**: 16/16 backend tests pass, frontend attribution flow verified

#### 18. Final Commercial Stabilization Pack ✅ (March 15, 2026)
- **Attribution Capture Service** (`attribution_capture_service.py`):
  - `extract_attribution_from_payload()` - Extracts affiliate/campaign fields
  - `hydrate_affiliate_from_code()` - Looks up affiliate by promo code
  - `build_attribution_block()` - Standard attribution for document storage
  - `inherit_attribution_from_document()` - Quote → Invoice inheritance
- **Premium PDF Generator** (`pdf_commercial_documents.py`):
  - Modern layout with logo placeholder, From/Bill To blocks
  - Clean line items table with proper styling
  - Professional totals card with balance due
  - Notes, payment terms, payment instructions blocks
  - Uses reportlab with A4 format
- **PDF Export Routes** (`document_pdf_routes.py`):
  - `GET /api/documents/pdf/invoice/{id}` - Premium invoice PDF
  - `GET /api/documents/pdf/quote/{id}` - Premium quote PDF
  - Safe fallback: invoices_v2 → invoices collection
- **Frontend Attribution Helper** (`lib/attribution.js`):
  - `bootstrapAffiliateAttribution()` - Read from URL/localStorage
  - `getStoredAffiliateCode()` - Read from localStorage
  - `persistAffiliateCode()` - Store to localStorage
  - SSR-safe with typeof window checks
- **App.js Attribution Bootstrap**:
  - Calls `bootstrapAffiliateAttribution()` on app load
  - Affiliate codes survive browsing sessions
- **Checkout Attribution**:
  - CheckoutPage uses attribution helper
  - Sends affiliate_code in order payload
- **Testing**: 14/14 backend tests pass, frontend attribution flow verified

#### 17. Campaign + Affiliate Tracking Engine ✅ (March 15, 2026)
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

### Iteration 36 (March 16, 2026) - Attribution Persistence + Collection Unification
- **Backend**: 16/16 tests passed (100%)
- **Frontend**: Attribution bootstrap, auth page, admin panel verified
- **Key Changes**: UserCreate with affiliate_code, QuoteCreate with attribution, quotes_v2/invoices_v2 collections
- **New Tests**: /app/backend/tests/test_attribution_persistence.py

### Iteration 35 (March 15, 2026) - Final Commercial Stabilization
- **Backend**: 14/14 tests passed (100%)
- **Frontend**: Attribution flow, checkout, admin PDF buttons verified
- **New Services**: attribution_capture_service.py, pdf_commercial_documents.py
- **New Routes**: /api/documents/pdf/invoice/{id}, /api/documents/pdf/quote/{id}
- **New Helper**: frontend/src/lib/attribution.js

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
- [x] ~~Consistent attribution on signup/quote/invoice/order~~ DONE
- [x] ~~Final PDF design polish~~ DONE
- [x] ~~Attribution persistence + collection unification~~ DONE
- [x] ~~PDF & Notification Integration Pack~~ DONE (March 16, 2026)
- [x] ~~Go-Live Completion Pack~~ DONE (March 16, 2026)
- [ ] Connect Resend live (need `RESEND_API_KEY`)
- [ ] Connect KwikPay live (need credentials)
- [ ] Full end-to-end launch QA

### P1 - Integration & Polish
- [ ] Finalize KwikPay integration with live API
- [ ] Connect Resend email service
- [x] ~~Configure company tax settings~~ DONE (Business Settings)

### P2 - Deployment
- [x] ~~Deployment hardening + production readiness checklist~~ DONE (Go-Live Readiness)
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

## Recent Changes

### CRM / Sales Intelligence Pack (March 16, 2026)
- **CRM Intelligence Routes** (`crm_intelligence_routes.py`):
  - `GET /api/admin/crm-intelligence/dashboard` - Pipeline health, follow-ups, sources
  - `POST /api/admin/crm-intelligence/leads/{id}/note` - Add note to timeline
  - `POST /api/admin/crm-intelligence/leads/{id}/follow-up` - Schedule follow-up
  - `POST /api/admin/crm-intelligence/leads/{id}/status` - Update stage with win/lost reason
- **Sales KPIs** (`sales_kpi_routes.py`):
  - `GET /api/admin/sales-kpis/summary` - Lead count, won, lost, revenue, conversion rate
- **Marketing Performance** (`marketing_performance_routes.py`):
  - `GET /api/admin/marketing-performance/sources` - Source breakdown with leads, quotes, won
- **CRM Settings Enhanced** (`crm_settings_routes.py`):
  - Added: pipeline_stages, lost_reasons, win_reasons, default_follow_up_days, stale_lead_days
- **Lead Scoring** (`lead_scoring_service.py`):
  - Computes 0-100 score based on budget, urgency, company size, source, decision maker
- **Timeline Service** (`crm_timeline_service.py`):
  - Reusable helper for adding events to lead activity timeline
- **Lead Creation Patched** (`admin_routes.py`):
  - Auto-computes lead_score on creation
  - Creates timeline "created" event
  - Sets default next_follow_up_at
- **Frontend**:
  - `/admin/crm-intelligence` - Dashboard with KPIs, pipeline, sources
  - `/admin/crm-settings` - Settings for stages, reasons, reminders

### Go-Live Completion Pack (March 16, 2026)
- **Business Settings API** (`business_settings_routes.py`):
  - `GET /api/admin/business-settings` - Get/seed company settings
  - `PUT /api/admin/business-settings` - Update company settings
  - Covers: Company identity, address, commercial, banking, inventory, collection modes
- **Go-Live Readiness Validator** (`go_live_readiness_routes.py`):
  - `GET /api/admin/go-live-readiness` - 19-check pre-launch validator
  - Checks: Company info, banking, Resend, KwikPay configuration
- **Collection Mode Service** (`collection_mode_service.py`):
  - `get_quote_collection()` - Returns canonical quote collection based on settings
  - `get_invoice_collection()` - Returns canonical invoice collection based on settings
- **Routes Patched for Collection Mode**:
  - `quote_routes.py` - Uses canonical collection with legacy fallback
  - `invoice_routes.py` - Uses canonical collection with legacy fallback
  - `customer_quote_actions_routes.py` - Uses canonical collection
  - `document_pdf_routes.py` - Uses canonical collection with fallback
- **Frontend** (`BusinessSettingsPage.jsx`):
  - `/admin/business-settings` - Full settings form with readiness display
  - Added to admin navigation under Settings

### PDF & Notification Integration Pack (March 16, 2026)
- **Premium PDF Export Routes** (`document_pdf_routes.py`):
  - `GET /api/documents/pdf/quote/{quote_id}` - Export quote as polished PDF
  - `GET /api/documents/pdf/invoice/{invoice_id}` - Export invoice as polished PDF
- **Resend Email Service** (`resend_live_service.py`):
  - Integrated with Resend API for transactional emails
  - Graceful fallback when `RESEND_API_KEY` not configured
- **Notification Events** (`notification_events.py`):
  - `notify_quote_ready()` - Triggered on quote creation
  - `notify_invoice_ready()` - Triggered on invoice creation from quote
  - `notify_service_update()` - Triggered on service request status change
  - `notify_payment_received()` - Triggered on payment verification
- **Email Templates** (`email_templates_v2.py`):
  - Premium branded HTML templates for all notification types
- **Notification Test Routes** (`notification_test_routes.py`):
  - `GET /api/admin/notifications-test/status` - Check Resend configuration
  - `POST /api/admin/notifications-test/send` - Send test email
- **Routes Updated with Notification Triggers**:
  - `quote_routes.py` - notify_quote_ready, notify_invoice_ready
  - `customer_quote_actions_routes.py` - notify_invoice_ready
  - `service_request_admin_routes.py` - notify_service_update
  - `kwikpay_webhook_routes.py` - notify_payment_received
  - `payment_admin_routes.py` - notify_payment_received
- **Campaign Performance Routes** registered in server.py

### Deal Linkage & Commercial Relationship Pack (March 16, 2026)
- **CRM Deal Routes** (`crm_deal_routes.py`):
  - `GET /api/admin/crm-deals/leads/{lead_id}` - Lead detail with all related documents
  - `GET /api/admin/crm-deals/forecast` - Sales forecast with weighted pipeline values
  - `GET /api/admin/crm-deals/leaderboard` - Staff leaderboard with conversion rates
  - `GET /api/admin/crm-deals/marketing-roi` - Marketing source ROI analysis
- **Customer Account Routes** (`customer_account_routes.py`):
  - `GET /api/admin/customer-accounts/{email}` - 360-degree customer view
  - Returns profile, summary counts, and lists of quotes, invoices, orders, payments, service requests, leads
- **CRM Relationship Routes** (`crm_relationship_routes.py`):
  - `POST /api/admin/crm-relationships/leads/{id}/create-quote` - Create quote from lead
  - `POST /api/admin/crm-relationships/leads/{id}/create-invoice` - Create invoice from lead
  - `POST /api/admin/crm-relationships/leads/{id}/create-task` - Create task from lead
  - `POST /api/admin/crm-relationships/leads/{id}/convert-to-won` - Convert lead to won
- **Deal Linkage Service** (`deal_linkage_service.py`):
  - Links leads to related documents by email, lead_id, or company name
- **Frontend Pages**:
  - `LeadDetailPage.jsx` - Full lead detail with timeline, related documents, action panels
  - `CustomerAccountsPage.jsx` - Customer listing with search
  - `CustomerAccountSummaryPage.jsx` - 360-degree customer summary
- **Navigation Updates**:
  - Added CRM Intelligence, Customer Accounts, Business Settings, CRM Settings to sidebar
  - CRM Pipeline cards/list now link to LeadDetailPage

---

### Team UX & Permission Refinement Pack (March 16, 2026)
- **Role-based Navigation Filtering** (`roleModuleAccess.js`, `AdminLayout.js`):
  - Maps roles (super_admin, admin, supervisor, sales, production, finance, marketing, support) to allowed modules
  - Filters sidebar navigation dynamically based on user role
  - Admin/Super Admin see all 41+ items; other roles see only relevant modules
- **Staff Dashboard Routes** (`staff_dashboard_routes.py`):
  - `GET /api/staff-dashboard/me` - Returns role-specific dashboard cards and quick actions
  - Supports all 8 staff roles with customized data views
- **Supervisor Team Routes** (`supervisor_team_routes.py`):
  - `GET /api/supervisor-team/overview` - Global operational metrics
  - `GET /api/supervisor-team/performance` - Staff leaderboard with conversion rates
  - `GET /api/supervisor-team/staff-list` - Staff listing for team management
- **Staff Workspace Page** (`StaffWorkspaceHomePage.jsx`):
  - Simplified homepage for staff members
  - Role-specific stats cards and quick actions
  - Daily focus guidance based on role
- **Super Admin Control Panel** (`SuperAdminControlPanelPage.jsx`):
  - Global visibility across all teams
  - Key metrics: Leads, Quotes, Orders, Revenue
  - Staff Performance leaderboard
  - Quick navigation links
- **Staff Performance Page** (`StaffPerformancePage.jsx`):
  - Detailed performance metrics table
  - Rankings, conversion rates, task completion
- **Navigation Updates**:
  - Added Control Panel, Staff Workspace, Staff Performance to sidebar
  - Role-based filtering hides irrelevant modules from each role

---

### Inventory Operations Pack + UI Simplification (March 16, 2026)
- **Inventory Movement Service** (`inventory_movement_service.py`):
  - Centralized logging for all stock changes
  - Supports movement types: reserved, issued, received, transfer, adjustment, returned, delivery_note_issue, goods_received
  - Tracks direction (in/out), warehouse, reference documents, staff
- **Inventory Balance Service** (`inventory_balance_service.py`):
  - `reserve_inventory()` - Reserve stock for orders (reduces available, keeps on_hand)
  - `release_reservation()` - Release reserved stock when order cancelled
  - `issue_reserved_inventory()` - Issue reserved stock (reduces both on_hand and reserved)
  - `issue_unreserved_inventory()` - Direct issue without reservation
  - `receive_inventory()` - Receive stock (increases on_hand and available)
  - `get_stock_balance()` - Get current balance for SKU
- **Delivery Note Routes** (`delivery_note_routes.py`):
  - `GET /api/admin/delivery-notes` - List all delivery notes
  - `POST /api/admin/delivery-notes` - Create from order/invoice/direct
  - `GET /api/admin/delivery-notes/{id}` - Get delivery note details
  - `PATCH /api/admin/delivery-notes/{id}/status` - Update status (issued, in_transit, delivered, cancelled)
- **Goods Receiving Routes** (`goods_receiving_routes.py`):
  - `GET /api/admin/goods-receiving` - List goods receipts
  - `POST /api/admin/goods-receiving` - Create goods receipt (GRN)
  - Links to PO, updates PO status, records stock movements
- **Supplier Routes** (`supplier_routes.py`):
  - Full CRUD for supplier master data
  - Fields: name, contact, email, phone, address, city, country, tax_number, payment_terms, lead_time_days, bank_details
- **Procurement Routes** (`procurement_routes.py`):
  - `GET/POST /api/admin/procurement/purchase-orders` - List/Create POs
  - `PATCH /api/admin/procurement/purchase-orders/{id}/status` - Update status (draft, ordered, partially_received, received, cancelled)
  - `POST /api/admin/procurement/purchase-orders/{id}/approve` - Approve and order
- **Inventory Operations Dashboard** (`inventory_operations_dashboard_routes.py`):
  - `GET /api/admin/inventory-ops-dashboard` - Aggregated metrics
  - `GET /api/admin/inventory-ops-dashboard/low-stock` - Low stock items list
- **Inventory Ledger Routes** (`inventory_ledger_routes.py`):
  - `GET /api/admin/inventory-ledger` - All movements with filters
  - `GET /api/admin/inventory-ledger/{sku}` - Movement history for SKU
- **Frontend Pages**:
  - `InventoryOperationsPage.jsx` - Unified workspace with metrics and action panels
  - `DeliveryNotesPage.jsx` - Create/view delivery notes
  - `GoodsReceivingPage.jsx` - Create/view goods receipts
  - `SuppliersPage.jsx` - Manage supplier master
  - `PurchaseOrdersPage.jsx` - Create/manage purchase orders
- **Navigation Updates**:
  - Reorganized into "Inventory & Procurement" section
  - Added 5 new navigation items with moduleKey='inventory' for role filtering

---

*Last updated: March 16, 2026 - Inventory Operations Pack + UI Simplification Complete*

### Pack 14: Multi-Country Partner Routing Pack ✅ (March 16, 2026)

**Objective**: Build the architectural foundation for a multi-country, hidden-supplier fulfillment ecosystem enabling Konekt to scale across Africa with partner networks while maintaining complete control of customer relationships.

**Key Principles**:
- **Hidden Supplier Model**: Partners remain invisible to end customers. Konekt owns all customer communication and commercial control.
- **Geographical Routing**: Intelligent allocation based on customer location, partner availability, and business rules.
- **Localized Pricing**: Country-specific pricing with configurable markup engine on top of partner base prices.

**Backend Services Created**:
- **geography_routes.py**: Countries and regions management with seed endpoint
  - `GET /api/geography/countries` - List all countries with regions, currency
  - `GET /api/geography/regions/{country_code}` - Get regions for a country
  - `POST /api/geography/seed` - Seed default countries (TZ, KE, UG, RW, BI, CD)
- **partner_routes.py**: Partner master data management
  - Full CRUD: `GET/POST/PUT/DELETE /api/admin/partners`
  - Fields: name, partner_type, contact, country_code, regions, coverage_mode, fulfillment_type, lead_time_days, settlement_terms
  - Soft delete (sets status to inactive)
- **partner_catalog_routes.py**: Partner product/service catalog
  - Full CRUD: `GET/POST/PUT/DELETE /api/admin/partner-catalog`
  - Fields: partner_id, sku, name, base_partner_price, partner_available_qty, partner_status, lead_time_days, min_order_qty
  - Validates partner exists before creating
- **country_pricing_routes.py**: Country-specific markup rules
  - `GET/POST/DELETE /api/admin/country-pricing`
  - Supports percentage or fixed markup types
  - Upsert pattern for same country+category
- **routing_rules_routes.py**: Fulfillment routing configuration
  - Full CRUD: `GET/POST/PUT/DELETE /api/admin/routing-rules`
  - Priority modes: lead_time, margin, cost, preferred_partner
  - Optional region/category filters with cascading lookup
- **partner_routing_service.py**: Core routing engine
  - `route_partner_item()` - Route single item to best partner
  - `calculate_customer_price()` - Apply markup/tax to partner price
  - `find_eligible_partner_items()` - Find partners that can fulfill
- **fulfillment_allocation_service.py**: Hidden fulfillment job creation
  - `create_hidden_fulfillment_job()` - Creates partner-safe jobs (no customer PII)
  - `get_fulfillment_jobs_for_partner()` - Partner view without sensitive data
- **multi_country_order_routing_routes.py**: Order allocation
  - `POST /api/admin/multi-country-routing/test-routing` - Test routing without allocation
  - `POST /api/admin/multi-country-routing/allocate-order/{order_id}` - Create fulfillment jobs
  - `GET /api/admin/multi-country-routing/fulfillment-jobs/{order_id}` - View jobs for order

**Database Collections**:
- `countries`: code, name, currency, phone_code, regions[], is_active
- `partners`: name, partner_type, country_code, regions[], status, lead_time_days, settlement_terms
- `partner_catalog_items`: partner_id, sku, name, base_partner_price, partner_available_qty, partner_status
- `country_pricing_rules`: country_code, category, markup_type, markup_value, tax_rate, currency
- `routing_rules`: country_code, region, category, priority_mode, preferred_partner_id, internal_first, fallback_allowed
- `fulfillment_jobs`: parent_order_id, partner_id, sku, quantity, status, base_partner_price, customer_price (NO customer PII)

**Frontend Pages Created**:
- `PartnersPage.jsx` - Manage fulfillment partners
- `PartnerCatalogPage.jsx` - Products/services from partners
- `CountryPricingPage.jsx` - Country-specific markup rules
- `RoutingRulesPage.jsx` - Fulfillment routing configuration

**Components Created**:
- `CustomerLocationFields.jsx` - Reusable country/region selector component

**Navigation Updates**:
- Added "Partner Ecosystem" group in sidebar with 4 items
- moduleKey='partners' for role-based filtering (admin, super_admin only)

**Geography Data Seeded**:
- Tanzania (TZ): Dar es Salaam, Arusha, Mwanza, Dodoma, Mbeya, Morogoro, Tanga, Zanzibar, Kilimanjaro, Iringa
- Kenya (KE): Nairobi, Mombasa, Kisumu, Nakuru, Eldoret, Thika, Malindi, Kitale
- Uganda (UG): Kampala, Entebbe, Jinja, Mbarara, Gulu, Mbale, Fort Portal
- Rwanda (RW): Kigali, Huye, Musanze, Rubavu, Muhanga, Rusizi
- Burundi (BI): Bujumbura, Gitega, Ngozi, Rumonge
- DR Congo (CD): Kinshasa, Lubumbashi, Goma, Bukavu, Mbuji-Mayi

**Test Results**: 40/40 backend tests passed (100%), all 4 frontend pages verified

---

### Pack 15: Partner Portal Pack ✅ (March 16, 2026)

**Objective**: Build a secure, light-weight partner portal that allows suppliers and service providers to manage their Konekt allocation without exposing internal operations, other partners, or customer data.

**Key Principles**:
- **Partner Isolation**: Partners only see their own data (catalog, fulfillment jobs, settlements)
- **Hidden Customer Model**: NO customer PII exposed to partners (email, name, phone, address)
- **Separate Auth System**: Partner JWT token separate from main admin/customer auth
- **Easy Data Management**: Quick form + stock table + bulk upload for easy partner operations

**Backend Services Created**:
- **partner_auth_routes.py**: Partner authentication system
  - `POST /api/partner-auth/login` - Partner login, returns JWT token
  - `GET /api/partner-auth/me` - Get current partner user
  - `POST /api/partner-auth/admin/create-user` - Admin creates partner user account
  - `GET /api/partner-auth/admin/partner-users/{partner_id}` - List partner users
- **partner_access_service.py**: Token validation and partner isolation helpers
- **partner_portal_dashboard_routes.py**: Partner portal core functionality
  - `GET /api/partner-portal/dashboard` - Partner summary stats
  - `GET/POST/PUT/DELETE /api/partner-portal/catalog` - Partner catalog CRUD
  - `GET/POST /api/partner-portal/fulfillment-jobs` - View jobs, update status
  - `GET /api/partner-portal/settlements` - Settlement summary
  - `GET /api/partner-portal/stock-table` - Quick stock view
  - `POST /api/partner-portal/stock-table/bulk-update` - Batch update stock
- **partner_bulk_upload_routes.py**: Bulk catalog import
  - `GET /api/partner-bulk-upload/template` - Get JSON template
  - `POST /api/partner-bulk-upload/validate` - Validate before import
  - `POST /api/partner-bulk-upload/catalog` - Bulk import items
- **country_launch_routes.py**: Country expansion configuration
  - Full CRUD for country launch configs (status, waitlist, recruitment)
- **country_expansion_routes.py**: Public expansion endpoints
  - `POST /api/expansion/waitlist` - Join country waitlist
  - `POST /api/expansion/partner-application` - Apply as local partner
- **country_partner_admin_routes.py**: Admin management of partner applications
  - Review, approve, reject, convert to partner
- **public_country_catalog_routes.py**: Public country availability API

**Database Collections Added**:
- `partner_users`: email, partner_id, password_hash, full_name, role, status
- `country_launch_configs`: country_code, status, waitlist_enabled, partner_recruitment_enabled, headline, message
- `country_waitlist_requests`: country_code, customer_type, name, email, company_name
- `country_partner_applications`: country_code, company_name, contact_person, status, score, capabilities

**Frontend Pages Created**:
- **Partner Portal** (6 pages):
  - `PartnerLoginPage.jsx` - Partner login form
  - `PartnerDashboardPage.jsx` - Dashboard with stats, partner info, quick actions
  - `PartnerCatalogPage.jsx` - Add/edit catalog items with modal form
  - `PartnerStockTablePage.jsx` - Quick inline stock editing table
  - `PartnerBulkUploadPage.jsx` - JSON bulk upload with validation preview
  - `PartnerFulfillmentPage.jsx` - Fulfillment queue with status workflow
  - `PartnerSettlementsPage.jsx` - Settlement summary and transaction history
- **Admin Expansion** (2 pages):
  - `CountryPartnerApplicationsPage.jsx` - Review partner applications
  - `CountryLaunchConfigPage.jsx` - Configure country availability
- **Public** (1 page):
  - `CountryLaunchPage.jsx` - Waitlist signup + partner application forms

**Components Created**:
- `PartnerLayout.jsx` - Partner portal shell with sidebar navigation
- `partnerApi.js` - Axios instance with partner token handling
- `countryPreference.js` - Country/region localStorage helpers

**Security Verifications**:
- ✅ Fulfillment jobs strip all customer PII before returning to partners
- ✅ Public catalog hides base_partner_price and partner_id
- ✅ Partner auth uses separate JWT secret (PARTNER_JWT_SECRET)
- ✅ All endpoints validate partner ownership before data access

**Test Results**: 36/36 backend tests passed (100%), all 5 frontend pages verified

**Test Credentials**:
- Partner: demo@supplier.com / partner123 (Demo Supplier Co)
- Admin: admin@konekt.co.tz / KnktcKk_L-hw1wSyquvd!

---

## Pack 4: Partner Listings & Media + Excel/CSV Import Pack (COMPLETED)
*Completed: March 16, 2026*

**What was built**:
- Rich listing editor with Product/Service type selection
- Product family and Service family dynamic forms
- Media upload system for images and documents
- CSV/Excel bulk import with preview and validation
- Marketplace listings unified model
- Public marketplace detail page with related items

**Key Features**:
- ✅ Partner can create rich listings with SKU, name, descriptions, pricing
- ✅ Product/Service type selection with family-specific fields
- ✅ Image upload (JPG, PNG, WebP, GIF) with hero image selection
- ✅ Document upload (PDF, DOC, XLSX) for specs and catalogs
- ✅ CSV template download with example data
- ✅ Excel/CSV import with preview validation before commit
- ✅ Catalog page with tabs for Basic Catalog and Rich Listings
- ✅ Listing approval workflow (submitted → review → approved → published)
- ✅ Public marketplace detail page with related items

**New Backend Routes**:
- `/api/partner-listings` - Partner listing submission CRUD
- `/api/admin/marketplace-listings` - Admin marketplace management
- `/api/public-marketplace/*` - Public marketplace APIs
- `/api/media-upload/listing-media` - File upload for listings
- `/api/partner-import/*` - CSV/Excel import preview and commit

**New Frontend Pages**:
- `/partner/catalog/new` - Rich listing editor
- `/partner/catalog/:id/edit` - Edit existing listing
- `/partner/bulk-upload` - CSV/Excel import with preview
- `/marketplace/:slug` - Public product/service detail page

**Security Verified**:
- ✅ Public endpoints hide partner_id and base_partner_price
- ✅ File type validation prevents malicious uploads
- ✅ CSV import validates all required fields before commit
- ✅ Listings require admin approval before publishing

**Bug Fixed**: Empty images array caused IndexError when creating listing without images. Fixed by ensuring fallback to [None] when images array is empty.

**Test Results**: 25/25 backend tests passed (100%), all partner portal pages verified

---

## Upcoming Tasks

### Partner Approval & Marketplace Quality Pack (P1)
Admin dashboard for reviewing and approving partner submissions:
- Listing review interface with approve/reject actions
- Duplicate SKU/slug validation
- Richer marketplace filters and search
- Admin notes and feedback on rejections

### Final Live Readiness Pack (P1)
- Activate Resend with live API key
- Activate KwikPay with live credentials
- Full end-to-end QA test

### World-Class Affiliate Platform Enhancements (P2)
- Public affiliate application form
- Affiliate analytics dashboard
- Partner asset library

### Admin Notification Bell (P2)
- Real-time UI notification system for admins

---

*Last updated: March 16, 2026 - Partner Listings & Media Pack Complete*

