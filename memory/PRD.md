# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: 344 ITERATIONS — 100% PASS RATE

---

## COMPLETED (Apr 17-20, 2026) — 9 Batches

### Batch 9 (Latest) — Multi-Country Data Isolation
1. **country_code on all entities** — Users get country_code derived from phone prefix (+255=TZ, +254=KE, +256=UG). Orders, invoices, quotes tagged with country_code.
2. **Dashboard filtering by country** — GET /api/admin/dashboard/kpis?country=TZ filters all metrics (revenue, profit, orders, invoices) by country. Empty country = all data.
3. **Expansion pages on public routes** — /expand/ke and /expand/ug accessible without login. Shows "Konekt is coming to [Country]" with interest registration form.

### Batch 8 — Anti-Bot Protection
4. Honeypot fields, timing analysis (<2s = bot), rate limiting. All invisible to users.

### Batch 7 — Multi-Country Architecture
5. Country selector in Settings Hub, per-country settings storage, settings replication

### Batch 6 — Vendor Routing + Notifications
6. Vendor order auto-routing, real-time feedback badge, country switcher in header

### Batches 1-5
7-24. Dashboard profit, credit terms, site visit flow, statement branding, doc numbering, order restrictions, quote preview, marketplace fix, go-live reset, impersonation, "Customize this" CTA, checkout credit terms, feedback widget, vendor assignments, number format, admin override promo, services in quotes, micro-interactions

---

## Multi-Country Model (Complete)
- **Data isolation**: country_code on users, orders, invoices, quotes
- **Settings isolation**: Per-country settings (settings_hub_TZ, settings_hub_KE, settings_hub_UG)  
- **Dashboard isolation**: ?country= param filters all KPIs
- **Phone → Country**: +255=TZ, +254=KE, +256=UG auto-derived at registration
- **Non-live countries**: Public /expand/{code} pages for interest registration
- **Country switcher**: Admin header dropdown + Settings Hub selector

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
