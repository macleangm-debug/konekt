def quote_email_html(*, customer_name: str, quote_number: str):
    return f"""
    <div style="font-family: Arial, sans-serif; color: #20364D;">
      <h2>Your quote is ready</h2>
      <p>Hello {customer_name or 'Customer'},</p>
      <p>Your quote <strong>{quote_number}</strong> is ready for review.</p>
      <p>Please sign in to your Konekt account to view and approve it.</p>
    </div>
    """


def invoice_email_html(*, customer_name: str, invoice_number: str):
    return f"""
    <div style="font-family: Arial, sans-serif; color: #20364D;">
      <h2>Your invoice is ready</h2>
      <p>Hello {customer_name or 'Customer'},</p>
      <p>Your invoice <strong>{invoice_number}</strong> has been issued.</p>
      <p>Please use the invoice reference when making payment.</p>
    </div>
    """


def payment_received_email_html(*, customer_name: str, reference: str):
    return f"""
    <div style="font-family: Arial, sans-serif; color: #20364D;">
      <h2>Payment proof received</h2>
      <p>Hello {customer_name or 'Customer'},</p>
      <p>We have received your payment proof for reference <strong>{reference}</strong>.</p>
      <p>Our finance team will review it shortly.</p>
    </div>
    """


def partner_application_received_html(*, company_name: str, country_code: str):
    return f"""
    <div style="font-family: Arial, sans-serif; color: #20364D;">
      <h2>Application received</h2>
      <p>Hello {company_name or 'Partner'},</p>
      <p>We have received your Konekt partner application for <strong>{country_code}</strong>.</p>
      <p>Our team will review it and contact you if you are shortlisted.</p>
    </div>
    """


def order_confirmation_email_html(*, customer_name: str, order_number: str):
    return f"""
    <div style="font-family: Arial, sans-serif; color: #20364D;">
      <h2>Order confirmed</h2>
      <p>Hello {customer_name or 'Customer'},</p>
      <p>Your order <strong>{order_number}</strong> has been confirmed.</p>
      <p>We will begin processing your order shortly.</p>
    </div>
    """


def affiliate_welcome_email_html(*, affiliate_name: str, affiliate_code: str):
    return f"""
    <div style="font-family: Arial, sans-serif; color: #20364D;">
      <h2>Welcome to Konekt Affiliate Program</h2>
      <p>Hello {affiliate_name or 'Affiliate'},</p>
      <p>Your affiliate account is now active!</p>
      <p>Your affiliate code is: <strong>{affiliate_code}</strong></p>
      <p>Start sharing your referral link to earn commissions.</p>
    </div>
    """
