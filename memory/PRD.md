# Konekt - B2B Commerce Platform PRD

## Overview
Konekt is a premium B2B e-commerce platform for promotional materials, office equipment, and design services. Based in Dar es Salaam, Tanzania.

**Vision**: The biggest B2B branding platform in East Africa

---

## Governance Model

### Core Rule: Orders Created ONLY After Payment Approval

**Fixed-Price Products Flow:**
1. Customer adds products to cart
2. Checkout creates **Invoice** (no order yet)
3. Payment intent created (full or deposit)
4. Customer uploads payment proof (camera/file, no transaction reference)
5. Confirmation modal + single-click protection on submit
6. Finance/Admin reviews proof in Finance Queue
7. **On approval**: Order + Vendor Orders + Sales Assignment + Commissions created
8. On rejection: Invoice reverts to pending, customer can resubmit

**Multi-Service Request Flow:**
1. Customer selects multiple service lines (group + subgroup from taxonomy)
2. Enters shared brief/requirements
3. Submits bundled service request → lead created
4. Sales receives one lead with multiple service lines → prepares quote

**Multi-Promo Customization Flow:**
1. Customer selects multiple blank/promotional items
2. Chooses variants (color, size, quantity) per item
3. Enters one shared customization brief
4. Submits bundled customization request → lead created
5. Sales receives one lead with multiple line items

### Commission Model (Non-Margin-Touching)
- Price is built first: base cost + protected company margin + VAT
- Commission triggered ONLY after approved payment
- Commission calculated from commissionable pool (total amount)
- Affiliate commission: 5% default (configurable via admin)
- Sales commission: 3% default (configurable via admin)
- Both can coexist on same order (configurable)
- Minimum payout threshold: TZS 50,000 (configurable)

### Service Taxonomy (Admin-Managed)
Single source of truth for service groups and subgroups:
- Printing & Branding (9 subgroups)
- Creative & Design (10 subgroups)
- Photography & Videography (10 subgroups)
- Facilities Services (8 subgroups)
- Technical Support (8 subgroups)
- Business Support (6 subgroups)
- Uniforms & Workwear (6 subgroups)
- Promotional Materials (11 subgroups)

---

## Backend API Endpoints

### Payments Governance (`/api/payments-governance/*`)
| Endpoint | Description |
|----------|-------------|
| `POST /product-checkout` | Creates invoice only (no order) |
| `POST /invoice/payment-intent` | Creates payment intent |
| `POST /payment-proof` | Upload proof |
| `GET /finance/queue` | Pending proofs for finance review |
| `POST /finance/approve` | Approve -> creates order + commissions |
| `POST /finance/reject` | Reject with reason |

### Multi-Request (`/api/multi-request/*`)
| Endpoint | Description |
|----------|-------------|
| `GET /service-taxonomy` | Get all service groups with subgroups |
| `POST /service-group` | Upsert a service group |
| `DELETE /service-group/{key}` | Delete a service group |
| `POST /seed-service-taxonomy` | Seed taxonomy data |
| `POST /promo-bundle` | Multi-item promo customization request |
| `POST /service-bundle` | Multi-service bundle request |

### Referral + Sales Commission (`/api/referral-commission/*`)
| Endpoint | Description |
|----------|-------------|
| `GET /rules` | Get commission rules |
| `PUT /rules` | Save commission rules |
| `POST /affiliate/create` | Create affiliate with promo code |
| `GET /admin/affiliates` | Admin affiliates list with stats |
| `GET /affiliate/dashboard` | Affiliate performance dashboard |
| `POST /track` | Track referral events |
| `POST /trigger-after-payment-approval` | Create commissions |

### Payment Submission Fixes (`/api/payment-submission-fixes/*`)
| Endpoint | Description |
|----------|-------------|
| `POST /submit-payment` | Guarded payment submission |
| `POST /approve-payment-and-distribute` | Admin approve -> create order |
| `POST /affiliate-promo-benefit` | Save affiliate promo benefit |
| `GET /affiliate-promo-benefit` | Get affiliate promo benefit |

---

## Frontend Pages & Components

### Admin Pages
| Route | Component | Description |
|-------|-----------|-------------|
| `/admin/affiliate-manager` | AdminAffiliateManagerSimple | 3-tab: Affiliates, Commission Rules, Promo Benefit |
| `/admin/service-taxonomy` | ServiceTaxonomyAdminSetup | Manage service groups/subgroups |
| `/admin/service-leads` | ServiceLeadsCrmTable | CRM for promo+service leads |
| `/admin/finance-queue` | FinancePaymentsQueuePage | Approve/reject payment proofs |
| `/admin/orders` | AdminOrdersSplitViewV2 | Orders split view |

### Customer Pages
| Route | Component | Description |
|-------|-----------|-------------|
| `/account/marketplace` | MarketplaceUnifiedPageV3 | 3-tab marketplace with multi-builders |
| `/account/my-account` | MyAccount | Profile with addresses |

### Cart Flow Components
- `CartDrawerCompleteFlow` — 4-step cart (cart → checkout → payment → done)
- `LockedSavedDetailsSection` — Read-only saved details with "Change" toggle
- `ConfirmActionModal` — Payment submission confirmation modal
- `MultiPromoCustomizationBuilder` — Multi-item promo request
- `MultiServiceRequestBuilder` — Multi-service request with taxonomy dropdowns

---

## Credentials
| Account | Email | Password | URL |
|---------|-------|----------|-----|
| Admin | admin@konekt.co.tz | KnktcKk_L-hw1wSyquvd! | `/admin/login` |
| Customer | demo.customer@konekt.com | Demo123! | `/login` |
| Partner | demo.partner@konekt.com | Partner123! | `/partner-login` |

---

## Remaining Tasks

### P0
- [x] Apply konekt_real_patch_round3 (Table+Drawer UI, Branded Previews, Data Wiring)
- [x] Lock canonical invoice source (invoices_v2) - eliminated dual reads
- [ ] Configure Twilio WhatsApp credentials (awaiting user API keys)

### P1 - Launch Critical
- [x] UI Polish Pack
- [x] Checkout Flow
- [x] Sales Command Center + Quote Engine
- [x] Customer Account Unification
- [x] Customer Payment Flow
- [x] Final Commercial Flow Pack
- [x] Payments + Fulfillment Governance Pack
- [x] Admin Simplification + Payments Fixes Pack
- [x] Referral + Sales Commission Governance Pack
- [x] Payment Confirmation + Affiliate Promo Pack
- [x] Multi-Service + Promo Taxonomy Pack
- [x] Vendor sidebar cleanup (affiliate section removed for non-affiliate partners)
- [x] AI widget visibility (hidden on admin/vendor pages)
- [x] Unified BrandLogo system (one component, one sizing system, one placement rule)
- [x] Customer invoice drawer: branded preview, working PDF download, conditional pay button
- [x] Admin sidebar white shell (matching customer/vendor)
- [x] Admin tables: Payment Queue pattern (full-width table + right drawer, dates on left)
- [x] invoices_v2 archived — single `invoices` collection as canonical source
- [ ] Final Launch Verification Checklist
- [ ] Live payment gateway (KwikPay/Stripe)
- [ ] DNS/SSL setup

### P2 - Growth
- [ ] One-click reorder / Saved Carts
- [ ] AI-assisted quote suggestions
- [ ] Mobile-first optimization
- [ ] Advanced analytics
- [ ] Push notifications

---

## Invoice Consolidation (March 25, 2026)
- Canonical collection: `invoices` (NOT invoices_v2)
- All backend code uses `db.invoices` exclusively
- `collection_mode_service.py` always returns `db.invoices`
- Admin invoice route prefix changed from `/api/admin/invoices-v2` to `/api/admin/invoices`
- `invoices_v2` collection archived to `_archive_invoices_v2` (13 records, 2 migrated)
- Verified flows: product checkout, quote conversion, payment proof, payment approval, customer/admin invoice list

---

## Testing History
| Iter | Feature | Result |
|------|---------|--------|
| 99 | Admin Simplification + Payments Fixes | 100% |
| 100 | Referral + Commission + Payment Packs | 100% (27/27 backend) |
| 101 | Multi-Service + Promo Taxonomy + Cart Integrations | 100% (16/16 backend) |
| 108-110 | Backend Source-of-Truth Stabilization | 100% |
| 111 | Patch Round 3 + Invoice Consolidation + 6 Gates | 100% frontend, 94% backend |
| 112 | Unified BrandLogo System | 100% frontend |
| 113 | Final Stabilization: Invoice reversal + Admin UI alignment | 100% backend (19/19), 100% frontend (all 7 gates) |

*Last updated: March 25, 2026*
