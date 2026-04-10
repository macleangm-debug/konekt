# Konekt B2B E-Commerce Platform — Product Requirements

## Core Vision
A B2B e-commerce platform with strict role-based views (Customer, Admin, Vendor/Partner, Sales) featuring quote management, payment processing, service task execution, and full operational data integrity.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor async)
- **Auth**: JWT-based custom authentication
- **Payments**: Stripe sandbox integration
- **Storage**: Emergent Object Storage for product images
- **Settings**: Central `settings_resolver.py` — single source of truth for all platform config
- **Background Services**: Sales follow-up, weekly digest, scheduled reports

## Key Technical Principles
- **Single Source of Truth for Settings**: All engines (margin, commission, affiliate, follow-up, reports) read from `settings_resolver.py` which deep-merges `admin_settings.settings_hub` with `PLATFORM_DEFAULTS`. Cache TTL: 30s, invalidated on PUT.
- **Strict Payer/Customer Separation**: `customer_name` from account records ONLY, `payer_name` from payment proof ONLY.
- **Vendor Privacy**: Vendors ONLY see their own orders, pricing, and Konekt sales contact.
- **Multi-Vendor Auto-Split**: Orders split by vendor automatically on payment approval.
- **No Horizontal Scrolling**: All admin tables use `table-fixed` with `truncate` on text cells.

## What's Been Implemented

### Settings Centralization Audit (DONE — April 10, 2026)
- Created `services/settings_resolver.py` with `get_platform_settings(db)` and section-specific getters
- 30s TTL in-memory cache with `invalidate_settings_cache()` on PUT
- Wired margin engine, commission engine, sales follow-up, affiliate commission, business identity resolver to read from Settings Hub
- Added 3 new settings sections: `operational_rules` (date/time/thresholds), `distribution_config` (commission split %), `partner_policy` (assignment/logistics)
- Frontend: 14 tabs in Settings Hub including new "Operational Rules" and "Partner Policy" tabs

### Salesperson Vendor Visibility (DONE — April 10, 2026)
- `GET /api/sales/orders/{id}` now returns `vendor_orders` array with full vendor resolution
- Each vendor_order includes: vendor_name, contact_person, contact_phone, contact_email, items, status
- `SalesOrderDrawerV2` renders expandable `VendorOrderCard` components with clickable phone/email links
- Fixed UUID preservation (order.id no longer overwritten by ObjectId string)

### Vendor Specialization Fields (DONE — April 10, 2026)
- Added to partner model: `vendor_type`, `supported_services`, `preferred_partner`, `capacity_notes`
- Partner create/update endpoints accept and persist new fields
- `PartnerSmartForm` includes Vendor Classification dropdown and Capacity Notes textarea
- `PartnerUnifiedTable` shows vendor_type badges and preferred partner star icons

### Desktop Table Hardening (DONE — April 10, 2026)
- Applied `table-fixed` to: Admin Orders, Product Approvals, Affiliates, Sales Commissions, Partner tables
- Removed `min-w-[1100px]` horizontal scroll trigger from PartnerUnifiedTable
- Added `truncate` to text cells, column width percentages for fixed layouts

### Vendor Product Upload with Images (DONE — April 10, 2026)
- Drag-and-drop file upload calling `/api/files/upload`
- `allocated_quantity` field flows through entire pipeline
- Admin approval drawer with image gallery navigation

### Object Storage Integration (DONE)
- Emergent Object Storage via `/api/files/upload`

### Core Operations (DONE)
- Stripe sandbox payment integration
- CRM Quote Builder
- Full System Wiring Audit
- Automated Partner Assignment
- Global Readability Hardening
- Category-Based Margin Rules
- Sales Follow-Up Automation
- Weekly Operations Digest
- Shared Drawer & Date Standardization

## Backlog (Prioritized)

### P1 (Next)
- Customer company conditional rendering
- CRM Kanban text wrapping
- Vendor supply review restructuring
- Marketplace/public catalog product image previews

### P2
- Promotions & Affiliate Policy Restructure
- Content Creator Media Visibility
- Admin business data config completion (logo, TIN, BRN, bank details)
- Weekly digest browser view

### Future
- Instant Quote Estimation UI
- Twilio WhatsApp / Resend Email (blocked on keys)
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization

## Key API Endpoints
- `GET/PUT /api/admin/settings-hub` — Central settings CRUD
- `GET /api/sales/orders/{id}` — Sales order detail with vendor_orders
- `POST/PUT /api/admin/partners` — Partner CRUD with specialization fields
- `POST /api/files/upload` — Object storage upload
- `GET /api/admin/vendor-submissions` — Admin product review

## Test Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Partner: `demo.partner@konekt.com` / `Partner123!`
