# Konekt - Promotional Materials Platform PRD

## Product Overview
Konekt is a full-stack e-commerce platform for ordering customized promotional materials and office equipment. Features include product customization, order tracking, AI assistant, referral program, comprehensive admin dashboard, and **Sales Management System**.

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Framer Motion, Shadcn UI
- **Backend**: FastAPI, Motor (async MongoDB)
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Email**: Resend API
- **Authentication**: JWT-based with role permissions

## Product Structure
- **Promotional Materials** - Customizable products (T-shirts, caps, mugs, etc.)
- **Office Equipment** - Tech accessories & office supplies
- **KonektSeries** - Exclusive branded clothing (ready-to-buy)
- **Services** - Equipment Maintenance

## What's Been Implemented ✅

### GitHub Import - March 11, 2026
- Successfully pulled Konekt repo from https://github.com/macleangm-debug/konekt
- Configured environment files (.env for backend and frontend)
- Installed dependencies and started services
- Backend API confirmed working (auth, products, orders)
- Frontend compiled successfully

### Sales Management System
- Lead Management (CRUD, status tracking, pipeline)
- Quote Management (create, send, track)
- Sales Tasks (automated + manual)
- Automation Engine (rules-based)
- Sales Dashboard metrics

### Core Features
- Product catalog with customization
- Order management with status tracking
- AI Chat Assistant (GPT-5.2)
- AI Logo Generation
- Referral Program
- Promotional Offers System
- Admin Dashboard
- Equipment Maintenance Service

## API Endpoints
- `/api/auth/*` - Authentication
- `/api/products/*` - Product management
- `/api/orders/*` - Order management
- `/api/chat` - AI assistant
- `/api/logo/generate` - Logo generation
- `/api/sales/*` - Sales management
- `/api/admin/*` - Admin routes

## Deployment Status
- Backend: Running on port 8001 ✅
- Frontend: Running on port 3000 ✅
- MongoDB: Running locally ✅
- Preview URL: https://0961b8e6-e3a1-4c86-bb01-3b66e19e8d09.preview.emergentagent.com (platform proxy may need time to sync)

## Next Steps
- [ ] Seed sample products for demo
- [ ] Add EMERGENT_LLM_KEY for AI features
- [ ] Build Sales Dashboard Admin UI
