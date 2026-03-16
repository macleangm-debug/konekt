"""
Email Templates V2
Premium HTML email templates for Konekt notifications
"""
from notification_config import FRONTEND_URL


def base_email_layout(title: str, body_html: str):
    """Base email layout with Konekt branding"""
    return f"""
    <div style="font-family: Arial, sans-serif; background:#f8fafc; padding:32px;">
      <div style="max-width:680px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:18px; overflow:hidden;">
        <div style="background:#20364D; color:white; padding:24px 28px;">
          <div style="font-size:24px; font-weight:700;">Konekt</div>
          <div style="opacity:0.9; margin-top:6px;">{title}</div>
        </div>
        <div style="padding:28px;">
          {body_html}
        </div>
        <div style="background:#f1f5f9; padding:16px 28px; text-align:center; font-size:12px; color:#64748b;">
          &copy; 2026 Konekt. All rights reserved.
        </div>
      </div>
    </div>
    """


def quote_ready_email(customer_name, quote_number, total, currency, quote_id):
    """Email template for quote ready notification"""
    return base_email_layout(
        "Your Quote is Ready",
        f"""
        <h2 style="margin-top:0; color:#20364D;">Hello {customer_name or 'Customer'},</h2>
        <p>Your quote <strong>{quote_number}</strong> is ready for review.</p>
        <p><strong>Total:</strong> {currency} {total:,.0f}</p>
        <p>You can preview and approve it directly in your client portal.</p>
        <p style="margin-top:24px;">
          <a href="{FRONTEND_URL}/dashboard/quotes/{quote_id}" style="background:#20364D;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;display:inline-block;">
            Review Quote
          </a>
        </p>
        <p style="margin-top:24px; color:#64748b; font-size:13px;">
          If you have any questions, please don't hesitate to reach out to our team.
        </p>
        """,
    )


def invoice_ready_email(customer_name, invoice_number, total, currency, invoice_id):
    """Email template for invoice ready notification"""
    return base_email_layout(
        "Invoice Available",
        f"""
        <h2 style="margin-top:0; color:#20364D;">Hello {customer_name or 'Customer'},</h2>
        <p>Your invoice <strong>{invoice_number}</strong> is now available.</p>
        <p><strong>Total:</strong> {currency} {total:,.0f}</p>
        <p>You can preview the invoice and complete payment in your portal.</p>
        <p style="margin-top:24px;">
          <a href="{FRONTEND_URL}/dashboard/invoices/{invoice_id}" style="background:#20364D;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;display:inline-block;">
            View Invoice
          </a>
        </p>
        <p style="margin-top:24px; color:#64748b; font-size:13px;">
          Thank you for your business!
        </p>
        """,
    )


def service_update_email(customer_name, service_title, status, request_id, note=""):
    """Email template for service request update notification"""
    note_html = f"<p><strong>Update:</strong> {note}</p>" if note else ""
    return base_email_layout(
        "Service Request Update",
        f"""
        <h2 style="margin-top:0; color:#20364D;">Hello {customer_name or 'Customer'},</h2>
        <p>Your service request <strong>{service_title}</strong> has been updated.</p>
        <p><strong>Status:</strong> <span style="background:#e0f2fe; color:#0369a1; padding:4px 10px; border-radius:6px; font-weight:600;">{status}</span></p>
        {note_html}
        <p style="margin-top:24px;">
          <a href="{FRONTEND_URL}/dashboard/service-requests/{request_id}" style="background:#20364D;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;display:inline-block;">
            Track Request
          </a>
        </p>
        """,
    )


def payment_received_email(customer_name, document_number, amount, currency):
    """Email template for payment received notification"""
    return base_email_layout(
        "Payment Received",
        f"""
        <h2 style="margin-top:0; color:#20364D;">Hello {customer_name or 'Customer'},</h2>
        <p style="color:#059669; font-weight:600;">We have received your payment successfully!</p>
        <p><strong>Reference:</strong> {document_number}</p>
        <p><strong>Amount:</strong> {currency} {amount:,.0f}</p>
        <p style="margin-top:24px;">Thank you for choosing Konekt. We appreciate your business!</p>
        <p style="margin-top:24px;">
          <a href="{FRONTEND_URL}/dashboard" style="background:#20364D;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;display:inline-block;">
            Go to Dashboard
          </a>
        </p>
        """,
    )


def order_confirmation_email(customer_name, order_number, total, currency, order_id):
    """Email template for order confirmation"""
    return base_email_layout(
        "Order Confirmation",
        f"""
        <h2 style="margin-top:0; color:#20364D;">Hello {customer_name or 'Customer'},</h2>
        <p style="color:#059669; font-weight:600;">Your order has been received!</p>
        <p><strong>Order Number:</strong> {order_number}</p>
        <p><strong>Total:</strong> {currency} {total:,.0f}</p>
        <p style="margin-top:16px;">We'll notify you when your order status changes.</p>
        <p style="margin-top:24px;">
          <a href="{FRONTEND_URL}/dashboard/orders/{order_id}" style="background:#20364D;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;display:inline-block;">
            Track Order
          </a>
        </p>
        """,
    )
