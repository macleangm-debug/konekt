# Konekt B2B E-Commerce Platform — PRD

## Original Problem Statement
Build a comprehensive B2B e-commerce platform for business procurement in Tanzania. The platform connects customers with vendors/partners through a managed marketplace, with features including product catalog management, order processing, payment verification, fulfillment tracking, and a dynamic margin engine.

## Core Architecture
- **Frontend**: React 18 + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python) + MongoDB
- **Payments**: Stripe sandbox integration
- **Auth**: JWT-based with strict role separation (Admin/Staff/Customer/Partner)

## Key Business Rules
1. **Pricing**: Vendor Price + Operational Margin + Distributable Pool = Final Price
2. **Distribution Split**: Affiliate (40%), Sales (30%), Discount (30%) of distributable pool
3. **Promotion Safety**: Promos draw ONLY from distributable pool. Unsafe promos are BLOCKED.
4. **Stacking**: Platform promo + affiliate discount don't freely stack. Admin-controlled policy.
5. **Unified Pricing**: ALL flows use same promotion resolver. No per-page math.
6. **Attribution**: Affiliate codes persist URL→localStorage→checkout→DB on orders+quotes.

## Admin Navigation (Canonical — adminNavigation.js)
Dashboard | Commerce | Catalog | Customers | Partners | Growth & Affiliates (incl. Promotions) | Operations | Reports | Settings

## Implemented Features (Apr 2026)

### Foundation (Phases 40-43): Complete
### Partner Enablement (Phase 44A-B): Complete
### Structural Fixes: Complete
- PartnerLayout role separation, Admin sidebar unified, Staff auth separation

### Phase 45: Promotions Engine + Checkout Integration: Complete
- CRUD, margin safety, stacking policies, live preview
- Product enrichment across ALL listing APIs
- Guest checkout + Account checkout promo resolution + promo data on order items
- Marketplace cards + PDP promo badges + strikethrough pricing

### Affiliate Attribution Persistence E2E: Complete
- Frontend: URL `?ref=CODE` → localStorage → checkout payload
- Backend: `extract_attribution_from_payload()` → `hydrate_affiliate_from_code()` → `build_attribution_block()` → stored on order/quote
- Both `promo_code` and `affiliate_code` lookup supported
- Guest and in-account flows both verified
- Invalid codes stored but not hydrated (no error, no ghost data)

## Upcoming Tasks (P1)
- Bank transfer E2E test (checkout → payment proof → admin verify → order progression)
- Sales discount request workflow
- Canonical drawer UI
- Document branding unification

## Future Tasks (P2)
- Deep UI audit for production readiness
- Twilio WhatsApp/SMS (blocked on API key)
- Sales leaderboard / gamification
