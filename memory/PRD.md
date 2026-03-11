# Konekt - Promotional Materials Platform PRD

## Product Overview
Konekt is a full-stack e-commerce platform for ordering customized promotional materials and office equipment. Features include product customization, order tracking, AI assistant, referral program, comprehensive admin dashboard, and **Sales Management System**.

## Product Structure
- **Promotional Materials** - Customizable products (T-shirts, caps, mugs, etc.)
- **Office Equipment** - Tech accessories & office supplies
- **KonektSeries** - Exclusive branded clothing (ready-to-buy)
- **Services** - Equipment Maintenance

## What's Been Implemented ✅

### January 29, 2026 - Sales Management System (NEW)

#### Sales Tasks - Backend Complete ✅
**Automated Tasks (No human intervention):**
- Abandoned Cart Recovery
- Follow-up Emails after delivery
- Birthday/Anniversary Offers
- Reorder Reminders
- Win-back Campaigns for inactive customers
- Pending Quote Follow-ups

**Manual Tasks (Human intervention):**
- Lead Follow-ups
- Quote Follow-ups
- Customer Relationship Tasks
- Order Issue Tasks
- Upsell Opportunity Tasks
- Custom Tasks

#### Sales Team Management ✅
- Add/remove team members
- Role assignment (sales_rep, team_lead, sales_manager)
- Performance metrics per team member
- Lead capacity management

#### Lead Management ✅
- Create, update, delete leads
- Lead status tracking (new → contacted → qualified → proposal → won/lost)
- Lead source tracking
- Estimated value pipeline
- Contact logging with history
- Follow-up scheduling

#### Quote Management ✅
- Create professional quotes
- Auto-calculate totals
- Quote status (draft → sent → viewed → accepted/rejected)
- Quote validity period
- Email sending capability

#### Automation Engine ✅
- Rule-based automation
- Configurable trigger events
- Delay settings
- Action types (email, task creation)
- Performance tracking (triggers, conversions)

#### Sales Dashboard ✅
- Lead metrics and conversion rates
- Quote acceptance rates
- Task overview (pending, completed, overdue)
- Pipeline value
- Team performance
- Recent activity feed

### Previous Implementations
- Email Notification System (Resend)
- Live Chat Widget (AI-powered)
- Promotional Offers System
- Admin Dashboard
- Referral Program
- Equipment Maintenance Service
- Brand logos display (HP, Dell, Zebra, Canon, etc.)

## API Endpoints - Sales Module

### Leads
- `GET /api/sales/leads` - List leads with filters
- `POST /api/sales/leads` - Create lead
- `GET /api/sales/leads/{id}` - Get lead details
- `PUT /api/sales/leads/{id}` - Update lead
- `POST /api/sales/leads/{id}/contact` - Log contact

### Quotes
- `GET /api/sales/quotes` - List quotes
- `POST /api/sales/quotes` - Create quote
- `GET /api/sales/quotes/{id}` - Get quote details
- `PUT /api/sales/quotes/{id}` - Update quote
- `POST /api/sales/quotes/{id}/send` - Send quote via email

### Tasks
- `GET /api/sales/tasks` - List tasks
- `POST /api/sales/tasks` - Create task
- `GET /api/sales/tasks/{id}` - Get task details
- `PUT /api/sales/tasks/{id}` - Update task
- `POST /api/sales/tasks/{id}/notes` - Add note

### Automation
- `GET /api/sales/automation` - List rules
- `POST /api/sales/automation` - Create rule
- `PUT /api/sales/automation/{id}` - Update rule
- `DELETE /api/sales/automation/{id}` - Delete rule

### Team
- `GET /api/sales/team` - List team members
- `POST /api/sales/team` - Add team member
- `PUT /api/sales/team/{id}` - Update member

### Dashboard
- `GET /api/sales/dashboard` - Sales metrics
- `GET /api/sales/reports/performance` - Performance report

## Database Collections (Sales)
- `leads` - Lead records
- `lead_contacts` - Contact history
- `quotes` - Quote documents
- `sales_tasks` - Task records
- `automation_rules` - Automation configuration
- `sales_team` - Team member records

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Framer Motion, Shadcn UI
- **Backend**: FastAPI, Motor (async MongoDB)
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Email**: Resend API
- **Authentication**: JWT-based with role permissions

## Prioritized Backlog

### P0 (Critical)
- [ ] Build Sales Dashboard Admin UI (frontend)
- [ ] Integrate payment gateway (Stripe/M-Pesa)

### P1 (High Priority)
- [ ] Sales Tasks Admin Page
- [ ] Leads Management Admin Page
- [ ] Quotes Management Admin Page
- [ ] Enable automation engine in production

### P2 (Nice to Have)
- [ ] PDF quote generation
- [ ] Advanced sales reporting
- [ ] Mobile-optimized sales dashboard

## Files Created/Updated
- `/app/backend/sales_routes.py` - Sales API routes
- `/app/backend/sales_automation.py` - Automation engine
- `/app/backend/server.py` - Updated with sales models and router
