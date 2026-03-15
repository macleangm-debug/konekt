from notification_config import FRONTEND_URL


def base_email_layout(title: str, body_html: str):
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
      </div>
    </div>
    """


def quote_ready_email(customer_name, quote_number, total, currency, quote_id):
    return base_email_layout(
        "Your Quote is Ready",
        f"""
        <h2 style="margin-top:0; color:#20364D;">Hello {customer_name or 'Customer'},</h2>
        <p>Your quote <strong>{quote_number}</strong> is ready for review.</p>
        <p><strong>Total:</strong> {currency} {total:,.0f}</p>
        <p>You can preview and approve it directly in your client portal.</p>
        <p style="margin-top:24px;">
          <a href="{FRONTEND_URL}/dashboard/quotes/{quote_id}" style="background:#20364D;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">
            Review Quote
          </a>
        </p>
        """,
    )


def invoice_ready_email(customer_name, invoice_number, total, currency, invoice_id):
    return base_email_layout(
        "Invoice Available",
        f"""
        <h2 style="margin-top:0; color:#20364D;">Hello {customer_name or 'Customer'},</h2>
        <p>Your invoice <strong>{invoice_number}</strong> is now available.</p>
        <p><strong>Total:</strong> {currency} {total:,.0f}</p>
        <p>You can preview the invoice and complete payment in your portal.</p>
        <p style="margin-top:24px;">
          <a href="{FRONTEND_URL}/dashboard/invoices/{invoice_id}" style="background:#20364D;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">
            View Invoice
          </a>
        </p>
        """,
    )


def service_update_email(customer_name, service_title, status, request_id, note=""):
    note_html = f"<p><strong>Update:</strong> {note}</p>" if note else ""
    return base_email_layout(
        "Service Request Update",
        f"""
        <h2 style="margin-top:0; color:#20364D;">Hello {customer_name or 'Customer'},</h2>
        <p>Your service request <strong>{service_title}</strong> has been updated.</p>
        <p><strong>Status:</strong> {status}</p>
        {note_html}
        <p style="margin-top:24px;">
          <a href="{FRONTEND_URL}/dashboard/service-requests/{request_id}" style="background:#20364D;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600;">
            Track Request
          </a>
        </p>
        """,
    )


def payment_received_email(customer_name, document_number, amount, currency):
    return base_email_layout(
        "Payment Received",
        f"""
        <h2 style="margin-top:0; color:#20364D;">Hello {customer_name or 'Customer'},</h2>
        <p>We have received your payment successfully.</p>
        <p><strong>Reference:</strong> {document_number}</p>
        <p><strong>Amount:</strong> {currency} {amount:,.0f}</p>
        <p>Thank you for choosing Konekt.</p>
        """,
    )
