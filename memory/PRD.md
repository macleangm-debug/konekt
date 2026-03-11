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

### March 11, 2026 - Phase 2: World-Class Improvements

#### New World-Class Landing Page
- [x] Premium hero section with business-focused messaging
- [x] 4 category cards (Promotional Materials, Office Equipment, Creative Services, KonektSeries)
- [x] Popular products showcase
- [x] Creative Services highlight section
- [x] How it works (4-step process)
- [x] Trust points (Delivery, Quality, Clients)
- [x] Customer testimonials
- [x] Final CTA section

#### Creative Services (NEW CATEGORY)
- [x] 8 design services added:
  - Logo Design (3 packages: Basic, Standard, Premium)
  - Company Profile Design (3 packages)
  - Brochure Design (3 packages)
  - Flyer Design (3 packages)
  - Poster Design (2 packages)
  - Social Media Kit (2 packages)
  - Business Card Design (2 packages)
  - Letterhead & Stationery (2 packages)

#### AI-Powered Services (NEW)
- [x] **Product Recommender**: AI suggests products based on business type & campaign goal
- [x] **Design Brief Generator**: Converts simple requirements into structured briefs
- [x] **Logo Concept Generator**: Creates AI prompts for logo ideas
- [x] **Pricing Suggestion**: Intelligent pricing for custom orders
- [x] **Service Packages API**: Returns package tiers for design services

#### Deployment Hardening
- [x] Docker Compose (production-ready, internal networking)
- [x] Nginx reverse proxy with SSL, rate limiting, security headers
- [x] Admin password rotated
- [x] Backup admin created
- [x] Deploy script (`./deploy.sh`)

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

## API Endpoints

### AI Services (NEW)
```
POST /api/ai/recommend-products    - Product recommendations
POST /api/ai/generate-design-brief - Design brief generator
POST /api/ai/generate-logo-concept - Logo concept ideas
POST /api/ai/suggest-price         - Pricing suggestions
GET  /api/ai/service-packages/{type} - Service package tiers
```

### Products
```
GET  /api/products                 - List all products
GET  /api/products/{id}            - Product detail
GET  /api/products/categories/list - Categories & branches
```

### Customer
```
POST /api/auth/register            - Register
POST /api/auth/login               - Login
GET  /api/orders                   - My orders
POST /api/orders                   - Create order
POST /api/chat                     - AI assistant
POST /api/logo/generate            - AI logo generation
```

### Admin
```
POST /api/admin/auth/login         - Admin login
GET  /api/admin/analytics/*        - Dashboard
GET  /api/admin/orders/*           - Order management
GET  /api/admin/products/*         - Product CRUD
```

### Sales CRM
```
GET  /api/sales/leads              - Lead pipeline
GET  /api/sales/quotes             - Quotes
GET  /api/sales/tasks              - Tasks
GET  /api/sales/dashboard          - Metrics
```

---

## Customer Journey

```
Landing → Browse Category → Product/Service Detail → Customize/Brief → Cart/Quote → Login → Order → Dashboard → Track → Reorder/Refer
```

---

## File Structure

```
/app
├── backend/
│   ├── server.py           # Main FastAPI (1900 lines)
│   ├── ai_services.py      # AI recommendation endpoints (NEW)
│   ├── sales_routes.py     # Sales CRM
│   ├── sales_automation.py # Automation engine
│   ├── email_service.py    # Resend integration
│   ├── seed_products.py    # Database seeder
│   ├── Dockerfile
│   └── .env.production
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LandingNew.js    # World-class homepage (NEW)
│   │   │   ├── Products.js
│   │   │   ├── ProductDetail.js
│   │   │   └── admin/           # 15 admin pages
│   │   ├── components/
│   │   └── contexts/
│   ├── Dockerfile
│   └── nginx.conf
│
├── nginx/nginx.conf        # Production proxy
├── docker-compose.yml      # Full stack
├── deploy.sh               # Automation
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

## Backlog

### P0 - Ready for Launch
- [x] All deployment files
- [x] Database seeded
- [x] Admin credentials secured
- [ ] Fill real API keys (EMERGENT_LLM_KEY, RESEND_API_KEY)
- [ ] Point DNS
- [ ] Enable SSL

### P1 - Post-Launch
- [ ] Payment gateway (M-Pesa, Stripe)
- [ ] Design brief submission flow UI
- [ ] Service package selection UI
- [ ] Admin: Service order management

### P2 - Growth
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

*Last updated: March 11, 2026*
