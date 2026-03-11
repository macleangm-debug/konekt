# Konekt - Promotional Materials Platform PRD

## Overview
Konekt is a B2B e-commerce platform for ordering customized promotional materials, office equipment, **Creative Design Services**, and exclusive branded clothing (KonektSeries). Based in Dar es Salaam, Tanzania.

**Vision**: The biggest B2B branding platform in East Africa — combining VistaPrint + Printful + Fiverr for corporate merchandise and design services.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Framer Motion, Shadcn UI
- **Backend**: FastAPI, Motor (async MongoDB)
- **Database**: MongoDB 7.0
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Email**: Resend API
- **Authentication**: JWT with role-based permissions
- **Deployment**: Docker Compose + Nginx

---

## What's Been Implemented ✅

### March 11, 2026 - Phase 3: Full Creative Services Flow

#### New Frontend Pages
- [x] `CreativeServicesPage.js` - Service listing with category filters
- [x] `ServiceDetail.js` - Service detail with package selection
- [x] `DesignBriefForm.js` - Complete design brief submission form with AI assistance
- [x] `LandingNew.js` - World-class homepage

#### New Backend Routes
- [x] `POST /api/service-orders` - Create service order
- [x] `GET /api/service-orders` - List all service orders
- [x] `GET /api/service-orders/{id}` - Get specific order
- [x] `PATCH /api/service-orders/{id}/status` - Update order status
- [x] `POST /api/service-orders/{id}/notes` - Add designer notes
- [x] `GET /api/admin/service-orders/stats` - Dashboard stats

#### Service Order Flow
```
Customer selects service → Chooses package → Fills brief → AI assists → Submits order
     ↓
Admin receives order → Reviews brief → Assigns designer → Creates draft → Sends for review
     ↓
Customer reviews → Requests revisions → Approves final → Receives files
```

#### Service Statuses
```
pending → brief_review → in_design → draft_sent → revision_requested → approved → final_delivery → completed
```

---

## Product Catalog

| Branch | Products | Type |
|--------|----------|------|
| Promotional Materials | 13 | Physical, Customizable |
| Office Equipment | 6 | Physical |
| KonektSeries | 5 | Physical, Ready-to-buy |
| **Creative Services** | **8** | **Services with packages** |
| **Total** | **32** | |

---

## Frontend Routes

### Customer Routes
```
/                       - Landing page
/products               - Product catalog
/product/:id            - Product detail
/customize/:id          - Product customization canvas
/cart                   - Shopping cart
/auth                   - Login/Register
/dashboard              - Customer dashboard
/orders/:id             - Order tracking
/creative-services      - Design services listing  (NEW)
/services/:id           - Service detail + brief   (NEW)
/services/maintenance   - Equipment maintenance
```

### Admin Routes
```
/admin/login            - Admin login
/admin                  - Dashboard
/admin/orders           - Order management
/admin/products         - Product CRUD
/admin/users            - User management
/admin/offers           - Promotional offers
/admin/referrals        - Referral program
/admin/maintenance      - Maintenance requests
/admin/stock            - Inventory
```

---

## API Endpoints

### Service Orders (NEW)
```
POST   /api/service-orders              - Create service order
GET    /api/service-orders              - List orders (admin)
GET    /api/service-orders/{id}         - Get order details
PATCH  /api/service-orders/{id}/status  - Update status
POST   /api/service-orders/{id}/notes   - Add designer note
GET    /api/admin/service-orders/stats  - Dashboard stats
GET    /api/service-orders/customer/{email} - Customer orders
```

### AI Services
```
POST /api/ai/recommend-products      - Product recommendations
POST /api/ai/generate-design-brief   - Design brief generator
POST /api/ai/generate-logo-concept   - Logo concept ideas
POST /api/ai/suggest-price           - Pricing suggestions
GET  /api/ai/service-packages/{type} - Package tiers
```

### Products
```
GET  /api/products           - List all products
GET  /api/products/{id}      - Product detail
GET  /api/products/categories/list
```

### Customer
```
POST /api/auth/register/login
GET  /api/orders
POST /api/orders
POST /api/chat
POST /api/logo/generate
```

### Admin
```
POST /api/admin/auth/login
GET  /api/admin/analytics/*
GET  /api/admin/orders/*
GET  /api/admin/products/*
```

---

## File Structure

```
/app
├── backend/
│   ├── server.py              # Main FastAPI
│   ├── ai_services.py         # AI recommendation endpoints
│   ├── service_orders.py      # Creative service orders (NEW)
│   ├── sales_routes.py        # Sales CRM
│   ├── sales_automation.py    # Automation engine
│   ├── email_service.py       # Resend integration
│   ├── seed_products.py       # Database seeder
│   ├── Dockerfile
│   └── .env.production
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingNew.js           # World-class homepage
│   │   │   ├── CreativeServicesPage.js # Services listing (NEW)
│   │   │   ├── ServiceDetail.js        # Service detail (NEW)
│   │   │   ├── Products.js
│   │   │   └── admin/
│   │   ├── components/
│   │   │   ├── DesignBriefForm.js      # Brief form (NEW)
│   │   │   └── ...
│   │   ├── lib/
│   │   │   └── api.js                  # API client (NEW)
│   │   └── contexts/
│   ├── Dockerfile
│   └── nginx.conf
│
├── nginx/nginx.conf
├── docker-compose.yml
├── deploy.sh
└── memory/PRD.md
```

---

## Deployment

```bash
# Configure
cp backend/.env.production backend/.env
# Edit with real values

# Deploy
./deploy.sh build
./deploy.sh start
./deploy.sh seed
./deploy.sh status

# SSL
./deploy.sh ssl
```

---

## Admin Credentials

| Account | Email | Note |
|---------|-------|------|
| Primary Admin | admin@konekt.co.tz | Password rotated |
| Backup Admin | backup@konekt.co.tz | Emergency access |

---

## Backlog

### P0 - Ready for Launch
- [x] All deployment files
- [x] Database seeded (32 products)
- [x] Admin credentials secured
- [x] Creative services flow complete
- [x] Service order management
- [ ] Fill real API keys (EMERGENT_LLM_KEY, RESEND_API_KEY)
- [ ] Point DNS
- [ ] Enable SSL

### P1 - Post-Launch (Week 1)
- [ ] Admin service orders dashboard UI
- [ ] Revision request workflow UI
- [ ] File upload for design assets
- [ ] Email notifications for service milestones
- [ ] Payment gateway (M-Pesa, Stripe)

### P2 - Growth (Week 2-4)
- [ ] WhatsApp notifications
- [ ] Advanced referral gamification
- [ ] Inventory alerts
- [ ] B2B team accounts
- [ ] Saved brand assets

### P3 - Future
- [ ] Mobile app
- [ ] 3D product customization
- [ ] AR preview
- [ ] AI brand builder

---

## Customer Journey

### Promotional Products Flow
```
Landing → Browse Products → Product Detail → Customize → Cart → Login → Order → Track → Reorder
```

### Creative Services Flow (NEW)
```
Landing → Creative Services → Service Detail → Choose Package → Fill Brief → AI Assist → Submit → Dashboard → Track → Review Drafts → Approve → Download
```

---

*Last updated: March 11, 2026*
