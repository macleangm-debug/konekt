# Konekt B2B E-Commerce Platform — PRD

## Product Vision
White-label, single-business-per-deployment B2B commerce platform with dynamic branding, margin protection, role-based access control, and sales performance management.

## Core Architecture
- **Frontend**: React + Tailwind + Shadcn/UI
- **Backend**: FastAPI + MongoDB
- **Payments**: Stripe (Sandbox)
- **Branding**: Dynamic via AdminSettingsHub → `/api/public/business-context`

## Roles
- Admin, Sales/Staff, Sales Manager, Finance Manager, Customer, Vendor/Partner, Affiliate

## What's Implemented (Complete)

### Phase 1 — Core Platform
- Multi-role auth (JWT), registration, login
- Product catalog, quote workflow, order pipeline
- Invoice generation & PDF export
- Payment proof upload + admin approval queue
- Vendor orders auto-generated on payment approval
- Strict payer/customer name separation
- Affiliate/referral system

### Phase 2 — White-Label & Branding
- Global de-hardcoding of "Konekt" references
- AdminSettingsHub: business profile, branding, notifications
- `/api/public/business-context` public endpoint
- `BrandingProvider` React context for dynamic brand loading
- PDF generation uses dynamic branding (logo, colors, footer)

### Phase 3 — Margin Protection & Discount Analytics
- Discount Analytics Dashboard (KPIs, Charts, Tables)
- Margin-Risk Engine: Safe/Warning/Critical classification
- Admin + Sales Discount Auto-Warning Overlays
- Configurable alert thresholds in Settings Hub → Discount Governance

### Phase 4 — Document Visual Review (Apr 9, 2026)
- Shared `DocumentFooterSection` (Bank Details, Signature, Stamp, Footer)
- Quote and Invoice preview pages use dynamic footer

### Phase 5 — Governance & Proactive Alerts (Apr 9, 2026)
- Admin Risk Behavior Alert System
- Admin sidebar cleanup: Discount Analytics, Delivery Notes, Purchase Orders
- Stripe E2E validated

### Phase 6 — Sales Performance Management (Apr 9, 2026)
- **Customer Service Rating**: 1-5 stars + optional comment on completed orders
  - One rating per order, stored as subdocument
  - "Remind me later" dismiss option on customer order detail
  - Duplicate prevention
- **Sales Dashboard**: Avg Rating KPI + Recent Ratings (negative highlighted with LOW badge)
- **Sales Leaderboard**: Balanced scoring (Deals 30%, Commission 30%, Rating 25%, Revenue 15% internal)
  - Revenue hidden from sales view (privacy)
  - Performance labels: Top Performer / Strong / Improving / Needs Attention
  - Current user highlighted

### Phase 7 — Admin Team Intelligence (Apr 9, 2026)
- **Admin Sales Ratings & Feedback Page** (under Reports & Analytics)
  - KPI row: Avg Team Rating, Total Ratings, Highest/Lowest Rated Rep
  - Ratings by Sales Rep table (name, avg, count, deals, last rated)
  - Low Rating Alerts (≤2 stars) with admin review + internal notes
  - Rating Trend chart (daily averages)
  - Recent Feedback (positive/neutral/negative sentiment borders)
  - Time filter (30/60/90/180/365 days)

### Phase 8 — Unified Access Model & Management Dashboards (Apr 9, 2026)
- **Role Infrastructure (Phase 1)**
  - Backend: `sales_manager` and `finance_manager` roles in UserRole enum + ROLE_PERMISSIONS
  - Admin login gate (server.py) allows manager roles
  - Frontend auth context (AdminAuthContext.js) validates manager roles
  - Manager users seeded on startup (sales.manager@konekt.co.tz, finance@konekt.co.tz)
  - Login flow: unified /login → /api/auth/login → konekt_admin_token → /admin redirect
  - `getDashboardPath` routes manager roles to /admin
- **Sidebar Role Filtering**
  - `adminNavigation.js`: each section has `roles` array
  - `AdminLayout.js`: `filteredNavigation` useMemo filters by `admin.role`
  - Empty groups removed after filtering
  - Admin sees everything; managers see permitted sections only
  - Sales Manager: Dashboard, Commerce, Customers, Team/Performance, Reports & Analytics
  - Finance Manager: Dashboard, Commerce, Finance, Reports & Analytics
- **Role Badge Colors**: teal (sales_manager), amber (finance_manager), red (admin)
- **Profile Dropdown**: Settings link hidden for non-admin roles
- **Sales Manager Dashboard (Phase 2)**
  - "Team Command Center" hero with teal gradient
  - KPI Row: Team Deals, Revenue (Month), Avg Rating, Pipeline Value, Critical Discounts, Low Ratings
  - Team Performance Table (per-rep: deals, revenue, pipeline, rating, commission)
  - Leaderboard with balanced scoring and performance labels
  - Pipeline Overview (horizontal bar chart by status)
  - Low Rating Alerts (≤2 stars with rep name, customer, comment)
  - Critical Discount Alerts (requests above threshold)
  - Quick Actions (Orders, Customers, Quotes, Sales Ratings)
  - Backend: GET /api/admin/dashboard/team-kpis
- **Finance Manager Dashboard (Phase 3)**
  - "Financial Control Center" hero with amber gradient + margin badge
  - KPI Row: Total Revenue, Collected, Pending Payments, Outstanding Invoices, Commission Payable, Net Margin
  - Cash Flow Trend chart (6 months: revenue in vs commissions out)
  - Payment Status distribution (pie chart with breakdown)
  - Margin Trend line chart (monthly margin %)
  - Invoice Status breakdown by status
  - Top Revenue Sources (top 5 customers by paid order value)
  - Commission Tracking (payable/paid/affiliate summary + per-rep table)
  - High-Risk Discounts (warning + critical threshold classification)
  - Quick Actions (Invoices, Payments, Orders, Discount Analytics)
  - Backend: GET /api/admin/dashboard/finance-kpis

### Phase 9 — Reports Hub / Decision Engine (Apr 9, 2026)
- **Business Health Report** (`/admin/reports/business-health`)
  - Executive overview: Revenue, Net Margin, Avg Rating, Total Orders, Pending Payments, Risk Score KPIs
  - 4 trend charts: Revenue, Margin, Rating, Discount Risk (6 months)
  - Active Alerts section (critical/warning/info)
  - Quick links to Financial, Sales, Customer Experience, Risk & Governance
  - Date filter (30/90/180/365 days), PDF + CSV export
- **Financial Reports** (`/admin/reports/financial`)
  - 4 tabs: Revenue, Cash Flow, Margin, Commission
  - 6 KPIs: Total Revenue, Revenue Month, Collected, Outstanding, Commission, Net Margin
  - Revenue trend (area chart), Cash flow (revenue vs commissions bars), Margin trend (line)
  - Commission by rep table, Commission trend chart
  - Top customers, Payment status breakdown (pie chart)
  - Date filter, PDF + CSV export
- **Sales Reports** (`/admin/reports/sales`)
  - 3 tabs: Performance, Conversion, Leaderboard
  - 6 KPIs: Total Deals, Revenue, Avg Rating, Conversion Rate, Active Reps, Pipeline
  - Team performance table (deals, revenue, pipeline, rating, commission)
  - Deals trend chart, Conversion chart (quotes vs orders + rate line)
  - Leaderboard with balanced scoring and labels (reuses existing engine)
  - Date filter, PDF + CSV export
- **Customer Experience** — Links to existing Sales Ratings page (`/admin/sales-ratings`)
- **Risk & Governance** — Links to existing Discount Analytics page (`/admin/discount-analytics`)
- **Sidebar role filtering**: Admin sees all 6 report links; Sales Manager sees Business Health, Sales, CX; Finance Manager sees Business Health, Financial, Risk
- **Export infrastructure**: `reportExportUtils.js` — branded PDF (jsPDF+autotable, logo, colors, footer, pagination), CSV (Blob download)
- Backend: 3 new endpoints in `admin_facade_routes.py` (`/reports/business-health`, `/reports/financial`, `/reports/sales`)

### Phase 10 — Inventory & Product Intelligence (Apr 9, 2026)
- **Inventory Intelligence Report** (`/admin/reports/inventory`)
  - 7 KPIs: Total Products, Units Sold, Revenue, Top Product, Fast Count, Slow Count, Dead Count
  - 4 tabs: Overview, Fast, Slow/Dead, Procurement
  - **Overview tab**: Top 10 Products bar chart (by revenue), Product Health pie chart (Fast/Moderate/Slow/Dead), Sales Trend line chart
  - **Fast tab**: Table of fast-moving products with units, revenue, orders, last sold, trend
  - **Slow/Dead tab**: Table with days inactive column, classification badges (Slow/Dead), trend arrows
  - **Procurement tab**: Restock Recommendations (fast + increasing demand), Review/Remove (dead + slow items), Top Vendors (high-performing), Underperforming Vendors (dead/slow products)
  - Classification: Fast (5+ orders or 10+ units), Moderate (default), Slow (30+ days inactive), Dead (60+ days or zero sales)
  - Trend detection: Increasing/Decreasing/Stable based on month-over-month unit comparison
  - Date filter (30/90/180/365 days), PDF + CSV export
  - Accessible by all management roles (admin, sales_manager, finance_manager)
  - Backend: `GET /api/admin/reports/inventory-intelligence`

### Integrations
- Stripe Payments (sandbox test key — working E2E)
- Resend Email (requires user API key)
- Twilio WhatsApp (requires user API key — not yet configured)

### Phase 11 — Automation & Leverage (Apr 9, 2026)
- **Weekly Performance Report** (`/admin/reports/weekly-performance`)
  - Executive Summary KPIs: Revenue, Orders, Margin, Avg Rating, Discounts, Net Profit
  - Sales Performance: Top Performers, Needs Attention, Total Deals, Pipeline Value, Conversion Rate
  - Risk & Alerts section (critical/warning alerts from the week)
  - Financial Summary: Collected, Pending Payments, Outstanding Invoices, Commission Payable
  - Customer Experience: Overall Rating with distribution chart + negative feedback highlights
  - Product Intelligence: Top Products, Dead Stock
  - Procurement Insights: Restock recommendations, Review/Remove suggestions
  - Action Recommendations: Priority-ordered week actions with severity badges
  - Week navigation (prev/next), Branded PDF + CSV export
  - Backend: `GET /api/admin/reports/weekly-performance?weeks_back=N`
- **Alert Dashboard / Action Center** (`/admin/reports/alerts`)
  - KPI Summary: Critical, Warning, Open, Resolved counts
  - Filter Bar: Severity, Type (rating/discount/delay/product/performance), Status
  - Priority-sorted alert cards (Critical > Warning > Info > Resolved, scored by priority_score)
  - Expandable card detail: Recommended Action, Entity info, Priority Score, Resolve button
  - Scan for Alerts button auto-generates from current system state
  - CSV export
  - Backend: `GET /api/admin/alerts`, `POST /api/admin/alerts/generate`, `POST /api/admin/alerts/{id}/resolve`
- Both pages nested under "Reports & Analytics" sidebar (not top-level)
- Accessible by admin, sales_manager, finance_manager roles

### Phase 12 — Global Micro-Interaction System (Apr 9, 2026)
- **Shared `interactions.css`** — Single source of truth for all interaction feedback
  - `k-btn-press`: Button press scale(0.97) at 100ms
  - `k-card-interactive`: Card hover lift translateY(-2px) + shadow at 140ms, active scale(0.98)
  - `k-row-interactive`: Table row hover highlight at 120ms
  - `k-page-fade-in`: Page/section fade-slide-up at 180ms
  - `k-tab-fade`: Tab content fade at 150ms
  - `k-backdrop-fade` + `k-drawer-panel`: Drawer transitions at 180-200ms
  - `k-spinner`: Inline loading spinner (600ms rotation)
  - `k-skeleton` + variants: Shimmer loading placeholders
  - `k-scale-in`: Modal/popover entrance
  - `k-notify-new`: Notification highlight
- **Enhanced Shadcn Button** — `loading` and `loadingText` props (opt-in), auto-spinner + disabled
- **Enhanced Shadcn Card** — `interactive` prop for hover lift + press scale
- **Enhanced SurfaceCard** — `interactive` prop
- **Enhanced MetricCard** — Auto-interactive hover on all metric cards
- **Enhanced TableRow** — Smooth 120ms hover transitions
- **Enhanced TabsTrigger** — 140ms active state transition
- **Enhanced TabsContent** — Fade animation on tab switch
- **Enhanced StandardDrawerShell** — k-backdrop-fade + k-drawer-panel (200ms)
- **Enhanced Sheet** — Timing reduced from 300/500ms to 200/200ms
- **Page Transitions** — All 4 layouts (AdminLayout, CustomerPortalLayoutV2, PartnerLayout, StaffLayout) wrap `<Outlet />` with `k-page-fade-in` keyed by `location.pathname`
- **Global native button feedback** — All native `<button>` elements get scale(0.97) active state
- Applied across all portals: Admin, Sales Manager, Finance Manager, Sales/Staff, Vendor/Partner, Customer

### Phase 13 — Welcome Notification + App Launcher + Notification Preferences (Apr 9, 2026)
- **Welcome Notification on First Login**
  - One-time welcome notification created on first successful login
  - Role-aware messages: Customer, Sales, Sales Manager, Finance Manager, Admin, Vendor, Partner, Affiliate
  - Uses existing bell notification system with timestamp + CTA + deep link
  - Duplicate prevention via `recipient_user_id` + `type: "welcome"` unique check
  - CTA links to correct dashboard per role (/account, /admin, /staff, /partner)
  - Backend: `_create_welcome_notification()` in server.py, integrated into both login endpoints
- **App Launcher** (`AppLauncher.jsx`)
  - Full-screen premium entry animation with exact Connected Triad logo SVG
  - Shows on EVERY website launch / hard refresh (in-memory React state, no sessionStorage)
  - Animation: 3 nodes fade+scale → connector lines draw → glow travel → wordmark fade → tagline fade → fade out
  - ~2.2s total duration, GPU-friendly (transform + opacity only)
  - Dark navy background (#0f172a), gold accent nodes (#D4A843), white secondary nodes
- **App Loader** (`AppLoader.jsx`)
  - Reusable branded loading component with pulsing triad + traveling glow
  - Sizes: sm (40px), md (64px), lg (96px), optional text message
  - Replaced generic spinners in 16+ pages: Admin Dashboard (2), Business Health, Sales, Financial, Inventory, Weekly Performance, Alert Dashboard, Customer Dashboard, Customer Profile, Customer Services, Customer Service Requests, Staff Sales Dashboard, Staff Workspace, Vendor Dashboard, Partner Dashboard
- **Notification Preferences System** (fully enforced)
  - Extended EVENT_CATALOG: 18 events (order updates, payments, alerts, reports, assignments, earnings)
  - Extended ROLE_DEFAULTS: 7 roles (customer, sales, sales_manager, finance_manager, vendor, affiliate, admin)
  - Enforcement: check → then send (not send → then filter)
    - `notification_dispatch_service.py` bridges to multichannel service
    - `in_app_notification_service.py` checks prefs before creating notification
  - Settings Hub → Notifications tab: System-Wide Notifications + Per-Event Preferences (APP/EMAIL/WA toggles)
  - Also accessible in: Customer MyAccountPageV2, Vendor Dashboard, Affiliate Profile
  - "Weekly Performance Report" toggle ready for scheduled delivery (Phase C)

### Phase 14 — UX Cleanup & Global Confirmation Modal System (Apr 9, 2026)
- **App Launcher Timing Refinement**
  - Slowed animation from ~2.2s to ~2.5s for more premium, deliberate feel
  - Nodes: staggered delays (50/300/550ms), 380ms duration
  - Connector lines: smoother draw (600ms, ease-in-out, delays 400/620/840ms)
  - Text: fade delays pushed to 1550/1850ms with 450ms duration
  - Glow: 1.3s dur, 1.0s begin
- **Interruptive Popup Removal** (complete deletion, not hiding)
  - Removed: ExitIntentPopup, PromoBanner, FirstOrderDiscountModal, CountrySelectorModal, ClientPromoStrip, ClientBannerCarousel
  - Country defaults to Tanzania ("TZ") in localStorage without modal
  - All associated files deleted, imports removed, event listeners cleaned up
- **Global Confirmation Modal System** (`ConfirmModalContext.jsx`)
  - Architecture: `ConfirmModalProvider` wraps entire app in App.js
  - `useConfirmModal()` hook exposes `confirmAction({ title, message, confirmLabel, cancelLabel, tone, onConfirm })`
  - Features: loading state, double-click prevention, backdrop blocks interaction, ESC closes (only when safe)
  - Tones: default (navy), danger (red), success (green), warning (amber)
  - Converted ALL 22+ `window.confirm()` calls across codebase
  - Converted all 4 old modal patterns (ConfirmActionModal, ConfirmationModal, useConfirmationModal)
  - All logout handlers (Admin, Staff, Partner, Customer, Legacy Navbar) now require confirmation
  - All delete/deactivate/approve/reject/convert actions use global modal
  - Zero `window.confirm()` remaining in codebase

### Phase 15 — Scheduled Weekly Report Delivery (Apr 10, 2026)
- **Backend Scheduler** (`services/scheduled_report_delivery.py`)
  - Lightweight asyncio background loop (60s check interval)
  - Default schedule: Monday 08:00 AM, Africa/Dar_es_Salaam timezone
  - Reads config from `admin_settings` collection (key: `report_schedule`)
  - Prevents duplicate deliveries (same ISO week check)
  - Generates executive snapshot: revenue, orders completed, avg rating, open alerts
  - Delivers via multichannel dispatch (respects per-user notification preferences)
  - Safe failure handling: logs errors, never crashes the app
- **Settings Hub: Report Delivery Tab**
  - Enable/disable toggle
  - Day of week selector (Mon-Sun)
  - Delivery time selector (24h, hourly)
  - Timezone selector (7 African/common timezones)
  - Recipient role toggles: Admin, Sales Manager, Finance Manager
  - "Deliver Report Now" manual trigger with confirmation modal
  - Last delivery status display (timestamp + recipient count)
- **API Endpoints** (added to `admin_settings_hub_routes.py`)
  - `GET /api/admin/settings-hub/report-schedule`
  - `PUT /api/admin/settings-hub/report-schedule`
  - `POST /api/admin/settings-hub/report-schedule/deliver-now`
- **Notification Integration**
  - Added `weekly_report` event to `NOTIFICATION_EVENTS` in `in_app_notification_service.py`
  - Added `EVENT_DEEP_LINKS` for report-specific deep links
  - In-app notifications deep link to `/admin/reports/weekly-performance?weeks_back=1`
  - Email/WhatsApp channels: placeholder ready for Resend/Twilio integration

## Backlog

### P1 — Upcoming
- Coaching System for Sales Team (flagging underperforming reps)
- Resend email integration for live report delivery (pending API key)
- Twilio WhatsApp integration for alert/report delivery (pending API keys)

### P2 — Future
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Mobile-first optimization
