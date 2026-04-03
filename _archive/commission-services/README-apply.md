# Konekt Commission + Margin Distribution Engine + Services Page Improvement Pack

This bundle contains implementation-ready code for:

1. Commission + Margin Distribution Engine
2. Service page design improvement
3. Logged-in customer services discovery page
4. Suggested additional services seed data

## Included
- backend/commission_margin_engine_service.py
- backend/commission_margin_engine_routes.py
- backend/commission_distribution_notes.py
- frontend/src/pages/public/ServicesPageImproved.jsx
- frontend/src/pages/customer/AccountServicesDiscoveryPage.jsx
- frontend/src/components/services/ServiceHeroPanel.jsx
- frontend/src/components/services/ServiceCategoryGrid.jsx
- frontend/src/components/services/ServiceRequestActions.jsx
- backend/service_seed_suggestions.py
- frontend/src/config/commission-services-route-snippets.js

## Core principle
The engine enforces:
- distributable margin never goes below protected company margin
- configurable slices for affiliate, sales, promo, referral, country bonus, retained company margin
- supports both margin-touching and non-margin-touching promotions

## Logged-in visibility
The services also appear for logged-in customers through:
- `/services` for public browsing
- `/dashboard/services` for account-mode browsing and request flow
