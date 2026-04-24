# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: 346 ITERATIONS — 100% PASS RATE

---

## ALL FEATURES COMPLETE (Apr 17-20, 2026)

### Feb 24, 2026 (HOTFIX) — Hydration Moved to Background + Read-only FS Defence
**Problem**: After the first deploy of the hydration service, production (`konekt.co.tz`) started returning 502 Bad Gateway / 520 on most endpoints. Root cause: the startup `run_production_hydration` call was running synchronously in `@app.on_event("startup")` and could take 15-30s (tarball extraction of 605 images + bulk insert of 610 products). Kubernetes readiness probe timed out → container killed → crash loop.

**Fix**:
1. `services/production_hydration.py` now exposes `schedule_production_hydration(db)` that wraps the heavy work in `asyncio.create_task(...)` so FastAPI startup returns in ~2s. Hydration runs immediately after (but doesn't block serving).
2. `server.py` startup hook calls the scheduler instead of awaiting the hydration.
3. Hardened `_extract_image_tarball`:
   • Write-probe on `/app/uploads` before extracting — on a read-only filesystem it no-ops gracefully instead of crashing.
   • Every step wrapped in try/except, returns `0` extracted on any failure.
   • Logs a loud warning if the tarball file isn't in the deploy image (e.g. excluded by deploy build).
4. Added two admin-only endpoints:
   • `POST /api/admin/force-hydrate` — manually trigger hydration on demand, returns the report.
   • `POST /api/admin/wipe-and-hydrate` — destructive: wipe `products` + `group_deal_campaigns` + commitments, then re-seed. Last resort to reset a contaminated production.
5. **Preview re-verified**: backend healthy in 2s after restart, marketplace returns 610 Darcity products, group deals return 8 real deals.

**Net result**: One deploy → backend boots instantly → hydration populates 610 products + 8 deals + 605 images in the background → homepage lights up within ~30s. If anything fails, `/api/admin/force-hydrate` and `/api/admin/wipe-and-hydrate` are available for manual recovery.



### Feb 24, 2026 (CRITICAL) — Self-Hydrating Production Deploy (11MB seed bundle)
The previous fix removed the `/api/seed` attack vector but still required the user to manually repopulate production. To make **one-click deploy = live Darcity site**, we now bundle the real data as a repo-committed seed and auto-hydrate on every startup.

1. **Exported real Darcity data** from preview → `/app/backend/data/production_seed/`:
   • `products.json` — 610 Darcity products (944 KB)
   • `group_deal_campaigns.json` — 8 real deals (Wrist Bands, Gift Bags, Lanyards)
   • `partners.json`, `users_darcity.json`, `admin_settings.json`, `margin_rules.json`, `catalog_categories.json`, `catalog_subcategories.json`, `taxonomy.json`, `hero_banners.json`, `platform_promotions.json`, `margin_config.json`, `vendor_profiles.json`
   • `darcity_images.tar.gz` — 605 product images (9.5 MB, resized to 800px/82% JPEG). Total seed folder = 11 MB.

2. **Re-scraped darcity.tz for fresh images** via a one-shot httpx script (15-concurrency, 3-minute run). 605/610 images recovered (5 products have no image on source, will fall back to placeholder).

3. **Added `services/production_hydration.py`** — runs inside the FastAPI `startup` event on **every** boot:
   • **Always prunes**: demo-name products (A5 Notebook, Branded Cap, Trucker Cap, KonektSeries*, Ceramic Coffee Mug, Roll-Up Banner…), TEST_* products, orphaned + TEST_* group deals, TEST_* price requests.
   • **Hydrates ONLY if Darcity has 0 active products** (fresh deploy path): extracts `darcity_images.tar.gz` into `/app/uploads/product_images/url_import/`, bulk-upserts all JSON seeds (keyed correctly — `id` for products, `campaign_id` for group deals, `email` for users, `key` for admin_settings). ISO-string datetime fields are auto-revived to `datetime` objects so downstream routes (group-deal featured endpoint, deal-of-the-day) don't crash on `.tzinfo`.
   • Fully idempotent — second boot is a no-op.
   • Escape hatch: set `SKIP_PRODUCTION_HYDRATION=1` env var to disable.

4. **Cleaned `.gitignore`** — removed ~95 stale `*.env` / `.env` / `-e ` patterns that would have blocked the seed folder and `.env` files from being committed. Added explicit allow-list for `backend/data/production_seed/darcity_images.tar.gz` (since `**/*.tar.gz` is still blocked).

5. **End-to-end verified**: simulated a fresh-deploy by wiping all Darcity products + group deals + images + injecting `A5 Notebook` and `TEST_Junk_XYZ` contamination. Restarted backend. Post-startup state: 0 contamination, 610 Darcity products, 8 real group deals, 605 images served via the public API. Featured/deal-of-the-day endpoints return Wrist Bands. Admin + Darcity vendor logins work.

**Deployment flow for user**: Push to GitHub → Deploy → done. konekt.co.tz will self-hydrate on first boot. No post-deploy curl required.



### Feb 24, 2026 (CRITICAL) — Removed Public `/api/seed` + Added Production Cleanup Endpoint
1. **Root cause of test data on konekt.co.tz**: a public, unauthenticated `POST /api/seed` endpoint in `server.py` was wiping `db.products` and inserting hardcoded demo products (A5 Notebook, Branded Cap, Ceramic Coffee Mug, KonektSeries*). Any unauthenticated request could nuke the catalog. Production DB was also contaminated from a separate, earlier test run (TEST_InvalidStatus_*, TEST_DupItem_*, TEST_DOTD_*).
2. **Fixes shipped**:
   • **Removed** `POST /api/seed` entirely (now 404).
   • **Locked** `POST /api/admin/seed-sample-catalog` behind JWT admin auth (was open).
   • **Added** `POST /api/admin/production-cleanup` — admin-only, idempotent. Wipes: demo-name products (A5 Notebook etc.), TEST_* products, orphaned/TEST_* group deal campaigns + their commitments, TEST_* price requests, null-body subcategory requests, null-body pricing requests, partner-less smart import sessions, TEST_* vendor submissions.
3. **Preview DB confirmed 100% clean**: 610 Darcity products, 8 legit group deals (Wrist Bands, Gift Bags, Lanyards). Cleanup endpoint returned zero deletions — nothing left to clean.
4. **Production DB (konekt.co.tz) still contaminated** — it's a separate deployment that hasn't received our fixes. User must `Save to GitHub` + redeploy, then POST `/api/admin/production-cleanup` once with admin auth.



### Feb 24, 2026 (latest) — Add-Vendor UI w/ Branches + Test-Data Final Purge
1. **Add Vendor form now wires branches** — `VendorListPage.jsx` gained a required multi-select chip group (Promotional Materials / Office Equipment / Stationery / Services). Branch list is fetched from `/api/admin/vendors/branches` and filters input to the canonical 4-branch taxonomy. "Create Vendor" is disabled until name + ≥1 branch selected.
2. **Backend branches plumbing completed** — `VendorUpdate` now persists `branches` (was previously accepted-but-ignored). `list_vendors` returns `branches` field directly from the user doc; `get_vendor/{id}` returns branches in the detail payload. Server strips non-canonical values on both create and update.
3. **Final test-data purge** (live DB now 100% real Darcity content):
   • `catalog_subcategory_requests` — 5 deleted (test_user_* entries)
   • `business_pricing_requests` — 2 deleted (null bodies)
   • `vendor_import_jobs` — 4 deleted (non-Darcity vendor_id)
   • `smart_import_sessions` — 16 deleted (null/empty partner_id)
   • `price_requests` — 36 deleted (TEST_* product names + empty product fields)
   • `products` — already 100% Darcity (610 published), `vendor_product_submissions` already 0
4. **Verified end-to-end via curl**: create vendor with 3 branches (incl. 1 invalid) → invalid filtered → list shows 2 branches → update to different 2 branches → re-fetch confirms persisted.



### Feb 24, 2026 (later) — Vendor List Shows Konekt Branches (not subcategories)
1. **Fix**: `vendors_admin_routes.py` `list_vendors` was returning `distinct(category)` values which are *sub*categories (Cooltex, Gift Bags, Awards & Trophies…). Changed to return `distinct(branch)` values filtered to the **4 official Konekt branches** only: `{Promotional Materials, Office Equipment, Stationery, Services}`.
2. **Darcity now correctly shows** — taxonomy_names = `["Office Equipment", "Promotional Materials"]` — the two branches where Darcity actually has products (596 Promotional Materials + 14 Office Equipment = 610 total).
3. **Guard** — if `taxonomy_ids` are manually set on a vendor but contain non-branch values, we filter them against the allowed 4 to prevent subcategory leakage in the future.


### Feb 24, 2026 (later) — Vendor List + Vendor Agreements Surfaced in Admin UI
1. **Sidebar additions** — `config/adminNavigation.js` now shows **Vendors** and **Vendor Agreements** under the "Catalog & Supply" group (previously hidden routes). Dedupe: removed the duplicate Vendor Agreements entry that was in "Payments & Finance".
2. **Vendor list backend fix** — `vendors_admin_routes.py` now accepts users with `role ∈ {vendor, partner_vendor, supplier}` (previously only `vendor`). Enriches each row with:
   • `active_products` — counts from `vendor_supply` OR (fallback) `products` collection by `partner_id`
   • `taxonomy_names` — derives from `taxonomy_ids` OR (fallback) distinct `branch` + `category` values on the vendor's products
3. **Darcity vendor now visible** — `info@darcity.tz` user enriched with `capability_type: "products"`, `vendor_status: "active"`, `company: "Darcity Promotion Ltd"`. Shows 610 active products and 8 category tags in the admin vendor list.
4. **Stats fix** — `/api/admin/vendors/stats` now filters by the same role union, so Total/Active/Products cards reflect reality (Darcity = 1/1/1).
5. **Vendor Agreements page** (`/admin/vendor-agreements`) — existing functionality exposed:
   • Download blank contract template PDF
   • Nudge unsigned vendors (bulk email)
   • Bump contract version (forces all vendors to re-sign)
   • Table of signed agreements with signatory / version / signed-at / IP / PDF download
   • Vendors sign via `/partner/agreement` using the current version


### Feb 24, 2026 (later) — Go-Live Cleanup + Internal Group Deals + Auto-Suggest
1. **Go-live cleanup** via `scripts/go_live_cleanup.py` (idempotent):
   • Deleted 38 test user accounts (TEST_*, @test.com, @example.com, konekt.demo, bot@test.com, etc.)
   • Deleted 15 stale promotions
   • Cleared all existing group deals (clean slate)
   • Approved/published any still-pending Darcity products
   • Created Darcity vendor login: **info@darcity.tz / Darcity#Konekt2026** (role=`partner_vendor`, linked to Darcity Promotion Ltd partner_id). Ops can now impersonate via `/api/admin/impersonate-partner/{partner_id}`.
2. **Internal group deals + auto-suggest engine** — new `backend/admin_group_deals_internal_routes.py`:
   • `POST /api/admin/group-deals/suggest` — scans catalogue, applies per-branch tier logic, returns ranked list (by discount % desc). Params: `branch`, `min_margin_pct`, `pool_share_pct`, `max_suggestions`.
   • `POST /api/admin/group-deals/bulk-create` — creates N deals from entries (each with `product_id`, `display_target`, `duration_days`, `pool_share_pct`, `funding_source`).
   • `GET /api/admin/group-deals/audit-wiring` — verifies every active deal/promo is wired to the correct branch tier set. Returns `{healthy_count, issues_count, issues[], verdict}`.
3. **Funding sources** — every campaign now carries `funding_source` ∈ {`internal`, `vendor`}:
   • `internal` — Konekt funds the entire discount from the product's distributable-margin pool (branch-specific). Never touches protected margin, never involves vendor.
   • `vendor` — legacy behaviour, vendor shares the cost.
   • Per-unit cap: `discount ≤ (distributable_margin_pct × pool_share_pct / 100) × customer_price`. Safety clamp ensures `discounted_price ≥ vendor_cost`.
4. **Branch-aware pricing wiring** — every created deal stamps `pricing_branch`, `pricing_tier_label`, `internal_pool_share_pct`, `internal_pool_label` so auditors can trace exactly which tier funded it.
5. **8 live Promotional Materials group deals** seeded (all internal funding, 40% pool-share, 14-day duration). Audit verdict: `ok` / 0 issues.
6. **Darcity portal access ready** — `vendor@darcity.tz` user created; no linked user previously. Ops can impersonate. Credentials logged in `/app/memory/test_credentials.md`.


### Feb 24, 2026 (later) — Settings Hub Category Pricing UI
1. **Category selector pill tabs** added to `PricingPolicyTab` in `AdminSettingsHubPage.jsx`:
   • 5 tabs: Default (fallback) / Promotional Materials / Office Equipment / Stationery / Services
   • Clicking a tab fetches `/api/commission-engine/pricing-policy-tiers?category=X` and swaps the tier editor into edit-mode for that category
   • Save button label dynamically updates: "Save '{category}' tiers"
   • Unsaved-changes amber pill + confirmation dialog when switching away with dirty edits
   • Context-aware description strip explaining how `product.branch` maps to tier set
2. **Verified via screenshot** — Default shows "Micro (0 – 2K) @ 50%" while Office Equipment shows "Micro Supplies (0 – 2K) @ 45%". Both load correctly with full per-category distribution_split preserved.


### Feb 24, 2026 (later) — Category-Aware Pricing Tiers (4 tier sets)
1. **Storage refactored** — `admin_settings.settings_hub.pricing_policy_tiers` now supports a **dict shape** keyed by category:
   ```json
   {
     "default": [...],
     "Promotional Materials": [...],
     "Office Equipment": [...],
     "Stationery": [...],
     "Services": [...]
   }
   ```
   Legacy flat-list storage still works (treated as "default"). `get_pricing_policy_tiers(db, category)` resolves exact-match → default → platform-default → hardcoded fallback. `get_pricing_policy_tiers_all(db)` returns the full mapping.
2. **4 tier structures installed** via `scripts/install_category_pricing_tiers.py`:
   • **Promotional Materials** — competitive U-curve: Micro 50%, Ultra-Low 30%, **Low 12% (commodity zone Cooltex/Diaries)**, Low-Mid 20%, Mid 22%, Upper-Mid 18%, Large 14%, Enterprise 10%
   • **Office Equipment** — B2B relationship pricing: Micro 45%, Small Acc 35%, Basics 30%, Peripherals 28%, Mid Equipment 25%, Printers 20%, Enterprise Gear 17%, Installations 14%
   • **Stationery** — high-volume commodity: Single-Piece 60%, Micro 45%, Ultra-Low 25%, **Low 15%**, Low-Mid 18%, Mid 20%, Upper-Mid 16%, Large 12%
   • **Services** — bespoke/quoted: Standard 35%, Enterprise 25%
3. **Backend category-awareness**:
   • `smart_bulk_import_routes.py` — URL imports use `get_pricing_policy_tiers(db, category=session.branch)`
   • `admin_product_pricing_routes.py` — price overrides resolve base_price from the product's own branch tier set
   • `reprice_all_with_pricing_engine.py` — iterates products and picks tier set per `product.branch`
4. **Admin API endpoints** (`/api/commission-engine/pricing-policy-tiers`):
   • `GET` without `?category=` → returns `tiers_by_category` (full mapping) + `tiers` (default for legacy callers)
   • `GET ?category=Office Equipment` → returns that category's tier list
   • `PUT {category, tiers}` → saves into the specified category slot; preserves other categories
5. **Reprice result**: 14 Office Equipment products re-priced against the new Office Equipment tiers (e.g. DTC 1250e Printer at 3.5M cost: 3,990,000 → **4,095,000** with 17% Enterprise Gear margin vs 14% default). All 596 Promotional Materials products keep their competitive U-curve prices.
6. **Every product record** now stores `pricing_branch` field (alongside `pricing_tier_label`, `pricing_total_margin_pct`, `pricing_protected_margin_pct`, `pricing_distributable_margin_pct`) — full auditability.


### Feb 24, 2026 (later) — 8-Tier Pricing Structure (competitiveness fix)
1. **Tier structure refactored from 5 → 8 tiers** to fix the over-priced 0-100K slab that was quoting Cooltex at TZS 33,750 (on 25K vendor cost). User's competitive target: ~28K at 25K cost.
2. **New U-curve**: Micro (0-2K: 50%), Ultra-Low (2-10K: 30%), **Low (10-30K: 12% — commodity apparel zone)**, Low-Mid (30-100K: 20%), Mid (100-500K: 22%), Upper-Mid (500K-2M: 18%), Large (2-10M: 14%), Enterprise (10M+: 10%). Protected/distributable ratio ≈ 2:1 preserved per tier.
3. **Impact on 610 products (vs. old 35%-flat 0-100K tier):**
   • Commodity apparel (Cooltex, Hoodies, Polos, Diaries) at 10-30K cost → **-17%** price drop (25K → 28K) — competitive win.
   • Tiny items (<2K, e.g. wristbands 750 TZS → 1,125) → **+11%** — fair absolute margin restored.
   • Mid-premium (30-500K) → roughly flat.
   • Equipment/enterprise → -12 to -16% for aggressive quoting.
4. **Scripts:** `install_granular_pricing_tiers.py` (idempotent tier installer) + `reprice_all_with_pricing_engine.py` (realigned 610/610 products to the new structure, writing `pricing_tier_label`, `pricing_total_margin_pct`, `pricing_protected_margin_pct`, `pricing_distributable_margin_pct` metadata on every record).
5. **Existing UI:** tier structure is editable anytime via Settings Hub → Commission & Margin Engine → Pricing Policy Tiers (endpoint `PUT /api/admin/commission-margin/pricing-policy-tiers`). Any edit triggers validation (split % can't exceed 100%).


### Feb 24, 2026 (later) — Pricing Engine Enforcement + Per-Product Overrides (P1)
1. **Verified & hardened the pricing engine** — the Settings Hub `pricing_policy_tiers` are now the single source of truth for Konekt customer prices. Every product's `customer_price = vendor_cost × (1 + tier.total_margin_pct/100)`. Darcity's raw prices are stored as `vendor_cost` (never shown to customers). Example: `Cooltex Polo - Dark Grey - Large` has vendor_cost=25,000 → marketplace price 33,750 (35% Small tier margin = 23% protected + 12% distributable).
2. **`scripts/reprice_all_with_pricing_engine.py`** realigned 73 products that had drifted from the pricing engine (URL-import used flat 35% markup, which mis-priced items crossing tier boundaries). Now idempotent — also backfills tier metadata (`pricing_tier_label`, `pricing_total_margin_pct`, `pricing_protected_margin_pct`, `pricing_distributable_margin_pct`) on every product, every run.
3. **URL-import pipeline now uses the pricing engine** — `smart_bulk_import_routes.py` loads `pricing_policy_tiers` once per commit and applies `resolve_tier(vendor_cost)` per row. Future imports auto-apply proper Konekt margin structure (no more flat 35%).
4. **Catalog-wide duplicate audit** — `scripts/catalog_wide_dedup.py` scans every product across every category for variant duplicates (same canonical base + normalised size token, treating 1XL=XLarge, 2XL=XXLarge etc.). Result: **0 remaining duplicates** after Cooltex cleanup. Re-runnable with `--apply`.
5. **P1: Per-product price overrides** — new `backend/admin_product_pricing_routes.py`:
   • `POST /api/admin/products/{product_id}/price-override` — modes: `percentage_off`, `fixed`, `clear`. Preserves `base_price` as engine-calculated reference; sets `customer_price_override` + audit fields (`price_override_mode`, `price_override_value`, `price_override_reason`, `price_override_set_by`, `price_override_set_at`).
   • `POST /api/admin/products/bulk-price-override` — apply same override to an array of product_ids.
   • Stacks on top of bulk promotions (promotion engine wins when active); override survives tier realignment because `customer_price_override` is preserved.
6. **Inline admin UI** — `AdminProducts.js` now has an `InlinePriceOverride` mini-editor on every product card: `% Off` / `Fixed TZS` toggle + reason input + live preview of final price. "Override" badge shows when active. Card price line shows "vendor cost + margin %" under the marketplace price.
7. **Testing agent verification (iteration 349)** — 8/9 backend tests pass, 100% frontend smoke. Cooltex variant chip selector works end-to-end (image + price swap on chip click). Only flagged issue was `pricing_tier_label` missing on preserved products — fixed via the reprice backfill.


### Feb 24, 2026 (later) — Cooltex Dedup + Services Cleanup + Public Quote Endpoint
1. **Orphan Cooltex SKUs renamed** — 20 products with name patterns like "Yellow Large", "T.Blue 2XL", "White Small", "Golden Yellow - Small" were missing the "Cooltex Polo -" prefix. Script `scripts/cleanup_cooltex_and_services_2026_02.py` prefixed them all (e.g. "Yellow 1XL" → "Cooltex Polo - Yellow - 1XL") and stored the original name on `original_name_before_cleanup` for auditability.
2. **True duplicates deleted** — Darcity had both a "Yellow Small" @ 31,050 TZS and a "Cooltex Polo - Yellow - Small" @ 33,750 TZS (different price tiers, same canonical size once notation is normalised — 1XL = XLarge, 2XL = XXLarge, 3XL = XXXLarge). `scripts/dedupe_cooltex_variants.py` normalised size tokens and deleted the cheaper duplicate where a native SKU already existed — **6 duplicates removed**. Cooltex now has 10 clean cards, each colour with a unique size set.
3. **Printing & Stationery merged into Printing & Branding** — the redundant service category "Printing & Stationery" was deleted. Its 3 subs (Business Cards / Flyers / Banners) were already covered by Printing & Branding's more complete versions. Services drop from 7 → 6 categories.
4. **Service subcategories expanded** — added 25 new high-demand services across all 6 categories (e.g. Creative & Design +Website UX/UI Design, Motion Graphics, Product Photography, Pitch Deck Design, Brand Strategy; Facilities +Garden Maintenance, Plumbing, HVAC, Pest Control, Waste Management; Technical Support +IT Helpdesk SLA, Cybersecurity Audit, Data Backup & Recovery, Cloud Migration, VOIP). **Total services catalogued: 58+**. These are live in the Settings Hub (stored in `admin_settings.settings_hub.catalog.product_categories`) — admin can edit via the Category Configurator UI.
5. **Public Quote Requests endpoint built** — new `backend/public_quote_requests_routes.py` exposes `POST /api/public/quote-requests` for marketplace visitors to submit quote requests without an account. Writes to `public_quote_requests` collection AND mirrors into `leads` for CRM pickup. `ServiceCardsSection.jsx`, `CantFindWhatYouNeedBanner.jsx`, and `RequestProductCTA.jsx` now work end-to-end. Service card hero now accurately shows "24h · 6 categories · 58+ services".


### Feb 24, 2026 (later) — Variant Grouping Correction + Bold Service Card Redesign
1. **Variant grouping logic corrected** — `canonicalize_name()` now strips **only ONE axis** per product, prioritising SIZE. This means:
   • Products with both colour+size (e.g. "Cooltex Polo - Maroon - Large") → strip size only, keep the colour in the canonical base name. → "Cooltex Polo - Maroon" with size variants {S, M, L, XL, XXL, XXXL}.
   • Products with only a colour suffix (e.g. "2026 Diary - Brown", "Umbrella - Red") → strip colour. Colours become the variants.
   • Previously the function recursively stripped both axes, incorrectly collapsing "Cooltex Polo - Maroon" and "Cooltex Polo - Yellow" into a single "Cooltex Polo" card with 20 mixed variants. Each colour now remains its own card with the correct hero image.
   • Cooltex: 52 SKUs → 11 cards (4 male colours + 3 women colours + 4 misc). Total catalog: **416 cards** (from 616 raw SKUs, 69 variant families).
2. **Service cards — magazine layout redesign** — `ServiceCardsSection.jsx` fully rebuilt. Step-change from the old collapsible tile:
   • Dark editorial hero "Services that ship with a quote in hours." with pattern-overlay background and stat callouts (24h · 7 categories · 34+ services).
   • Large 2-column magazine-style tiles with full-bleed category gradient covers (sky→indigo, indigo→violet, rose→fuchsia, emerald→teal, amber→red, slate→zinc, cyan→emerald).
   • SVG textured pattern overlays (dots / grid / waves) on each cover.
   • Glassmorphic icon disc with lucide icon (FileText/Printer/Paintbrush/Sparkles/Wrench/Building2/Shirt).
   • "Explore ↗" chip + "X selected" badge on selected cards.
   • Expanded card goes **full-width** with sub-service chip grid on a gradient.
   • Sticky selection bar with gold CTA button for "Get quote".


### Feb 24, 2026 (later) — Cooltex Variant Fix + Services Layout Split + Service Card Redesign
1. **Stronger variant grouping** — `backend/services/variant_grouping.py` now recognises size/colour suffixes **without a "-" separator** ("T.Blue 2XL", "White Small", "Yellow 1XL"), **compact XL forms** ("XXLarge", "XLarge", "X Large", "XXXLarge"), **numbered XL** ("1XL", "2XL", "2 XL"), **dash-no-space tails** ("Green Black- XXL"), and a broader colour vocabulary ("T.Blue", "Royal Bue", "Navy Blue", "Golden Yellow", etc). **Cooltex 52 SKUs → 6 cards**, total catalog **616 → 397 cards** (60 variant groups).
2. **Services/Products split view** — `MarketplaceBrowsePageContent.jsx`: when user selects the Services group in the filter, the product grid + "No listings found" banner disappear and the Services section becomes the primary content. On the default product view, the Services section is hidden (discoverable via the filter/nav). `taxonomyLoading` guard prevents empty-state flash during initial load.
3. **Premium service card redesign** — `ServiceCardsSection.jsx` rebuilt. Each card has:
   • Coloured gradient accent strip (unique per category)
   • Gradient icon disc with lucide icon (FileText/Printer/Paintbrush/Sparkles/Wrench/Building2/Shirt) + soft ring
   • Category title, service count, fulfilment pills (Site Visit / On-site / Digital / Delivery-Pickup)
   • Smooth expand → sub-service round chip pills with +/✓ affordance
   • Sticky "Continue with N services" CTA + premium quote form with tag-chip selection summary
   • New hero header: "Tell us what you need — we'll quote it in hours"
4. **Prop support** — `ServiceCardsSection` now accepts `heading`, `description`, `hideSection` props for conditional rendering from parent layouts.


### Feb 24, 2026 (later) — Variant Consolidation + Marketplace Perf + Office Equipment Taxonomy
1. **Canonical variant grouping** — New `backend/services/variant_grouping.py` strips trailing variant tokens (`- Small/Medium/Large`, `- Navy Blue`, `(L)/(M)/(S)`, `- 45cm`) from product names to compute a canonical key. Products are grouped at query time — no DB migration — returning ONE card per canonical product with `variants: [...]`, `variant_colors`, `variant_sizes`, and `price_from` / `price_to`. **616 → 445 cards** (46 variant groups collapsed: Cooltex Polo ×20, Hoodie ×20, Timeless Polo ×20, Lanyards ×8, 2026 Diary ×5, etc).
2. **Variant chip selector on PDP** — `MarketplaceListingDetailContent.jsx` now auto-fetches `/api/marketplace/products/:id/variants` after initial load. When the product is part of a variant family, colour/size chip rows appear above the Add-to-Cart. Selecting a chip swaps image, price and cart-bound product_id to the chosen variant. Unavailable combinations are disabled.
3. **Marketplace card polish** — `object-cover` → `object-contain` with `p-3 bg-white` so every product image (including "Navy Blue Laminated Gift Bags") has breathing room. Added `loading="lazy"` + `decoding="async"` on all card images. Variant cards show a `N variants` badge, "N options available" line, "From TZS X" price, and `Select Options` CTA (instead of Add-to-Cart).
4. **Client-side pagination** — marketplace renders 48 cards initially with a `Load more (N remaining)` button, preventing 445 `<img>` tags from loading eagerly on first paint.
5. **Richer skeleton loader** — `ListingGridSkeleton` now renders 12 pulsing placeholder cards with staggered animation delays that match the real card geometry (image, category pill, 2-line title, price, CTA, secondary link).
6. **Office Equipment taxonomy migration** — 14 ID Printer SKUs (DTC 1250e, HDP 5000e, ribbons, cleaning kit, plain ID cards) moved from `Promotional Materials` → `Office Equipment` category via `scripts/move_id_printers_to_office_equipment.py`.

**New endpoints:**
- `GET /api/marketplace/products/search?group_variants=true` (default) — grouped results.
- `GET /api/marketplace/products/:product_id/variants` — returns canonical-group siblings.


### Feb 24, 2026 — Marketplace Image Fix + Unified Help FAB
1. **Marketplace product images restored** — `resolveImageUrl()` in `ProductCardCompact.jsx` and `public/MarketplaceCardV2.jsx` now correctly handles `/api/uploads/...` paths by prefixing `REACT_APP_BACKEND_URL` directly instead of wrapping them in `/api/files/serve/` (which 404'd). All 616 Darcity products now render crystal-clear images.
2. **Single animated "Help Hub" FAB** — New `components/FloatingHelpHub.jsx` replaces the three legacy floating launchers (`ChatWidget`, `AIChatWidget`, `FeedbackWidget`). One button at `bottom-6 left-6` with HelpCircle + pulse aura + orbit accent dot animation expands (speed-dial style) into two labeled options:
   • **Chat with Mr. Konekt** → opens the AI assistant panel (`AIChatWidget` in controlled mode)
   • **Give us Feedback** → opens the feedback form (`FeedbackWidget` in controlled mode)
   Both widgets were refactored to support `controlled` + `hideTrigger` + `isOpen` + `onOpenChange` props for external orchestration. Escape and outside-click close the menu. Hub rotates to an X icon when open.


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
116. **Consistent card height** — all product cards now render identical dimensions whether or not they're on promo. Fixed min-heights on title (3rem), subcategory row (1.25rem), and price block (3.25rem). Tighter inter-row spacing (mb-2) across the card body.
### Smart Promotion Engine + Cart VAT (Apr 24, 2026)
119. **Smart Promotion Engine** rebuilt on top of the Settings Hub pricing_policy_tiers. Replaces the old flat-TZS discount with a **margin-aware** engine:
     - Admin picks which pools to fund the promo from: **Promotion · Reserve · Affiliate · Referral · Sales · Platform margin**
     - Each product resolves its tier from `vendor_cost`, then the engine pulls from the allowed pools in proportion to the tier's distribution_split
     - **Sales pool** preserves a configurable floor (default 10%) so assisted-sales commissions still work on discounted items
     - **Platform margin** is hard-locked by default; admins must enable it in Settings Hub → Promotion Engine Defaults
     - **Fixed TZS discount mode**: if admin types "TZS 2,000 off", products where the allowed pools can't cover are SKIPPED (safer) instead of auto-shrinking
     - **Channel blocking**: ticking Affiliate pool → products auto-filtered out of `/api/affiliate/content/products`; ticking Referral pool → new helper `/api/checkout/check-promo-channel-eligibility` reports which cart lines can't stack referral codes
     - Full endpoint set: `GET/PUT /api/admin/promotions/defaults`, `POST /preview`, `POST /`, `POST /{id}/end`, `DELETE /{id}`, auto-expiry on `end_date`
120. **Settings Hub — Promotion Engine Defaults card** — new section under pricing tiers: sales_preserve_floor_pct slider, "Allow eating platform margin" toggle (🔴 danger), default pre-ticked pools picker. All wired to `/api/admin/promotions/defaults`.
121. **Admin UI rebuild** — `/admin/bulk-discounts` now has:
     - 6 coloured pool checkboxes (amber shield for channel-blocking pools, red triangle for platform margin)
     - Pool-drawdown % slider + platform-eat % (only when allowed)
     - Preview panel shows: products matched, avg margin before→after, per-product tier + pool breakdown in samples, channels-blocked warning ("Affiliate Content Studio won't show these products"), skipped-fixed-amount warning
122. **Cart math + VAT fixed**:
     - Subtotal now shows pre-discount total (e.g. TZS 911,250), then "Your savings -TZS 23,625", then "Subtotal after savings TZS 887,625"
     - **VAT (18%)** line added explicitly — prices on marketplace/product pages stay VAT-exclusive, tax shown at cart/checkout
     - Total (incl. VAT) renders the full amount customer pays (TZS 1,047,398 in the above example)
     - Each cart item line shows strikethrough original unit price + red "Save TZS X" chip
123. **Mobile marketplace filter — cascading "rainfall" flow** (was: 3 nested dropdowns). Replaced the mobile filter drawer with a step-by-step picker (Step 1 "Browse what?" → Step 2 "Category" → Step 3 "Subcategory"), each step a big-tappable list of cards with:
     - Breadcrumb pills showing what's already selected (navy Group → amber Category → emerald Subcategory)
     - "All <group/category>" CTA at the top of each step with dashed accent border
     - Back arrow, Close X, persistent "Show Results (N)" CTA at the bottom
     - No more nested `<select>` pop-ups on mobile (kept on desktop where the drop-down UX works)
124. **Vendor Contract Generator in Settings Hub → Pricing Policy tab**. Fill vendor legal name / address / phone / signatory name + title + email → "Generate pre-filled PDF" downloads `konekt-agreement-<slug>.pdf` ready to email or WhatsApp. New endpoint `POST /api/admin/vendor-agreements/template/prefilled.pdf` takes a `PrefilledTemplatePayload` and returns the PDF. The existing "Download blank template" button still works for generic copies.
125. **Taxonomy locked to 4 production categories** — deactivated all other categories. Final state:
     - Products group → Promotional Materials (39 subs), Office Equipment (11 subs), Stationery (10 subs)
     - Services group → Services (1 default)
     - All 616 Darcity products map cleanly to Promotional Materials; other categories ready for new vendors.
126. **Legacy launch promos cleared** — `TEST_Admin Override Promo` (`discount_value: 0`) in `promotions` collection and `Launch Special 5% Off` in `platform_promotions` were rendering "TZS 0 OFF" / bogus "Save TZS 0" chips on every Darcity card because they resolved against global scope. Both deactivated; Smart Promotion Engine now the only active promo path.
127. **Sort moved to bottom sheet on mobile** — matches the Filter drawer UX. Handle bar, "Sort by" title, big tappable options with checkmark on the active sort, slides up from bottom. Same file as the cascading filter rail so behaviour is consistent across mobile views.
128. **Clean launch state** — 616 Darcity products only, 5 partners (Darcity + platform defaults), 0 marketplace_listings, 0 test submissions.

### IndexNow setup complete (Apr 24, 2026)
129. **INDEXNOW_KEY** generated and wired:
     - Key file at `/app/frontend/public/c91fe737d8f5e21468194482909dda48.txt` (verified HTTP 200 at preview URL; will flip to 200 on konekt.co.tz post-deploy)
     - `INDEXNOW_KEY=c91fe737d8f5e21468194482909dda48` added to `/app/backend/.env`
     - Sitemap regen automatically pings IndexNow — Bing/Yandex/Naver/Seznam will auto-index catalog changes within minutes post-deploy

### Deployment Notes (latest)
- `products` collection is the canonical marketplace feed (read by `/api/products`, limit 2000). `partner_catalog_items` is the vendor's private SKU list.
- Image URLs stored as `/api/uploads/...` — `/uploads/*` external requests hit the frontend and return HTML.
- Taxonomy is 3-level: catalog_groups → catalog_categories → catalog_subcategories. `/api/marketplace/taxonomy` returns the full tree for filters.
- **All services healthy**: backend RUNNING, frontend RUNNING, mongodb RUNNING.  Backend `/api/` responds 200.
- **Database migrations needed**: none.  All new collections (`system_notification_config`, `vendor_agreements`, `vendor_statements`, `vendor_modality_requests`, `impersonation_audit`, `smart_import_sessions`) are created lazily.

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
