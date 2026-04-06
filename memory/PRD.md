# Konekt B2B E-Commerce Platform — PRD

## Product Vision
B2B e-commerce platform for Konekt (Tanzania) with role-based portals (Admin, Customer, Vendor, Sales), CRM pipeline, marketplace, quoting, ordering, and fulfillment workflows.

## Core Architecture
- **Frontend**: React (CRA), Tailwind CSS, Shadcn/UI
- **Backend**: FastAPI (Python), MongoDB (Motor async driver)
- **Auth**: JWT-based with role-based access
- **Payments**: Stripe sandbox integration

---

## Completed Work

### Phases 1-21 — Core through Portfolio + Reactivation
Full platform: CRM, Orders, Quotes, Invoices, Vendor Margin, Notifications, KPIs, Stripe, Business Settings, Sales/Vendor Performance, Governance, Client Ownership, Portfolio + Reactivation.

### Phase 22 — Stock-First Vendor Assignment Engine (02 Apr 2026)
- Type-aware dispatcher: Product (stock-first), Promo (capability), Service (capability + performance)
- Atomic stock reservation via MongoDB findOneAndUpdate (prevents double-booking)
- Assignment decision audit trail with stored reasoning (not reconstructed)
- Admin endpoints: candidates preview, explain, decisions history

### Phase 23 — Dormant Client Alerts + Assignment Transparency UI (02 Apr 2026)
- Company-level dormancy rollup (activity across ALL contacts)
- Admin + staff (role-scoped) endpoints with summary, alerts, reactivation
- Actionable page: Open Client, Quote, Follow-up, Reactivate, Reassign
- Assignment reasoning in admin Orders drawer + full history page

### Phase 24 — Unified Vendor Onboarding + Catalog Workspace (03 Apr 2026)
**Country-Aware Vendor Onboarding:**
- Market context service: 6 markets (TZ/KE/UG/RW/NG/ZA) with phone prefix, currency, support info
- 5-step onboarding form: Market → Details → Role → Capabilities → Review & Invite
- Vendor role classification: product_vendor, promo_vendor, service_vendor, hybrid_vendor
- Marketplace permission enforcement: only product/promo/hybrid vendors can publish items
- Invite token flow: generate → validate → activate (email MOCKED until Resend configured)

**Unified Catalog Workspace:**
- Tabbed overview: Products, Services, Taxonomy, Vendor Supply, Imports
- Catalog stats endpoint with aggregated counts

**New API Endpoints:**
- `GET /api/admin/vendor-onboarding/markets`
- `GET /api/admin/vendor-onboarding/market-context/{country_code}`
- `GET /api/admin/vendor-onboarding/role-preview?capability_type=X`
- `POST /api/admin/vendor-onboarding`
- `GET /api/admin/vendor-onboarding/invites`
- `GET /api/vendor-invite/validate/{token}`
- `POST /api/vendor-invite/activate`
- `GET /api/admin/catalog-workspace/stats`

**New Frontend Routes:**
- `/admin/vendor-onboarding` — Multi-step vendor onboarding
- `/admin/catalog` — Unified catalog workspace

### Phase 25 — Product Upload, Variants & Bulk Import (03 Apr 2026)
**Taxonomy-driven Product Upload:**
- Single product upload with structural separation: product definition + vendor supply + variants
- All submissions land as `pending_review` — no live catalog items until admin approval
- Backend capability enforcement: service-only vendors blocked from product uploads
- Taxonomy filtering by vendor capabilities (group_ids/category_ids from vendor_capabilities)
- Image URL validation (max 10, primary image rule, valid URL format)

**Variant System:**
- Size/Color/Model dimensions per variant
- Per-variant SKU, quantity, optional price override, optional image URL

**2-Step Bulk Import (CSV/XLS/XLSX):**
- Step 1 (validate): Parse file → validate taxonomy → store validation session server-side
- Step 2 (confirm): Reference stored session → persist only valid rows as pending_review
- Prevents mismatch between preview and actual import
- Error highlighting per row with taxonomy mismatch detection

**Admin Vendor Supply Review:**
- View all vendor product submissions (pending/approved/rejected filter)
- Expand to see product details + variants + supply data
- Approve/Reject/Request Changes with notes
- View vendor import jobs with status tracking

**New API Endpoints:**
- `POST /api/vendor/products/upload` — Single product submission
- `GET /api/vendor/products/taxonomy` — Capability-filtered taxonomy
- `GET /api/vendor/products/my-submissions` — Vendor's own submissions
- `GET /api/vendor/products/my-submissions/{id}` — Specific submission
- `POST /api/vendor/products/import/validate` — Bulk import step 1
- `POST /api/vendor/products/import/{job_id}/confirm` — Bulk import step 2
- `GET /api/vendor/products/import/jobs` — Import job history
- `GET /api/vendor/products/import/jobs/{id}` — Import job detail
- `GET /api/admin/vendor-supply/submissions` — Admin list submissions
- `GET /api/admin/vendor-supply/submissions/{id}` — Admin get submission
- `POST /api/admin/vendor-supply/submissions/{id}/review` — Admin approve/reject
- `GET /api/admin/vendor-supply/import-jobs` — Admin list import jobs
- `GET /api/admin/vendor-supply/import-jobs/{id}` — Admin import job detail

**New Frontend Routes:**
- `/partner/product-upload` — Vendor Product Upload Page (5 sections)
- `/partner/bulk-import` — Vendor Bulk Import Page (3-step flow)
- `/admin/vendor-supply-review` — Admin Vendor Supply Review Page

### Phase 26 — Marketplace Publish + Admin Config Wiring + Sidebar Alignment (03 Apr 2026)
**Approved Product → Marketplace Publishing:**
- When admin approves a vendor submission, a canonical product record is created/updated in `products` collection
- Idempotent: re-approval updates existing product, no duplicate marketplace entries
- Canonical product visible in: marketplace search, account marketplace, product detail pages
- Product detail API hides vendor identity (vendor_id, vendor_name, vendor_product_code stripped)
- Product detail page with breadcrumb navigation (Marketplace > Category > Product)
- ProductCardCompact updated with "Detail" link to standalone product detail page
- Support for `primary_image` field alongside existing `image_url`

**Business Settings Wiring:**
- `business_settings_resolver_service.py` — provides identity/bank/currency/contact/footer blocks
- Statement of Account print header reads company name, TIN, BRN, address from business settings
- Business settings already consumed by: Quote Preview, Invoice Preview, Statement Print

**Sidebar Alignment:**
- Admin sidebar: "Supply Review" added under Catalog section
- Customer sidebar: "Services" link added between Marketplace and My Orders
- Customer sidebar: "My Statement" icon changed from Dashboard to ClipboardList

**New API Endpoint:**
- `GET /api/marketplace/products/{product_id}` — Public product detail (vendor identity hidden)

### Phase 27 — Public Marketplace Routing Fix (06 Apr 2026)
**Bug Fix: Public marketplace CTAs were routing into /account/* flow.**

Root Cause: `MarketplaceBrowsePageContent.jsx` "Order" button linked to `/account/marketplace/{id}` and was only visible to logged-in users. `MarketplaceListingDetailContent.jsx` had dead "Add to Cart" and "Request a Quote" buttons with no onClick handlers.

**Fix — Split ordering flows:**
- Public marketplace: "Add to Cart" → localStorage cart → `/cart` → `/checkout` → `/payment-proof`
- Account marketplace: "Add to Cart" → server cart → `/account/checkout`

### Phase 28 — Guest Commerce Flow (06 Apr 2026)
**Full guest cart + checkout + payment proof + account detection & linking.**

**Backend (routes/public_commerce_routes.py):**
- `POST /api/public/checkout` — creates real order in `orders` collection:
  - `is_guest_order: true`, `payment_status: pending_submission`, `order_status: awaiting_payment_proof`
  - Detects existing account by email/phone → auto-links via `linked_user_id`
  - Returns `order_number`, `bank_details`, and `account_info` (login vs create_account CTA)
  - Invites new users via `guest_checkout_activation_service`
- `POST /api/public/payment-proof` — creates `payment_proof_submissions` record:
  - `is_guest_submission: true`, validates `order_number + email` match
  - Updates order to `pending_review` / `awaiting_payment_verification`
  - Appears in same admin payment queue as account proofs
- `GET /api/public/order-status/{order_number}` — public order tracking

**Frontend:**
- Wrapped `PublicSiteLayout` with `CartProvider` (localStorage-based)
- Public marketplace CTAs: "Add to Cart" (all products, no login needed)
- Cart icon with badge in public navbar
- `/cart` — multi-item cart with quantity controls, remove, totals
- `/checkout` — contact form (name, company, email, phone, address) + order summary
- `/payment-proof` — payment proof form with order/email verification
- Success pages with account creation CTA at peak motivation moment

**Pipeline:**
- Guest orders enter same `orders` collection with same `order_number` format
- Payment proofs land in admin payment verification queue
- Sales queries filter `payment_status: verified` — no premature leakage
- After admin verifies payment → order enters sales → vendor assignment

---

- **Canonical Products:** Approved vendor submissions materialize into the `products` collection — the single source of truth for marketplace, cart, and order flows.
- **Vendor Role Policy**: product/promo vendors → marketplace access. Service vendors → task-only.
- **Country-Aware Defaults**: Phone prefix, currency, tax labels adapt to selected market.
- **Stock-First Assignment**: Product orders prioritize vendors with pre-allocated stock.
- **Stored Reasoning**: Assignment decisions persist engine/candidates/reason.
- **Company-Level Dormancy**: Corporate dormancy evaluated by rolling up all contacts' activity.
- **Invite Token Flow**: MOCKED email → vendor creates password via activation URL.
- **Business Settings Resolver**: Single source of truth for company identity across quotes, invoices, statements, footer/contact blocks.

### Phase 29 — Unified Notification System (06 Apr 2026)
**DB-backed notification engine with Resend email integration (dry-run until API key configured).**

**Backend:**
- `NotificationService` with dispatch pipeline: trigger check → template render → send/dry-run → log
- 4 event triggers: `customer_order_received`, `customer_payment_proof_received`, `customer_payment_verified`, `admin_payment_proof_submitted`
- DB collections: `notification_settings`, `notification_provider`, `notification_templates`, `notification_logs`
- Admin CRUD routes: settings, trigger toggles, provider config, template management, test dispatch, logs
- Hooks injected into: `public_commerce_routes.py` (checkout, payment proof), `payment_proof_routes.py` (approval)
- All triggers default to OFF. Dry-run mode logs dispatch without sending.

**Frontend:**
- `NotificationSettingsPage` at `/admin/notification-settings`
- Tabs: Triggers (toggle on/off), Email Provider (sender config), Test Dispatch (send test emails)
- Expandable logs section showing recent dispatch attempts with status badges
- Wired into admin sidebar under Configuration section

**New API Endpoints:**
- `GET /api/admin/notifications/settings`
- `POST /api/admin/notifications/settings/seed`
- `PUT /api/admin/notifications/settings/trigger`
- `PUT /api/admin/notifications/settings/provider`
- `GET/PUT /api/admin/notifications/templates`
- `POST /api/admin/notifications/test`
- `GET /api/admin/notifications/logs`

### Phase 30 — Payment Flow UX Polish (06 Apr 2026)
**Polished the unified 3-stage /checkout page (Pack 1):**

- Bank Details UI: Rich visual block with bank name, account name, account number, branch, SWIFT, currency from canonical `/api/public/payment-info`
- Copy buttons on all bank detail fields + payment reference
- Highlighted payment reference block with order number
- Payment instructions + "what happens next" messaging
- Admin verification note ("payment verified before processing")
- Drag-and-drop file upload for payment proof (images: JPG/PNG/WebP, PDF, max 10MB)
- File preview (image thumbnails, PDF icon), upload progress bar, error/retry states
- New backend endpoint: `POST /api/public/upload-proof-file` for file uploads
- Post-proof account CTA: "Log in" (if account exists) or "Create account" (if not) — shown ONLY after successful proof submission
- Step bar labels: Cart → Details → Payment & Proof
- Order summary stays visible at all stages
- Mobile-first stacked layout

### Phase 31 — Landing Page Upgrade (06 Apr 2026)
**High-converting landing page (Pack 2):**

Sections (in order):
1. Hero: "Order Business Supplies, Printing & Services — Fast, Verified, and Fully Managed" + Browse Products / Request a Quote CTAs
2. How It Works: 4 steps (Browse or Request → Place Order & Pay → We Verify & Assign → Delivery & Tracking)
3. Trust Signals: Verified Vendors, Payment Verification, Dedicated Support
4. Featured Categories: Office Equipment, Office Stationery, Promotional Materials, Business Services (linked to marketplace)
5. Testimonials: 3 business quotes
6. Payment Trust Block: "Your payment is verified before any order is processed"
7. CTA Section: "Ready to Place Your Order?" with dual CTAs

### Phase 32 — Footer + Content Pages (06 Apr 2026)
**Full footer structure and legal/help content (Pack 3):**

- Footer enhanced to 5 columns: Brand, Marketplace, Company, Business, Contact
- Company column: About Konekt, Help Center, Privacy Policy, Terms of Service, Contact Us
- Bottom bar: Privacy + Terms quick links
- `/privacy` — Privacy Policy page
- `/terms` — Terms of Service page
- `/help` — Public Help Center with FAQ accordion (Ordering, Payment, Delivery, Account sections)
- `/about` — Already existed, validated

### Phase 33 — Marketplace UX Pack (06 Apr 2026)
**Vendor language removal + Mobile filters + VAT parity:**

**A. Vendor Language Removal (Global Sweep)**
- Replaced ALL customer-facing vendor/supplier terminology with safe alternatives
- Pages cleaned: Landing page, Privacy Policy, Terms of Service, Help Center, Product Detail, Testimonials, Expansion Landing
- Safe replacements: "supply network", "fulfillment network", "fulfillment partners", "verified sourcing"
- Zero vendor language remaining in any public page/component

**B. Mobile Filter Drawer**
- Desktop (lg+): Keeps existing inline 5-column filter rail (search, group, category, subcategory, sort)
- Mobile (<lg): Horizontal bar with [Filter] + [Sort] buttons + result count
- Bottom sheet drawer opens on Filter tap with Group/Category/Subcategory selects
- Sort dropdown on Sort tap
- Selected filter chips visible on both viewports with "Clear all" button
- No route changes

**C. VAT Parity (Canonical Pricing)**
- Created `checkout_totals_service.py` — single source of truth for subtotal + VAT + total
- Guest checkout now applies 18% VAT (same as account checkout)
- `GET /api/public/payment-info` now returns `vat_percent`
- `POST /api/public/checkout` response now includes `subtotal`, `vat_percent`, `vat_amount`, `total`
- Account checkout reads VAT from same canonical source (`/api/public/payment-info`)
- OrderSummary displays: Subtotal, VAT (18%), Total on all stages

## Backlog

### P1 — Upcoming
- End-to-end Stripe test with real test cards
- Conversion-focused product detail page

### P2 — Future
- Twilio WhatsApp/SMS notifications (blocked on keys)
- One-click reorder / Saved Carts
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization

---

## Test History
- Iterations 165-170: Phases 17-21 — 100%
- Iteration 171: Stock-First Vendor Assignment Engine — 100% (22/22)
- Iteration 172: Dormant Client Alerts + Assignment Transparency — 100% (16/16)
- Iteration 173: Vendor Onboarding + Catalog Workspace — 100% (20/20 + UI)
- Iteration 174: Product Upload, Variants & Bulk Import — 92% (23/25 + frontend 100%)
- Iteration 174b: Added Download CSV Template + Download Error Rows to Bulk Import (vendor + admin)
- Iteration 175: Marketplace Publish + Admin Config + Sidebar Alignment — 100% (19/19 backend + frontend 100%)
- Iteration 176: Phase 26 Cleanup & Canonicalization — 100% (15/15 backend + frontend 100%)
- Iteration 177: Full E2E Order Flow Test (Customer → Sales → Vendor) — 100% (13/13 backend + 6/6 frontend)
- Iteration 178: Public Marketplace Routing Bug Fix — 100% (12/12 backend + 8/8 frontend)
- Iteration 179: Guest Commerce Flow (Cart + Checkout + Payment Proof + Account Linking) — 100% (17/17 backend + 8/8 frontend)
- Iteration 180: Unified 3-Stage Checkout Flow (Details → Payment & Proof → Confirmation) — 100% (15/15 backend + 35/35 frontend)
- Iteration 181: Notification Settings E2E — 100% (11/11 backend + all frontend verified)
- Iteration 182: Checkout Flow Pack 1 Polish — 100% (19/19 backend + all frontend verified)
- Iteration 183: Landing Page + Footer + Content Pages — 100% (16/16 frontend verified)
- Iteration 184: Vendor Language Removal + Mobile Filters + VAT Parity — 100% backend, 90% frontend (VAT display fixed post-test)
