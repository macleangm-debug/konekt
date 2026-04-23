# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: 346 ITERATIONS — 100% PASS RATE

---

## ALL FEATURES COMPLETE (Apr 17-20, 2026)

### Country Intelligence (Latest - Batch 10)
1. **Auto-detect user country** — Browser timezone → /api/geo/detect-country → auto-sets marketplace country (Africa/Dar_es_Salaam→TZ, Africa/Nairobi→KE, Africa/Kampala→UG)
2. **Admin Country Reports** — /admin/country-reports with period selector (week/month/quarter/year). Shows revenue, profit, margin, orders, quotes, invoices, new customers, outstanding — broken down by TZ/KE/UG. Export to JSON.
3. **Reports API** — GET /api/admin/reports/summary, /vendors, /customers with period and country params.
4. **Marketplace auto-detect** — On first load, detects user's timezone and auto-selects their country in the marketplace selector.

### Full Feature Manifest (24 Features, All Verified)
1. Dashboard Profit Tracking + Revenue & Profit dual-line chart
2. Admin-Only Credit Terms on Customer Profiles
3. Service Site Visit 2-Stage Flow
4. Statement of Accounts branded rendering
5. Multi-Country Config + Document Numbering
6. Order Status Restrictions (Sales blocked)
7. Quote Creation with branded live preview
8. Marketplace service cards fix
9. Go-Live Reset (Testing → Live mode)
10. Impersonate Users + Return Banner
11. "Customize this" CTA on products
12. Credit Terms at Checkout
13. Feedback/Issue Widget + Admin Inbox + Badge
14. Vendor-Category Assignments + Order Auto-Splitting
15. Number & Currency Format Settings
16. Admin Override Promo (all distributable margin)
17. Services in Quote Creation
18. Micro-interactions (card lift, button press, stagger)
19. Vendor Order Auto-Routing
20. Country Switcher (admin + marketplace)
21. Anti-Bot Protection (honeypot + timing + rate limiting)
22. Multi-Country Data Isolation (country_code on entities)
23. Country Expansion Pages (non-live markets)
24. Country Reports + Geo Auto-Detection

### Production Launch (Apr 21, 2026)
25. **Emergent badge hidden** for production (CSS override in index.html)
26. **Konekt Triad logo** enforced site-wide — all other logo variants deleted; only `konekt-triad-logo.svg`, `konekt-triad-icon.png`, `konekt-triad-full.png` remain
27. **Domain linked** — konekt.co.tz live via Zesha DNS (A records 162.159.142.117, 172.66.2.113 + CNAME www → konekt.co.tz, DNS-only)

### Group Deal Command Center (Apr 21, 2026)
28. **Expired deals auto-hide** from Deal of the Day (backend `deadline > now` filter + frontend fallback)
29. **Unified table + drawer UI** on /admin/group-deals — one single table (Product / Price / Progress / Buyers / Payments / Revenue / Status / Deadline), click row → drawer with full details and all actions (View buyers, Contact buyers, Push to Sales, Mark vendor paid, Cancel & refund)
30. **Lifecycle stages**: Live / Needs Decision / In Fulfillment / Closed tabs + red "Needs Decision" banner
31. **Commission engine for Group Deals** — 5% of margin (configurable per-campaign, defaults from settings), attributed via buyer's promo code → affiliate OR sales wallet, min payout floor TZS 50,000, credited on finalize
32. **P&L per finalized campaign** — revenue / vendor cost / margin / commissions / Konekt net profit
33. **Vendor payout tracker** — admin marks vendor paid with reference; status syncs to vendor's dashboard
34. **Group Deal vendor orders** — finalize creates an aggregated `vendor_order` (is_group_deal: true, no client details) that surfaces on vendor dashboard with amber "GD" badge
35. **Inline Approve** for payment_submitted buyers in the View Buyers modal (replaces old separate Pending Payments section)
36. **Contact Buyers modal** — WhatsApp bulk open, email BCC, copy phones/emails/message, template with {name} personalization
37. **Help (?) icon redesigned** — circular navy gradient button with float + pulsing aura + bouncing accent dot, respects prefers-reduced-motion

### Vendor Operations RFQ Workflow (Apr 21, 2026)
38. **Vendor-facing RFQ inbox** — new page `/partner/vendor/quote-requests` + sidebar link. Desktop table + mobile cards + drawer. 5 stat tabs (Awaiting/Quoted/Won/Lost/Expired).
39. **Vendor submits quote online** — base price, lead time, notes → lands in Ops review state (never auto-propagates)
40. **Vendor can decline** with reason
41. **RFQ auto-expiry** — checked on read; vendor quote marked `expired` if past `quote_expiry` or `sent_at + default_quote_expiry_hours`
42. **Notifications** — vendor gets notified on new RFQ sent + award/not-selected decision. Ops gets notified on vendor quote submission.
43. **Konekt pricing-engine reference** on each Ops quote card — shows Konekt expected sell price, min sell, margin % beside the vendor's base price, so Ops always compares against source of truth
44. **RFQ stats card** on vendor dashboard — "X quote requests awaiting you" with animated amber banner
45. **Competitor price isolation** — vendor only sees their own quote row; competitor prices never exposed

### Vendor Ops UX Overhaul — Task-First Design (Apr 22, 2026)
46. **Kanban board replaces the crammed RFQ table** — 4 columns (NEW / WAITING FOR VENDORS / PICK A WINNER / DONE) with colour-coded dots, progress bars, and a single stage-specific CTA per card
47. **Urgent "What needs me?" strip** at top — red when work pending (*"N quotes need a winner · N new to send"*), green ✓ *"All clear"* otherwise
48. **Plain-language vocabulary** — `prettyStatus()` helper maps internal statuses to plain English ("Waiting for vendors", "All quotes in", "Ready for customer", etc.)
49. **Wizard stepper for RFQ detail** — 5 steps (Details → Pick vendors → Wait for quotes → Pick a winner → Done). ONE decision visible per step, stepper bar at top shows progress at a glance
50. **Konekt-as-single-client model** — vendor-facing endpoints now scrub ALL end-customer identity:
    - `/api/vendor/orders` returns `client_name: "Konekt Operations"`, no customer_name/customer_phone/sales_name/sales_phone/sales_email
    - `/api/vendor/quote-requests` returns `requested_by: "Konekt Operations"` and sanitizes free-text notes (`_sanitize_for_vendor`) to strip phone/email patterns before showing
    - Vendor Order drawer UI now labels contact section "Konekt Operations (your client)" — no salesperson exposed
    - Dashboard job cards show "Konekt Operations" as client
51. **Step-specific UX**:
    - Step 2 shows vendor checklist with preferred-vendor badge + "Send Request →" primary CTA
    - Step 3 shows per-vendor status rail (Quoted ✓ / Declined / Waiting…) + collapsible manual entry
    - Step 4 shows big quote cards (BEST PRICE badge), inline Konekt sell/min sell/margin reference, huge "Pick this winner →" button
    - Step 5 shows emerald success screen with final numbers grid + **"Send to Sales →"** button that hands off to the assigned salesperson with notification

### Product SKU Foundation (Apr 22, 2026)
52. **Konekt SKU generator** (`services/sku_service.py`) — single source of truth
53. **Pattern**: `{PREFIX}-{COUNTRY}-{CATEGORY}-{RANDOM}` → `KNT-TZ-OEQ-A7K92M` — country-isolated for multi-country rollout
54. **Auto-derive category code** from category name with admin override option (Settings Hub → catalog → categories → code)
55. **Collision checking** — retries up to 5 times, falls back to extra random chars
56. **Vendor SKU separation** — every product row now has `sku` (Konekt-owned, auto) + `vendor_sku` (vendor's own, optional)
57. **Wired into all product creation paths**: admin catalog import, partner catalog create, partner bulk upload (with upsert-by-vendor_sku dedupe), vendor-ops direct-create
58. **Legacy format auto-upgrade** — if stored sku_format doesn't include `{COUNTRY}`, generator forces the new pattern

### Vendor Ops Quick Wins (Apr 22, 2026)
59. **Send to Sales handoff** — `/api/vendor-ops/price-requests/{id}/handoff-to-sales` flips status to `quoted_to_customer` and notifies the originating salesperson with a deep link to the quote builder
60. **Konekt suggests vendors** — `/api/vendor-ops/price-requests/{id}/suggested-vendors` scores vendors by preferred status + past wins + responsiveness + recent declines; UI chip in Step 2 lets Ops one-click pick the top recommendations
61. **Supply Review endpoint** — `/api/admin/vendor-supply/review-dashboard` now exists (was previously a 404). Returns products with health classification (critical/warning/healthy), specific issue list per product, margin % check, pricing integrity stats
62. **Konekt-as-client scrub** on vendor orders — no more end-customer/sales PII leaked through vendor-facing APIs

## Key Backend Routes (added this batch)
- `/api/vendor/quote-requests[/stats|/{id}|/{id}/respond|/{id}/decline]` (vendor-facing)
- `/api/admin/group-deals/campaigns/{id}/vendor-payout` (payout toggle + vendor-order sync)
- `/api/admin/group-deals/campaigns/{id}/broadcast[s]` (log outbound blasts)
- Ops `/api/vendor-ops/price-requests/{id}` now returns `pricing_references[]`

### Vendor Payables + QR Codes — Session 3A (Apr 22, 2026)
63. **Per-vendor `payment_modality`** — `pay_per_order` (default, new vendors) or `monthly_statement` (trusted). Stored on `db.partners` via ObjectId OR `db.users` (role:vendor) — dual-collection lookup via `_get_vendor_doc`.
64. **Admin Vendor Payables page** — `/admin/vendor-payables` (Payments & Finance sidebar). Tabs: Per-Order Payables / Monthly Statements / Modality Requests.  Filters by vendor/status/modality/country. Mark-paid modal captures payment reference.
65. **Monthly statement engine** — `POST /api/admin/vendor-payables/statements/generate` aggregates vendor_orders for end-of-calendar-month; idempotent per period, freezes when paid; notifies vendor.
66. **Vendor Payables UI** — `/partner/vendor/payables` with modality pill, outstanding total, "how to get paid" card; per-order + statements tabs; upload invoice (PDF/image) with invoice number.
67. **Modality requests** — vendors can request upgrade/downgrade from dashboard; admin approves/denies, auto-applies on approve.  Admin can also set modality directly per vendor.
68. **Vendor invoice storage** — local disk `/app/uploads/vendor_invoices/{vendor_id}/{orders|statements}/{uuid}.pdf` served via `/uploads` static mount.  20MB max; PDF + image accepted.
69. **QR Code service** — `GET /api/qr/{kind}/{id}` JSON info + `GET /api/qr/{kind}/{id}.png` (cached on disk at `/app/static/qr/`).  Supports product / group_deal / promo_campaign / content_post with canonical FRONTEND_URL deep links.  `QrCodeButton` component lives at `components/common/QrCodeButton.jsx` with download/copy/target-link actions. Wired into Group Deals drawer; ready to drop into products/promos/content.

### AI-Assisted Smart Import — Session 3B (Apr 22, 2026)
70. **`POST /api/smart-import/ai-parse`** — single endpoint handling four source kinds:
   - `source=pdf` — vendor PDF catalog (max 40 MB)
   - `source=image` — single catalog page photo (max 20 MB)
   - `source=photos` — up to 25 photos in one request (batch mode)
   - `source=text` — pasted-from-clipboard text (max 200k chars)
71. **Model**: Gemini 3 Flash (`gemini-3-flash-preview`, overridable via `AI_IMPORT_MODEL` env) with fallback to `gemini-2.5-pro` on failure.  Uses Emergent LLM key.  `emergentintegrations.llm.chat.LlmChat` with `FileContentWithMimeType` for PDF + images.
72. **Normalised output** — LLM is forced to return `{rows:[{name, vendor_sku, category, vendor_cost, stock, unit, description, brand}]}`.  Cleaner `_parse_rows()` strips fences, locates outermost JSON, drops blank rows.
73. **Session compatibility** — AI-parsed rows are persisted in `smart_import_sessions` with the SAME schema as uploaded-file sessions, so the existing wizard Steps 2–4 (column map → category map → commit) work unchanged.  The existing `/api/smart-import/commit` is source-agnostic.
74. **Frontend** — extended `SmartBulkImportPage.jsx` with a tab switcher at Step 1 (Excel/CSV vs AI Import).  The AI panel has a 2×2 grid picker (PDF catalog / Single image / Photo batch / Paste text), a context-aware file or textarea input, and a single "Extract with AI" CTA that funnels into the standard mapping preview.  Works in both `mode="admin"` and `mode="partner"`.

### Vendor Supply Agreement + Ops Onboarding + Impersonation — Session 4 (Apr 23, 2026)
75. **Konekt Vendor Supply Agreement** — 8-clause contract (v1.0) with vendor legal name, address, signatory + title + email fields.  Typed-name signature + case-sensitive match check + "I agree" checkbox + IP capture + timestamp.  Signed PDF rendered via reportlab (Konekt-branded), stored at `/app/uploads/vendor_agreements/{vendor_id}_{doc_id}.pdf`.
76. **Agreement guard (vendor portal)** — `PartnerLayout.jsx` calls `GET /api/vendor/agreement/status` on every partner-page mount; if unsigned and vendor is a product/hybrid partner, redirects to `/partner/agreement`.  Portal unlocks post-sign.
77. **Auth-gated PDF download** — `GET /api/vendor/agreement/pdf/{id}` (partner auth, verifies ownership) and `GET /api/admin/vendor-agreements/{id}/pdf` (admin).  Path is an /api/* route so it traverses the public ingress correctly.  Old `/uploads/vendor_agreements/...` path was broken (ingress 404).
78. **Vendor Documents tab** — `/partner/documents` lists signed agreements with download CTA.
79. **Admin Vendor Agreements page** — `/admin/vendor-agreements` shows stats (signed / coverage %) + signed-agreements table with search, PDF download, vendor name enrichment.
80. **Ops Impersonation — partner-token flow** — `POST /api/admin/impersonate-partner/{partner_id}` issues a PARTNER JWT (not admin token) so admin/ops can authenticate against `/api/vendor/*` endpoints.  Writes allowed (with explicit confirm on trigger).  Every session logged in `db.impersonation_audit` with reason, IP, user-agent, start/end timestamps.
81. **Impersonation banner** — full-width yellow banner with "Return to Admin" button (ends audit session via `POST /api/admin/impersonation-log/{audit_id}/end`); restores admin token from `admin_token_backup_v2`.  Handles both legacy admin-user and new partner impersonation.
82. **Impersonation Log page** — `/admin/impersonation-log` with total/active/unique-impersonator stats + search + duration calc.
83. **Ops Onboarding modal** — 3-step walkthrough (Daily Queue · Payables · Impersonation) with progress dots, CTA per step (opens relevant page), skip/back/next/finish.  Auto-opens once for admin/ops on first login, dismissed via localStorage.  Reopenable any time from the `HelpCircle` icon in the admin top bar.

### P2 Backlog Cleanup — Session 5 (Apr 23, 2026)
84. **Settings Hub → System-wide Notification Control** (`SystemNotificationControlPanel`) — grouped event catalog × 3 channels (in-app / email / WhatsApp).  Admin can globally toggle every event's channel, with group-level bulk on/off.  Lives inside both Notifications tab + Email Triggers tab.  Backed by `db.system_notification_config` (one doc per `event_key`); `dispatch_notification` honours it on top of per-user preferences (AND gate).
85. **Resend diagnostics** — `/api/admin/notification-system/resend-status` + `resend-test` endpoint; UI shows "Configured / Default domain / Not configured" with an "advice" copy and a 1-click "Send test email" box.  Production-live Resend is **configured** but currently sends from `onboarding@resend.dev` (Resend default sandbox domain).  Advised to verify `konekt.co.tz` in Resend dashboard and switch `RESEND_FROM_EMAIL=notifications@konekt.co.tz` before scaling.
86. **Agreement version bump** — admin can bump `AGREEMENT_VERSION` (persisted in `admin_settings`) which re-blocks every vendor until they re-sign.  New "Bump contract version" modal on `/admin/vendor-agreements`.
87. **Signed-agreement email** — Resend email with the signed PDF attached is dispatched to the signatory at sign time (best-effort, failures logged, do not block the sign response).
88. **Smart Import: download failed rows** — `/api/smart-import/failed-rows/{session_id}.xlsx` returns an Excel of every failed row + the original columns + a "Failure reason" column, ready to be fixed and re-uploaded.  Button on the Smart Import result screen.
89. **QR codes wired into admin UI** — `QrCodeButton` now surfaces on: Group Deals drawer, Admin Promotions table, Admin Content Studio item card (auto-kind by item type), Partner Catalog card.
90. **Wiring audit** — 37/37 admin nav links and 22/22 partner nav links resolve to a defined route in App.js (confirmed by a small static checker).
91. **Backend tests — 85/85 green** across Sessions 3A + 3B + 4 + 5.  Added `/app/backend/tests/test_session_5.py` (10 tests).

### Pre-Deployment Sweep — Session 6 (Apr 23, 2026)
92. **Country breakdown PDF export** — `GET /api/admin/reports/country-breakdown/pdf?period=month` generates a branded reportlab PDF with rollup summary + per-country table.  "Download PDF" button added to `/admin/country-reports`.
93. **Weekly digest email delivery** — `services/weekly_digest.deliver_digest` now emails the digest to every admin (via Resend) as well as creating the in-app notification.  Honours the `weekly_operations_digest` system kill-switch.  Degrades gracefully when `RESEND_API_KEY` is unset.
94. **Nudge unsigned vendors** — `POST /api/admin/vendor-agreements/nudge-unsigned` sends a templated email to every vendor who hasn't signed the current agreement version; logs `sent/failed/unsigned_count`.  Exposed as a button on `/admin/vendor-agreements`.
95. **QR codes on invoice / quote PDFs** — `pdf_commercial_documents.generate_commercial_document_pdf` now appends a footer with a Konekt-styled QR linking to the hosted document (`/invoice/{id}` or `/quote/{id}`).  Cached under `/app/static/qr/invoices|quotes/`.
96. **Backend tests — 90/90 green** across all sessions.  Added `/app/backend/tests/test_session_6.py` (5 tests).

### Live Launch — Darcity Seed + Production Polish (Apr 23, 2026)
97. **Darcity Promotion FULLY seeded on marketplace** — 616 real products scraped from `darcity.tz` across 37 sub-categories (Promo Pens, Wooden Trophies, Rubber Stamps, Awards, Glass Trophies, Garments, Laser Bottles, Tote Bags, etc.) now live on `/products` under the **Promotional Materials** branch. Each has a valid JPEG image + Konekt customer price (vendor cost × 1.35). All marked `is_customizable: false` so the card CTAs route to the detail page `/product/{id}` (not the designer) — which is what a buy-ready promo item should do.
98. **Product name normaliser** — `_clean_product_name()` strips leading 4-digit SKU codes ("2406 - Gold Silver Trophy" → "Gold Silver Trophy"), wraps trailing model codes in parens for differentiation ("Glass Trophies BXP14" → "Glass Trophies (BXP14)"), and strips lowercase noise codes ("Cleaning Kit hdp 5000" → "Cleaning Kit"). Baked into url_catalog_import for future scrapes; already applied to the 616 existing Darcity rows (67 names cleaned).
98. **Site-wide URL crawler** — `POST /api/admin/url-import/preview` gained:
    - `crawl_all_categories: bool` → auto-discovers every `/shop-list?Category=…` link from a site's homepage nav and scrapes each page. Gets **hundreds** of products in one call (avg 20/category × 37 categories = 616).
    - `branch: str` → forces the Konekt branch (e.g. "Promotional Materials") for every imported product, while preserving the vendor's own sub-category in `category`.
    - Works for any ASP.NET / WebForms shop that uses category-filtered URLs.
99. **URL Import UI upgrades** (`SmartBulkImportPage.jsx`): "Crawl all categories" checkbox, Konekt branch selector (Promotional Materials / Office Equipment / KonektSeries / leave as-is), max-pages control (disabled in crawl-all mode).
100. **Smart-Import commit → products upgrade** — when a URL-sourced session commits with `target="products"`, writes to `db.products` with `is_active=true`, `status=published`, `approval_status=approved`, `customer_price = vendor_cost × 1.35`, branch pulled from session. Fallback: if `category_mapping` yields nothing, the vendor's own label is used so products aren't saved without a category.
101. **Products API limit** — `/api/products` raised from 100 → 2000 rows so full-catalog imports surface on the marketplace.
102. **Test pollution purge** — new `POST /api/admin/maintenance/purge-test-pollution {confirm:"PURGE-TESTS"}` wipes TEST_/Demo leftovers from `vendor_product_submissions`, `catalog_products`, `partner_catalog_items`, `marketplace_listings`, `products`. Ran once: 65 rows deleted.
103. **Publish partner catalog to marketplace** — new `POST /api/admin/maintenance/publish-partner-catalog-to-products {partner_id, markup_multiplier, branch, confirm:"PUBLISH"}` idempotently promotes `partner_catalog_items` → `db.products` (matched by sku).
104. **Static /api/uploads mount** — images under `/app/uploads/` now served both at `/uploads/*` (internal) and `/api/uploads/*` (external) so the Kubernetes ingress surfaces them without going through the frontend. Fixed `StaticFiles(directory="uploads")` → absolute `/app/uploads`, and url_catalog_import now emits `/api/uploads/...` URLs.
105. **Blank vendor-agreement template PDF** — `GET /api/admin/vendor-agreements/template/blank.pdf` returns a clean 5 KB template PDF with blank signature/address fields. "Download blank template" button on `/admin/vendor-agreements` next to Nudge + Bump version, ready to share with prospective vendors.
106. **Component path fix** — `components/admin/settings/SystemNotificationControlPanel.jsx` had broken imports (`../ui/button`, `../../lib/api`) that broke React bundle compile on any page touching Admin Settings Hub. Corrected to `../../ui/button` + `../../../lib/api`.

### Taxonomy integration + image display fix (Apr 23, 2026)
107. **Full marketplace taxonomy wired up** — Darcity's 37 sub-categories are now registered under an official "Promotional Materials" category in `catalog_categories` (Products group). All 616 Darcity products carry `group_id`, `category_id`, and `subcategory_id` pointing at the proper taxonomy rows so the Settings Hub and `/marketplace` filter UI (Groups → Categories → Subcategories) all see them. No more orphan "branch" strings.
108. **Image display fix** — `/products` cards + `/product/{id}` detail page switched from `object-cover` to `object-contain` on a white background. Full products are visible (X-Banner Stand, Executive Desk Stand, etc.) — nothing cropped. Card height bumped to 56 (14rem) with 3rem inner padding.
109. **Crystal-clear product cards** — Only the "Promotional Materials" branch badge sits on the image (top-left). Subcategory chip, Exclusive star, price, and stock indicator all moved **below** the image in the card body so nothing obscures the product photo.
110. **Free long-tail SEO — dynamic sitemap.xml + robots.txt** — new `/api/seo/sitemap/regenerate` endpoint writes `/app/frontend/public/sitemap.xml` (served at `https://konekt.co.tz/sitemap.xml`) containing 808 URLs: 6 static pages, 616 product detail pages, 6 marketplace listings, 180 category filter URLs, 136 subcategory filter URLs. Auto-regenerated after every Smart-Import commit that publishes to the live marketplace. Includes robots.txt pointing crawlers to the sitemap, disallowing `/admin`, `/ops`, `/customize`, `/checkout`, `/cart`, `/account`, `/api`.
112. **Bulk Promo Tool (TZS-amount based)** — new `/admin/bulk-discounts` page + `/api/admin/promotions` endpoints. Apply a flat shilling discount (not %) across any slice of the catalog (group/category/subcategory/partner/SKU list). Flow: fill scope → hit "Preview impact" → see `products matched`, `current avg margin %`, `new avg margin %`, `margin lost in TZS`, `# products that would fall below cost`, and a sample list of before/after prices. Hit "Activate" and it sets `original_price = current`, reduces `customer_price` by the discount amount (rounded to nearest TZS 100/500), tags `active_promotion_id` + `active_promotion_label`. Configurable **margin floor %** (default 15%) auto-skips products that would violate it. End promo button restores original prices; `end_date` auto-expires via `expire_due_promotions()`.
113. **Customer-facing discount visibility throughout funnel** — when a product is on promo, the savings are visible on:
     - Marketplace card: red "Save TZS X" corner badge + strikethrough original price + red savings pill
     - Product detail: hero "Promo price" block with 4xl live price, strikethrough original, "You save TZS X today" subline, plus the Total row now shows "Your savings: TZS X"
     - Cart: strikethrough original unit price per line + "Save TZS X" chip under each item
     - Add-to-cart sends `original_unit_price` along so it survives the cart all the way to checkout
114. **Taxonomy cleanup** — merged 3 CoolTex variants ("CoolTex Polo", "Cooltex - Long Sleeves", "Cooltex - Women") into single "Cooltex" subcategory; 52 products repointed. Seeded 11 Office Equipment subcategories (Printers, Photocopiers, Scanners, Shredders, Laminators, Binding Machines, Projectors, Telephones & Intercoms, Calculators) + 10 Stationery subcategories (Paper, Notebooks, Pens & Pencils, Folders & Binders, Envelopes, Staplers & Punches, Adhesives & Tape, Markers & Highlighters, Desk Accessories, Filing Supplies). Sitemap now 822 URLs.
115. **JSON-LD product schema + meta tags for Google Shopping** — `/product/{id}` pages now inject full schema.org/Product JSON-LD (with Offer, priceCurrency=TZS, availability, brand, seller, promo referencePrice when active), Open Graph tags (og:type=product, og:image, product:price:amount), Twitter Card tags, and a canonical URL. Cleans up on route change. This unlocks Google's free "Shopping" rich results (image + price + stock visible directly in search).
116. **Consistent card height** — all product cards now render identical dimensions whether or not they're on promo. Fixed min-heights on title (3rem), subcategory row (1.25rem), and price block (3.25rem) so the discount UI elements don't cause jump/collapse. Tighter inter-row spacing (mb-2 instead of mb-3) across the card body.

### Deployment Notes (latest)
- `products` collection is the canonical marketplace feed (read by `/api/products`, limit 2000). `partner_catalog_items` is the vendor's private SKU list.
- Image URLs stored as `/api/uploads/...` — `/uploads/*` external requests hit the frontend and return HTML.
- Taxonomy is 3-level: catalog_groups → catalog_categories → catalog_subcategories. `/api/marketplace/taxonomy` returns the full tree for filters.
- **All services healthy**: backend RUNNING, frontend RUNNING, mongodb RUNNING.  Backend `/api/` responds 200.
- **Database migrations needed**: none.  All new collections (`system_notification_config`, `vendor_agreements`, `vendor_statements`, `vendor_modality_requests`, `impersonation_audit`, `smart_import_sessions`) are created lazily.

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
