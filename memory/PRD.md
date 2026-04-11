# Konekt B2B E-Commerce Platform — Product Requirements

## Core Vision
A B2B e-commerce platform with strict role-based views (Customer, Admin, Vendor/Partner, Sales) featuring quote management, payment processing, service task execution, and full operational data integrity.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor async)
- **Auth**: JWT-based custom authentication
- **Payments**: Stripe sandbox integration
- **Storage**: Emergent Object Storage for product images
- **Settings**: Central `settings_resolver.py` — single source of truth
- **Background Services**: Sales follow-up, weekly digest, scheduled reports

## Key Technical Principles
- **Single Source of Truth for Settings**: All engines read from `settings_resolver.py`
- **Strict Payer/Customer Separation**: Never fallback between them
- **Vendor Privacy**: Vendors ONLY see their own orders
- **Multi-Vendor Auto-Split**: Orders split by vendor on payment approval
- **No Horizontal Scrolling**: All admin tables use `table-fixed`
- **Customer Type Awareness**: Individual vs Business customers render differently

## What's Been Implemented

### Settings Centralization Audit (DONE — April 10, 2026)
- Central `settings_resolver.py` with 30s TTL cache
- Margin engine, commission engine, sales follow-up, affiliate commission all read from Settings Hub
- 3 new settings sections: operational_rules, distribution_config, partner_policy
- 14-tab Settings Hub frontend

### Salesperson Vendor Visibility (DONE — April 10, 2026)
- Sales order detail returns `vendor_orders` array with full vendor resolution
- Expandable VendorOrderCard components with clickable phone/email

### Vendor Specialization Fields (DONE — April 10, 2026)
- vendor_type, supported_services, preferred_partner, capacity_notes in partner model
- Classification badges and star icons in table

### Desktop Table Hardening (DONE — April 10, 2026)
- `table-fixed` on all admin tables, truncate on text cells

### Customer Company Conditional Rendering (DONE — April 11, 2026)
- Individual customers: Company field hidden in drawer profile, header, and summary card
- TIN/BRN hidden for individuals
- Company shows "Individual" in CRM Kanban drawer instead of "No company"

### CRM Kanban Text Wrapping (DONE — April 11, 2026)
- Card text uses truncate with title tooltips for company name, contact, assigned rep
- Stale indicators, follow-up dates, and values remain visible
- CRM Kanban cards are compact but readable

### Vendor Supply Review Restructuring (DONE — April 11, 2026)
- Drawer shows allocated_quantity and base_cost alongside product details
- Image gallery, vendor context, approve/reject actions all in drawer

### Marketplace Catalog Product Image Previews (DONE — April 11, 2026)
- ProductCardCompact resolves storage paths (konekt/products/...) to /api/files/serve/ URLs
- MarketplaceCardV2 same resolution with onError fallback
- Package icon placeholder when no image exists
- Consistent aspect ratio maintained

### Vendor Product Upload with Images (DONE — April 10, 2026)
- Drag-and-drop file upload, allocated_quantity, admin approval drawer with gallery

### Core Operations (DONE)
- Stripe sandbox, CRM Quote Builder, Full System Wiring Audit
- Automated Partner Assignment, Global Readability Hardening
- Category-Based Margin Rules, Sales Follow-Up Automation
- Weekly Operations Digest, Shared Drawer & Date Standardization

## Backlog (Prioritized)

### P1 (Next)
- Promotions & Affiliate Policy Restructure (settings-driven)
- Content Creator Media Visibility
- Admin business data config completion (logo, TIN, BRN, bank details)

### P2
- Weekly digest browser view
- Instant Quote Estimation UI

### Future
- Twilio WhatsApp / Resend Email (blocked on keys)
- AI-assisted Auto Quote Suggestions
- Advanced Analytics dashboard
- Mobile-first optimization

## Test Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Partner: `demo.partner@konekt.com` / `Partner123!`
