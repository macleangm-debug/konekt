"""
Notification Trigger Service
Centralized notification handlers triggered by workflow action buttons

Each function corresponds to a specific workflow action:
- action button changes state → matching notification is created immediately

Roles covered:
- Customer: quotes, invoices, orders, payments, services
- Sales: assignments, approvals, customer updates
- Admin: business pricing, payment proofs, partner applications
- Affiliate: commissions, campaigns
- Partner: jobs, settlements
- Operations: handoffs, delivery tasks
- Supervisor: team alerts
"""
from notification_service import build_notification_doc


# =============================================================================
# CUSTOMER NOTIFICATIONS
# =============================================================================

async def notify_customer_quote_ready(
    db,
    *,
    customer_user_id: str | None,
    quote_id: str,
    quote_number: str,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify customer when their quote is ready for review"""
    if not customer_user_id:
        return

    doc = build_notification_doc(
        notification_type="quote_ready",
        title="Your quote is ready",
        message=f"Quote {quote_number} is ready for your review.",
        target_url=f"/account/quotes/{quote_id}",
        recipient_user_id=customer_user_id,
        entity_type="quote",
        entity_id=quote_id,
        priority="high",
        action_key="quote_mark_ready",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


async def notify_customer_invoice_issued(
    db,
    *,
    customer_user_id: str | None,
    invoice_id: str,
    invoice_number: str,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify customer when invoice is issued"""
    if not customer_user_id:
        return

    doc = build_notification_doc(
        notification_type="invoice_issued",
        title="Your invoice is ready",
        message=f"Invoice {invoice_number} has been issued.",
        target_url=f"/account/invoices/{invoice_id}",
        recipient_user_id=customer_user_id,
        entity_type="invoice",
        entity_id=invoice_id,
        priority="high",
        action_key="invoice_issue",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


async def notify_customer_payment_reviewed(
    db,
    *,
    customer_user_id: str | None,
    payment_proof_id: str,
    approved: bool,
    order_id: str | None = None,
    invoice_id: str | None = None,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify customer when their payment proof is reviewed.
    Approved → deep link to /account/orders
    Rejected → deep link to /account/invoices
    """
    if not customer_user_id:
        return

    if approved:
        target = f"/account/orders/{order_id}" if order_id else "/account/orders"
        title = "Payment Approved"
        message = "Your payment has been approved. You can now track your order progress."
        cta_label = "Track Order"
    else:
        target = f"/account/invoices/{invoice_id}" if invoice_id else "/account/invoices"
        title = "Payment Rejected"
        message = "Your payment submission was rejected. Review the invoice and next steps."
        cta_label = "Open Invoice"

    doc = build_notification_doc(
        notification_type="payment_reviewed",
        title=title,
        message=message,
        target_url=target,
        recipient_user_id=customer_user_id,
        entity_type="payment_proof",
        entity_id=payment_proof_id,
        priority="high",
        action_key="payment_proof_review",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    doc["cta_label"] = cta_label
    await db.notifications.insert_one(doc)


async def notify_customer_order_dispatched(
    db,
    *,
    customer_user_id: str | None,
    order_id: str,
    order_number: str,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify customer when their order is dispatched"""
    if not customer_user_id:
        return

    doc = build_notification_doc(
        notification_type="order_dispatched",
        title="Your order is on the way",
        message=f"Order {order_number} has been dispatched.",
        target_url=f"/account/orders/{order_id}",
        recipient_user_id=customer_user_id,
        entity_type="order",
        entity_id=order_id,
        priority="high",
        action_key="order_dispatch",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


async def notify_customer_order_confirmed(
    db,
    *,
    customer_user_id: str | None,
    order_id: str,
    order_number: str,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify customer when their order is confirmed"""
    if not customer_user_id:
        return

    doc = build_notification_doc(
        notification_type="order_confirmed",
        title="Order confirmed",
        message=f"Order {order_number} has been confirmed and is being processed.",
        target_url=f"/account/orders/{order_id}",
        recipient_user_id=customer_user_id,
        entity_type="order",
        entity_id=order_id,
        priority="high",
        action_key="order_confirm",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


async def notify_customer_service_status_updated(
    db,
    *,
    customer_user_id: str | None,
    service_request_id: str,
    service_name: str,
    status_label: str,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify customer when their service request status changes"""
    if not customer_user_id:
        return

    doc = build_notification_doc(
        notification_type="service_status_updated",
        title="Service request updated",
        message=f"{service_name} status changed to: {status_label}.",
        target_url=f"/account/service-requests/{service_request_id}",
        recipient_user_id=customer_user_id,
        entity_type="service_request",
        entity_id=service_request_id,
        priority="high",
        action_key="service_status_update",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


async def notify_customer_site_visit_scheduled(
    db,
    *,
    customer_user_id: str | None,
    site_visit_id: str,
    scheduled_date: str,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify customer when a site visit is scheduled"""
    if not customer_user_id:
        return

    doc = build_notification_doc(
        notification_type="site_visit_scheduled",
        title="Site visit scheduled",
        message=f"Your site visit has been scheduled for {scheduled_date}.",
        target_url="/account/service-requests",
        recipient_user_id=customer_user_id,
        entity_type="site_visit",
        entity_id=site_visit_id,
        priority="high",
        action_key="site_visit_schedule",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


# =============================================================================
# SALES NOTIFICATIONS
# =============================================================================

async def notify_sales_new_assignment(
    db,
    *,
    sales_user_id: str | None,
    opportunity_id: str,
    title: str,
    source: str,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify sales when they are assigned a new opportunity"""
    if not sales_user_id:
        return

    doc = build_notification_doc(
        notification_type="sales_assignment",
        title="New assigned opportunity",
        message=f"{title} has been assigned to you. Source: {source}.",
        target_url=f"/staff/opportunities/{opportunity_id}",
        recipient_user_id=sales_user_id,
        entity_type="sales_opportunity",
        entity_id=opportunity_id,
        priority="high",
        action_key="assign_sales_owner",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


async def notify_sales_quote_approved(
    db,
    *,
    sales_user_id: str | None,
    quote_id: str,
    quote_number: str,
    customer_name: str | None = None,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify sales when a quote is approved by customer"""
    if not sales_user_id:
        return

    doc = build_notification_doc(
        notification_type="quote_approved",
        title="Quote approved",
        message=f"Quote {quote_number} has been approved{' by ' + customer_name if customer_name else ''}.",
        target_url=f"/admin/quotes/{quote_id}",
        recipient_user_id=sales_user_id,
        entity_type="quote",
        entity_id=quote_id,
        priority="high",
        action_key="quote_approve",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


async def notify_sales_customer_reply(
    db,
    *,
    sales_user_id: str | None,
    entity_id: str,
    entity_type: str,
    customer_name: str | None = None,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify sales when customer replies or updates a request"""
    if not sales_user_id:
        return

    doc = build_notification_doc(
        notification_type="customer_reply",
        title="Customer update received",
        message=f"{customer_name or 'Customer'} has added a new message or update.",
        target_url=f"/staff/opportunities/{entity_id}",
        recipient_user_id=sales_user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        priority="high",
        action_key="customer_reply",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


async def notify_sales_service_status_updated(
    db,
    *,
    sales_user_id: str | None,
    service_request_id: str,
    service_name: str,
    status_label: str,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify assigned sales when service status changes"""
    if not sales_user_id:
        return

    doc = build_notification_doc(
        notification_type="service_status_updated_sales",
        title="Service request updated",
        message=f"{service_name} is now: {status_label}.",
        target_url=f"/admin/service-requests/{service_request_id}",
        recipient_user_id=sales_user_id,
        entity_type="service_request",
        entity_id=service_request_id,
        priority="normal",
        action_key="service_status_update",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


# =============================================================================
# ADMIN NOTIFICATIONS
# =============================================================================

async def notify_admin_business_pricing_request(
    db,
    *,
    business_pricing_request_id: str,
    company_or_customer: str,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify admin when a new business pricing request is submitted"""
    doc = build_notification_doc(
        notification_type="business_pricing_request",
        title="New business pricing request",
        message=f"{company_or_customer} submitted a business pricing request.",
        target_url="/admin/business-pricing-requests",
        recipient_role="admin",
        entity_type="business_pricing_request",
        entity_id=business_pricing_request_id,
        priority="high",
        action_key="create_business_pricing_request",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


async def notify_admin_payment_proof_submitted(
    db,
    *,
    payment_proof_id: str,
    customer_name: str,
    amount: float,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify admin when a payment proof is submitted"""
    doc = build_notification_doc(
        notification_type="payment_proof_submitted",
        title="New payment proof submitted",
        message=f"{customer_name} submitted a payment proof for TZS {amount:,.0f}.",
        target_url="/admin/payment-proofs",
        recipient_role="admin",
        entity_type="payment_proof",
        entity_id=payment_proof_id,
        priority="high",
        action_key="payment_proof_submit",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


async def notify_admin_partner_application(
    db,
    *,
    application_id: str,
    company_name: str,
    country: str,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify admin when a partner application is submitted"""
    doc = build_notification_doc(
        notification_type="partner_application",
        title="New partner application",
        message=f"{company_name} from {country} applied to become a partner.",
        target_url="/admin/country-partner-applications",
        recipient_role="admin",
        entity_type="partner_application",
        entity_id=application_id,
        priority="high",
        action_key="partner_application_submit",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


async def notify_admin_settlement_pending(
    db,
    *,
    settlement_id: str,
    partner_name: str,
    amount: float,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify admin when a partner settlement is pending approval"""
    doc = build_notification_doc(
        notification_type="settlement_pending",
        title="Settlement pending approval",
        message=f"{partner_name} has a settlement of TZS {amount:,.0f} pending approval.",
        target_url="/admin/partner-settlements",
        recipient_role="admin",
        entity_type="settlement",
        entity_id=settlement_id,
        priority="high",
        action_key="settlement_request",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


# =============================================================================
# AFFILIATE NOTIFICATIONS
# =============================================================================

async def notify_affiliate_commission_earned(
    db,
    *,
    affiliate_user_id: str | None,
    order_id: str,
    amount: float,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify affiliate when they earn a commission from a sale"""
    if not affiliate_user_id:
        return

    doc = build_notification_doc(
        notification_type="affiliate_commission_earned",
        title="New commission earned",
        message=f"You earned TZS {amount:,.0f} from a successful order.",
        target_url="/partner/affiliate-dashboard",
        recipient_user_id=affiliate_user_id,
        entity_type="order",
        entity_id=order_id,
        priority="high",
        action_key="affiliate_commission_create",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


async def notify_affiliate_commission_paid(
    db,
    *,
    affiliate_user_id: str | None,
    payout_id: str,
    amount: float,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify affiliate when their commission is paid"""
    if not affiliate_user_id:
        return

    doc = build_notification_doc(
        notification_type="affiliate_commission_paid",
        title="Commission paid",
        message=f"Your payout of TZS {amount:,.0f} has been processed.",
        target_url="/partner/affiliate-dashboard",
        recipient_user_id=affiliate_user_id,
        entity_type="payout",
        entity_id=payout_id,
        priority="high",
        action_key="affiliate_payout_complete",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


async def notify_affiliate_new_campaign(
    db,
    *,
    campaign_id: str,
    campaign_name: str,
):
    """Notify all affiliates when a new campaign is published"""
    doc = build_notification_doc(
        notification_type="new_campaign",
        title="New promotion available",
        message=f"New campaign: {campaign_name}. Share with your network!",
        target_url="/partner/affiliate-dashboard",
        recipient_role="affiliate",
        entity_type="campaign",
        entity_id=campaign_id,
        priority="normal",
        action_key="campaign_publish",
    )
    await db.notifications.insert_one(doc)


# =============================================================================
# PARTNER NOTIFICATIONS
# =============================================================================

async def notify_partner_job_assigned(
    db,
    *,
    partner_user_id: str | None,
    job_id: str,
    job_title: str,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify partner when they are assigned a new job"""
    if not partner_user_id:
        return

    doc = build_notification_doc(
        notification_type="partner_job_assigned",
        title="New job assigned",
        message=f"You have been assigned: {job_title}.",
        target_url="/partner/orders",
        recipient_user_id=partner_user_id,
        entity_type="partner_job",
        entity_id=job_id,
        priority="high",
        action_key="assign_partner_job",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


async def notify_partner_job_updated(
    db,
    *,
    partner_user_id: str | None,
    job_id: str,
    job_title: str,
    update_note: str,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify partner when a job is updated"""
    if not partner_user_id:
        return

    doc = build_notification_doc(
        notification_type="partner_job_updated",
        title="Job updated",
        message=f"{job_title}: {update_note}",
        target_url="/partner/orders",
        recipient_user_id=partner_user_id,
        entity_type="partner_job",
        entity_id=job_id,
        priority="normal",
        action_key="partner_job_update",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


async def notify_partner_deadline_reminder(
    db,
    *,
    partner_user_id: str | None,
    job_id: str,
    job_title: str,
    deadline: str,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify partner about upcoming deadline"""
    if not partner_user_id:
        return

    doc = build_notification_doc(
        notification_type="partner_deadline_reminder",
        title="Deadline approaching",
        message=f"{job_title} is due by {deadline}.",
        target_url="/partner/orders",
        recipient_user_id=partner_user_id,
        entity_type="partner_job",
        entity_id=job_id,
        priority="urgent",
        action_key="deadline_reminder",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


async def notify_partner_settlement_approved(
    db,
    *,
    partner_user_id: str | None,
    settlement_id: str,
    settlement_reference: str,
    amount: float,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify partner when their settlement is approved"""
    if not partner_user_id:
        return

    doc = build_notification_doc(
        notification_type="settlement_approved",
        title="Settlement approved",
        message=f"Settlement {settlement_reference} for TZS {amount:,.0f} has been approved.",
        target_url="/partner/settlements",
        recipient_user_id=partner_user_id,
        entity_type="settlement",
        entity_id=settlement_id,
        priority="high",
        action_key="settlement_approve",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


async def notify_partner_settlement_paid(
    db,
    *,
    partner_user_id: str | None,
    settlement_id: str,
    settlement_reference: str,
    amount: float,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify partner when their settlement is paid"""
    if not partner_user_id:
        return

    doc = build_notification_doc(
        notification_type="settlement_paid",
        title="Settlement paid",
        message=f"Settlement {settlement_reference} for TZS {amount:,.0f} has been paid.",
        target_url="/partner/settlements",
        recipient_user_id=partner_user_id,
        entity_type="settlement",
        entity_id=settlement_id,
        priority="high",
        action_key="settlement_pay",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


# =============================================================================
# OPERATIONS NOTIFICATIONS
# =============================================================================

async def notify_ops_handoff(
    db,
    *,
    ops_user_id: str | None,
    opportunity_id: str,
    title: str,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify operations when they receive a handoff from sales"""
    if not ops_user_id:
        return

    doc = build_notification_doc(
        notification_type="ops_handoff",
        title="New operations handoff",
        message=f"{title} is ready for operations follow-up.",
        target_url="/staff/operations-tasks",
        recipient_user_id=ops_user_id,
        entity_type="sales_opportunity",
        entity_id=opportunity_id,
        priority="high",
        action_key="handoff_to_operations",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


async def notify_ops_order_dispatched(
    db,
    *,
    ops_user_id: str | None,
    order_id: str,
    order_number: str,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify operations when an order is dispatched"""
    if not ops_user_id:
        return

    doc = build_notification_doc(
        notification_type="order_dispatched_ops",
        title="Order dispatched",
        message=f"Order {order_number} has been marked as dispatched.",
        target_url="/admin/orders-ops",
        recipient_user_id=ops_user_id,
        entity_type="order",
        entity_id=order_id,
        priority="normal",
        action_key="order_dispatch",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


async def notify_ops_delivery_required(
    db,
    *,
    ops_user_id: str | None,
    order_id: str,
    order_number: str,
    delivery_date: str,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify operations when delivery tracking update is needed"""
    if not ops_user_id:
        return

    doc = build_notification_doc(
        notification_type="delivery_tracking_needed",
        title="Delivery update required",
        message=f"Order {order_number} needs delivery confirmation by {delivery_date}.",
        target_url="/admin/delivery-notes",
        recipient_user_id=ops_user_id,
        entity_type="order",
        entity_id=order_id,
        priority="urgent",
        action_key="delivery_reminder",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


# =============================================================================
# SUPERVISOR NOTIFICATIONS
# =============================================================================

async def notify_supervisor_team_backlog(
    db,
    *,
    supervisor_user_id: str | None,
    backlog_count: int,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify supervisor when team backlog exceeds threshold"""
    if not supervisor_user_id:
        return

    doc = build_notification_doc(
        notification_type="team_backlog_alert",
        title="Team backlog alert",
        message=f"Your team has {backlog_count} items in backlog. Review assignments.",
        target_url="/admin/supervisor-dashboard",
        recipient_user_id=supervisor_user_id,
        entity_type="team",
        entity_id="backlog",
        priority="urgent",
        action_key="backlog_threshold",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


async def notify_supervisor_sla_breach_risk(
    db,
    *,
    supervisor_user_id: str | None,
    opportunity_id: str,
    title: str,
    days_overdue: int,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify supervisor when an opportunity is at SLA breach risk"""
    if not supervisor_user_id:
        return

    doc = build_notification_doc(
        notification_type="sla_breach_risk",
        title="SLA breach risk",
        message=f"{title} is {days_overdue} days overdue. Immediate action required.",
        target_url="/admin/sla-alerts",
        recipient_user_id=supervisor_user_id,
        entity_type="sales_opportunity",
        entity_id=opportunity_id,
        priority="urgent",
        action_key="sla_breach_alert",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)


async def notify_supervisor_underperforming_staff(
    db,
    *,
    supervisor_user_id: str | None,
    staff_user_id: str,
    staff_name: str,
    metric: str,
    triggered_by_user_id: str | None = None,
    triggered_by_role: str | None = None,
):
    """Notify supervisor about underperforming team member"""
    if not supervisor_user_id:
        return

    doc = build_notification_doc(
        notification_type="staff_underperformance",
        title="Performance alert",
        message=f"{staff_name} has low {metric}. Review performance.",
        target_url="/admin/staff-performance",
        recipient_user_id=supervisor_user_id,
        entity_type="staff",
        entity_id=staff_user_id,
        priority="high",
        action_key="performance_alert",
        triggered_by_user_id=triggered_by_user_id,
        triggered_by_role=triggered_by_role,
    )
    await db.notifications.insert_one(doc)
