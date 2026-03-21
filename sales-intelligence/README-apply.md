# Konekt Sales Intelligence + Payment Timeline Pack

This bundle includes implementation-ready code and specification for:

1. Sales Intelligence Engine (full spec + code skeleton)
2. Payment Timeline component + backend trigger guidance
3. Sales Queue + Opportunity Intelligence
4. Performance Dashboard for staff + supervisors
5. Smart Assignment Engine

## Important implementation note
**Payment timeline triggers should be implemented in backend workflow handlers**, not frontend code.

The backend action handlers that change state should create the timeline events and notifications, for example:
- invoice issued
- payment proof submitted
- payment proof under review
- payment proof approved / rejected
- order processing started
- service started
- order dispatched
- order completed

## Suggested backend ownership
The triggers should be implemented by the developer inside the existing backend route/action files that already perform these state changes, such as:
- `invoice_routes.py`
- `payment_proof_routes.py`
- `order_routes.py` or `order_ops_routes.py`
- `service_request_admin_routes.py`
- `quote_routes.py`

## Included files
- `backend/assignment_engine_service.py`
- `backend/payment_timeline_service.py`
- `backend/payment_timeline_routes.py`
- `backend/sales_intelligence_routes.py`
- `backend/staff_performance_routes.py`
- `frontend/src/components/payments/PaymentTimeline.jsx`
- `frontend/src/pages/staff/SalesQueueIntelligencePage.jsx`
- `frontend/src/pages/staff/StaffPerformanceDashboardPage.jsx`
- `frontend/src/pages/admin/SupervisorPerformanceDashboardPage.jsx`
- `frontend/src/config/sales-intelligence-route-snippets.js`
