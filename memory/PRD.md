# Konekt - Promotional Materials Platform PRD

## Overview
Konekt is a B2B e-commerce platform for ordering customized promotional materials, office equipment, and exclusive branded clothing (KonektSeries). Based in Dar es Salaam, Tanzania.

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

### March 11, 2026 - Production Preparation

#### Configuration & Deployment Files
- [x] `backend/.env.example` - Environment template
- [x] `backend/.env.production` - Production config template
- [x] `frontend/.env.example` - Frontend env template
- [x] `frontend/.env.production` - Frontend production config
- [x] `backend/Dockerfile` - Python 3.11 + uvicorn
- [x] `frontend/Dockerfile` - Node 20 + nginx multi-stage build
- [x] `docker-compose.yml` - Production-ready orchestration
- [x] `nginx/nginx.conf` - Full reverse proxy with SSL, rate limiting, security headers
- [x] `deploy.sh` - Deployment automation script

#### Security
- [x] Admin password rotated (no longer `admin123`)
- [x] Backup admin account created
- [x] Rate limiting on login/AI endpoints
- [x] Security headers configured
- [x] CORS properly configured

#### Database
- [x] 24 products seeded across 3 branches
- [x] Database indexes created
- [x] Admin users created and secured

---

## Product Structure

| Branch | Products | Customizable |
|--------|----------|--------------|
| Promotional Materials | 13 | Yes |
| Office Equipment | 6 | Yes |
| KonektSeries | 5 | No (ready-to-buy) |

---

## User Roles & Permissions

| Role | Access |
|------|--------|
| **Admin** | Full access to everything |
| **Sales** | Orders, customers, quotes, basic analytics |
| **Marketing** | Products, analytics, customers |
| **Production** | Orders, production status |
| **Customer** | Own orders, profile, referrals |

---

## API Endpoints

### Public
- `GET /api/products` - Product catalog
- `GET /api/products/{id}` - Product details
- `POST /api/auth/register` - Customer registration
- `POST /api/auth/login` - Customer login
- `POST /api/chat` - AI assistant
- `POST /api/logo/generate` - AI logo generation

### Customer (authenticated)
- `GET /api/orders` - My orders
- `POST /api/orders` - Create order
- `GET /api/drafts` - Saved designs
- `GET /api/referral/*` - Referral program

### Admin
- `POST /api/admin/auth/login` - Admin login
- `GET /api/admin/analytics/*` - Dashboard analytics
- `GET /api/admin/orders/*` - Order management
- `GET /api/admin/products/*` - Product CRUD
- `GET /api/admin/users/*` - User management

### Sales CRM
- `GET /api/sales/leads` - Lead pipeline
- `GET /api/sales/quotes` - Quote management
- `GET /api/sales/tasks` - Task management
- `GET /api/sales/dashboard` - Sales metrics
- `GET /api/sales/team` - Team management

---

## Admin Credentials (SECURE)

| Account | Email | Purpose |
|---------|-------|---------|
| Primary | `admin@konekt.co.tz` | Main admin |
| Backup | `backup@konekt.co.tz` | Emergency access |

**Passwords stored separately - not in this file**

---

## Deployment Checklist

### Pre-Launch
- [ ] Copy `backend/.env.production` to `backend/.env`
- [ ] Set `JWT_SECRET` (generate: `openssl rand -base64 32`)
- [ ] Set `EMERGENT_LLM_KEY` for AI features
- [ ] Set `RESEND_API_KEY` for emails
- [ ] Update `CORS_ORIGINS` with production domain
- [ ] Point DNS to server
- [ ] Setup SSL certificates

### Launch
```bash
./deploy.sh build
./deploy.sh start
./deploy.sh seed  # First time only
./deploy.sh status
```

### Post-Launch
- [ ] Enable HSTS in nginx config
- [ ] Setup log rotation
- [ ] Configure backups for MongoDB
- [ ] Setup monitoring/alerting

---

## Smoke Test Checklist

### Public Flow
- [ ] Homepage loads
- [ ] Products page shows 24 products
- [ ] Product detail page works
- [ ] Customization canvas loads
- [ ] Cart functionality works

### Customer Flow
- [ ] Registration works
- [ ] Login works
- [ ] Dashboard accessible
- [ ] Order creation works
- [ ] Order tracking works

### Admin Flow
- [ ] Admin login works
- [ ] Analytics dashboard loads
- [ ] Order management works
- [ ] Product CRUD works
- [ ] User management works
- [ ] Sales CRM works

### Integration Flow
- [ ] AI chat responds (requires EMERGENT_LLM_KEY)
- [ ] Logo generation works (requires EMERGENT_LLM_KEY)
- [ ] Email notifications send (requires RESEND_API_KEY)

---

## Backlog (Post-Launch)

### P0 - Critical
- Payment gateway integration (M-Pesa, Stripe)

### P1 - High Priority
- WhatsApp notifications
- Advanced referral gamification
- Inventory alerts

### P2 - Medium Priority
- Analytics dashboard enhancements
- Multi-currency support
- Supplier portal

### P3 - Nice to Have
- Mobile app
- AR product preview
- B2B portal for resellers

---

## Files Reference

```
/app
├── backend/
│   ├── server.py           # Main FastAPI (1900 lines)
│   ├── sales_routes.py     # Sales CRM (895 lines)
│   ├── sales_automation.py # Automation engine
│   ├── email_service.py    # Resend integration
│   ├── seed_products.py    # Database seeder
│   ├── requirements.txt    # Python deps
│   ├── Dockerfile          # Production build
│   ├── .env.example        # Config template
│   └── .env.production     # Production template
│
├── frontend/
│   ├── src/
│   │   ├── pages/          # 9 customer + 15 admin pages
│   │   ├── components/     # Shared components
│   │   └── contexts/       # Auth, Cart, AdminAuth
│   ├── Dockerfile          # Multi-stage build
│   ├── nginx.conf          # Static serving
│   └── .env.production     # Build-time config
│
├── nginx/
│   └── nginx.conf          # Production reverse proxy
│
├── docker-compose.yml      # Full stack orchestration
├── deploy.sh               # Deployment script
└── memory/
    └── PRD.md              # This file
```

---

*Last updated: March 11, 2026*
