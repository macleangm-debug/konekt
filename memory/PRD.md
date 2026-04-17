# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email)

## System Status: 339 ITERATIONS

---

## COMPLETED (Apr 17, 2026)

### Batch 4 (Latest)
1. **Number & Currency Format Settings** — New tab in Settings Hub > Business Identity. Configurable: thousand separator (comma/period/space), decimal separator, decimal places, currency position, currency symbol (TZS/KES/UGX/USD) + live preview
2. **Admin Override Promo** — New discount type: gives away ENTIRE distributable margin as discount (platform keeps only protected margin). Red warning UI in promotion form
3. **Services in Quote Creation** — SystemItemSelector now searches both products AND service categories. Service items show "Service" badge + "Request Quote" badge. Added as waiting_for_pricing
4. **Impersonation Return Banner** — Amber banner at top when acting as another user: "You are acting as [name]" + "Return to Admin" button. Restores original admin token

### Batch 3
5. Feedback/Issue Widget (floating + admin inbox)
6. Vendor-Category Assignment System + Order Auto-Splitting
7. Go-Live Reset (settings/catalog/pricing all preserved)

### Batch 2
8. Go-Live Mode + Impersonate Users + "Customize this" CTA
9. Credit Terms at Checkout + Operations Nav consolidated

### Batch 1
10. Quote Creation branded preview + Marketplace fix + Profit display

### Session 1
11. Dashboard Profit Tracking + Admin Credit Terms + Site Visit Flow
12. Statement Branding + Multi-Country + Document Numbering + Order Restrictions

---

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`

## REMAINING

### P1
- Light micro-interactions (hover lift, skeleton loaders)
- Service card subcategory content fix
- Full vendor-order routing automation in Operations
- Multi-country config propagation (switching active country)
