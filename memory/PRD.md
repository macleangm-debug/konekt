# Konekt B2B E-Commerce Platform — Product Requirements

## Core Vision
A B2B e-commerce platform with strict role-based views (Customer, Admin, Vendor/Partner, Sales) featuring quote management, payment processing, service task execution, and full operational data integrity.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor async)
- **Auth**: JWT-based custom authentication
- **Payments**: Stripe sandbox integration
- **Storage**: Emergent Object Storage for product images
- **Background Services**: Sales follow-up automation, weekly digest scheduler, scheduled reports

## Key Technical Principles
- **Strict Payer/Customer Separation**: `customer_name` from account records ONLY, `payer_name` from payment proof ONLY.
- **Partner Data Access Control**: Service partners NEVER see client identity. Only logistics/distributor partners see delivery details.
- **Category-Aware Pricing Engine**: Partner cost -> Category margin rules (individual > default > global fallback) -> Selling price.
- **Automated Partner Assignment**: Auto-assigns by service_key capability or category fallback. Alerts on failure.
- **No Empty Tables**: Every table shows complete data or proper empty states.
- **Vendor Privacy**: Vendors only see their own orders, pricing, and Konekt sales contact.

## What's Been Implemented

### Core Operations (DONE)
- Stripe sandbox payment integration
- CRM Quote Builder Drawer
- Full System Wiring Audit (zero blank cells)
- Partner Data Access Control
- Quote <-> Service Task Auto-Linking
- Automated Partner Assignment & Unassigned Tasks Alert System
- Global Readability Hardening (typography, contrast)

### Vendor Product Upload with Images (DONE — April 10, 2026)
- **File Upload UI**: Drag-and-drop + file picker replacing text URL inputs
- **Object Storage**: Emergent Object Storage integration via `/api/files/upload`
- **Image Gallery**: Admin approval drawer shows image gallery with navigation arrows and thumbnails
- **Allocated Quantity**: Flows through vendor upload form → submission record → admin drawer → approved catalog product
- **Backend Validation**: Negative allocated_quantity rejected, invalid file types rejected
- **Multi-image support**: Up to 10 images per product, first = primary, rest = gallery
- **E2E Flow**: Vendor uploads product with images → Admin reviews in drawer → Approve/Reject inside drawer → Gallery images and allocated_quantity preserved in catalog

### Admin Product Approval (DONE — April 10, 2026)
- Vendor product submission via `/api/vendor/products/upload`
- Admin review page at `/admin/product-approvals` with summary cards, filter tabs, search
- **Drawer-based review** with image gallery, product details, approve/reject actions
- Individual approve/reject with confirmation modals
- Bulk approve/reject with checkbox selection
- Nested format normalization (product.product_name, supply.base_price_vat_inclusive -> flat)
- Vendor notification on approve/reject
- Approved products created in catalog with proper metadata

### Object Storage Integration (DONE — April 10, 2026)
- Emergent Object Storage via `file_storage.py`
- Upload: `POST /api/files/upload` (single), `POST /api/files/upload-multiple` (batch)
- Serve: `GET /api/files/serve/{path}` with caching
- DB tracking via `uploaded_files` collection
- 10MB max, JPEG/PNG/GIF/WebP/SVG supported

### Logistics Partner UI Extensions (DONE — April 10, 2026)
- PartnerLayout detects logistics/distributor/delivery partner types
- Simplified nav for logistics: Dashboard, Delivery Operations, Orders, Settlements
- Role-safe data access enforced

### Category-Based Margin Rules (DONE — April 10, 2026)
- Extended pricing engine with category-specific > default > global rules
- Admin CRUD endpoints for margin rules
- Preview endpoint for margin calculations

### Sales Follow-Up Automation (DONE — April 10, 2026)
- Background service running hourly
- Detects overdue follow-ups, stale leads, quotes awaiting response

### Weekly Operations Digest (DONE — April 10, 2026)
- Background scheduler with admin preview and manual trigger

### Shared Drawer & Date Standardization (DONE — April 10, 2026)
- Global `StandardDrawerShell` component with fixed scrolling/overlay
- `dateFormat.js` utility for canonical DD MMM YYYY, HH:mm formatting

## Backlog (Prioritized)

### P1 (Next)
- Salesperson Vendor Visibility (all assigned vendors + contacts in order detail drawer)
- Vendor Specialization Fields (type, categories, regions, capacity)
- Desktop Table Hardening (eliminate horizontal scrolling)
- Customer company conditional rendering
- CRM Kanban text wrapping
- Restructure Vendor supply review page
- Clarify Partner Ecosystem page

### P2
- Promotions & Affiliate Policy Restructure
- Content Creator Media Visibility
- Admin data entry config (system logo, TIN, BRN, bank details)
- Instant Quote Estimation UI

### Future
- Twilio WhatsApp integration (blocked on API key)
- Resend email integration (blocked on API key)
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization

## Key API Endpoints
- `POST /api/files/upload` — Upload image to object storage
- `GET /api/files/serve/{path}` — Serve uploaded file
- `POST /api/vendor/products/upload` — Vendor submits product (with images + allocated_quantity)
- `GET /api/admin/vendor-submissions` — Admin review submissions
- `POST /api/admin/vendor-submissions/{id}/approve` — Approve submission
- `POST /api/admin/vendor-submissions/{id}/reject` — Reject submission
- `POST /api/admin/vendor-submissions/bulk-approve` — Bulk approve
- `POST /api/admin/vendor-submissions/bulk-reject` — Bulk reject
- `GET /api/admin/category-margin-rules` — Category margin rules
- `GET /api/admin/digest/preview` — Weekly digest preview

## Test Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Partner: `demo.partner@konekt.com` / `Partner123!`
