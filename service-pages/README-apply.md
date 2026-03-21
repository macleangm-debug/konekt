# Konekt Service Pages Pack

This implementation-ready bundle adds:

1. Dynamic service page template for all services
2. Dropdown-ready service navigation config
3. Service catalog seed data for core Konekt services
4. Logged-in and guest CTA logic
5. Admin-side service partner capability mapping helpers

## Included files
- `frontend/src/components/services/ServicePageTemplate.jsx`
- `frontend/src/components/services/ServiceFaqBlock.jsx`
- `frontend/src/components/services/ServiceProcessSteps.jsx`
- `frontend/src/components/services/ServiceNavigationDropdownData.js`
- `frontend/src/pages/public/DynamicServiceDetailPage.jsx`
- `frontend/src/pages/customer/AccountServiceDetailPage.jsx`
- `backend/service_page_seed_data.py`
- `backend/service_partner_capability_notes.py`
- `frontend/src/config/service-pages-route-snippets.js`

## Core behavior
- Guests can read service pages and submit soft leads
- Logged-in users go into account-mode structured request flow
- Each service has:
  - hero
  - what it includes
  - who it is for
  - process flow
  - FAQ
  - CTA block
- Admin can map partners to one or more services in the background
