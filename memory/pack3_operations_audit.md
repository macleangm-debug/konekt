# Pack 3 — Operations Intelligence: Foundation Audit

## 1. Notification Sources (Current State)

### Backend notification services:
- `notification_service.py` — Core: `create_notification()` with type/title/message/target patterns
- `notification_trigger_service.py` — Workflow triggers: quote_ready, quote_approved, invoice_issued
- `notification_events.py` — Event handlers: quote_ready, invoice_ready, service_update, payment_received, order_confirmation
- `customer_notifications_routes.py` — Customer-facing notifications API
- `admin_flow_fixes_routes.py` — Admin payment approval/rejection notifications

### Notification types in use:
- `quote_sent`, `quote_approved`, `quote_rejected`
- `invoice_issued`, `payment_received`, `payment_approved`, `payment_rejected`
- `order_confirmation`, `service_update`
- `lead_assigned`, `task_assigned`

### Gaps:
- No unified notification registry (each service defines its own types)
- No notification preferences or mute controls
- No batch/digest notifications
- Customer notification click routing partially done (approved→orders, rejected→invoices)

---

## 2. Assignment Hooks (Current State)

### Assignment fields:
- `assigned_to` — Generic sales/staff assignment on leads, quotes, orders
- `assigned_sales_id`, `assigned_sales_name` — Sales person on orders/customers
- `assigned_vendor_id` — Vendor on orders (set during payment approval)
- `assigned_sales_owner_id` — CRM lead owner

### Smart assignment:
- `vendor_smart_assignment_service.py` — Capability-based vendor matching
- Payment approval in `live_commerce_service.py` assigns vendor from product's `vendor_id`
- CRM leads can be assigned to sales via drawer

### Gaps:
- No round-robin or load-balanced assignment
- No assignment history/audit trail
- No auto-reassignment on SLA breach

---

## 3. KPI Card Patterns (Current State)

### Reusable components:
- `StandardSummaryCardsRow.jsx` — New standard: icon, label, value, accent, click filter
- `CustomerDrawer360.jsx` — Revenue KPIs in customer profile
- `StatCard` (PartnerDashboardPage, CustomerDashboardHome) — Simpler pattern

### Pages with stat cards:
- Admin Dashboard: Revenue, Orders, Customers, Pending counts
- Orders Page: Status-based counts (Pending, Processing, Completed, etc.)
- Payments Queue: Pending, Approved, Rejected counts
- Invoices Page: Status-based counts
- Deliveries Page: Status-based counts

### Gaps:
- Not all pages use `StandardSummaryCardsRow` (older pages use inline stat blocks)
- No KPI trend indicators (up/down arrows)
- No click-to-filter from dashboard KPI cards

---

## 4. Cleanup Points

### Consolidation opportunities:
1. Migrate all inline `StatCard` patterns to `StandardSummaryCardsRow`
2. Create a unified `NotificationRegistry` that maps type → icon/color/route
3. Add `StandardDrawerShell` to remaining drawers (Deliveries, Vendors, Quotes)

### Files to standardize:
- `PartnerDashboardPage.jsx` — Uses local `StatCard`, should use `StandardSummaryCardsRow`
- `CustomerDashboardHome.jsx` — Uses local `StatCard`, should use `StandardSummaryCardsRow`

---

## Summary

| Area | Coverage | Reusable Pattern | Gap Level |
|------|----------|-----------------|-----------|
| Notifications | 10+ types across 5 services | Partial (no registry) | Medium |
| Assignments | vendor + sales + lead owner | Smart vendor matching | Low |
| KPI Cards | 6+ pages with stats | StandardSummaryCardsRow | Low (migration) |
