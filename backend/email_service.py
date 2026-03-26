"""
Email Service for Konekt Platform
Using Resend for transactional emails
"""
import os
import asyncio
import logging
import resend
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'info@konekt.co.tz')

# Initialize Resend
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY


class EmailService:
    """Resend email service for Konekt"""
    
    @staticmethod
    async def send_email(to_email: str, subject: str, html_content: str) -> bool:
        """Send an email via Resend (async, non-blocking)"""
        if not RESEND_API_KEY:
            logger.warning("Resend API key not configured. Email not sent.")
            return False
        
        try:
            params = {
                "from": f"Konekt <{SENDER_EMAIL}>",
                "to": [to_email],
                "subject": subject,
                "html": html_content
            }
            
            # Run sync SDK in thread to keep FastAPI non-blocking
            result = await asyncio.to_thread(resend.Emails.send, params)
            logger.info(f"Email sent to {to_email}, id: {result.get('id')}")
            return True
        except Exception as e:
            # Note: In Resend test mode, emails can only be sent to verified addresses
            # To enable sending to all recipients, verify a domain at resend.com/domains
            error_msg = str(e)
            if "testing emails" in error_msg.lower() or "verify a domain" in error_msg.lower():
                logger.warning(f"Email to {to_email} skipped (Resend test mode - verify domain for production)")
            else:
                logger.error(f"Failed to send email to {to_email}: {error_msg}")
            return False

    @staticmethod
    async def send_welcome_email(to_email: str, customer_name: str, referral_code: str):
        """Send welcome email to new user"""
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
                <tr>
                    <td style="background: #2D3E50; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0; font-size: 28px;">Welcome to Konekt! 🎉</h1>
                    </td>
                </tr>
                <tr>
                    <td style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                        <p style="font-size: 16px;">Hi {customer_name},</p>
                        
                        <p>Welcome to Konekt! We're thrilled to have you join our community of businesses creating amazing branded products.</p>
                        
                        <p><strong>What you can do:</strong></p>
                        <ul style="padding-left: 20px;">
                            <li>Browse our catalog of promotional materials</li>
                            <li>Customize products with your logo</li>
                            <li>Order KonektSeries branded apparel</li>
                            <li>Track your orders in real-time</li>
                        </ul>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" style="background: white; border: 2px solid #D4A843; border-radius: 10px; padding: 20px; margin: 20px 0;">
                            <tr>
                                <td style="text-align: center; padding: 15px;">
                                    <p style="margin: 0; color: #666; font-size: 14px;">Your Referral Code</p>
                                    <p style="margin: 10px 0; font-size: 24px; font-weight: bold; color: #D4A843;">{referral_code}</p>
                                    <p style="margin: 0; color: #666; font-size: 12px;">Share with friends and earn 10% credit on their first order!</p>
                                </td>
                            </tr>
                        </table>
                        
                        <p style="text-align: center;">
                            <a href="https://pdf-stamp-test.preview.emergentagent.com/products" style="display: inline-block; background: #D4A843; color: #2D3E50; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">Start Shopping</a>
                        </p>
                        
                        <p style="margin-top: 30px;">Questions? Reply to this email or contact us at info@konekt.co.tz</p>
                        
                        <p>Best regards,<br><strong>The Konekt Team</strong></p>
                    </td>
                </tr>
                <tr>
                    <td style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
                        <p style="margin: 0;">Konekt Limited | Dar es Salaam, Tanzania</p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        
        return await EmailService.send_email(to_email, "Welcome to Konekt! 🎉", html_content)

    @staticmethod
    async def send_order_confirmation(to_email: str, order_id: str, order_number: str, order_items: list, total: float, deposit: float, customer_name: str = "Customer"):
        """Send order confirmation to customer"""
        items_html = "".join([
            f"""<tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{item.get('product_name', 'Product')}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">{item.get('quantity', 1)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">TZS {item.get('subtotal', 0):,.0f}</td>
            </tr>"""
            for item in order_items
        ])
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
                <tr>
                    <td style="background: #2D3E50; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0; font-size: 28px;">Order Confirmed! 🎉</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for your order</p>
                    </td>
                </tr>
                <tr>
                    <td style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                        <p style="font-size: 16px;">Hi {customer_name},</p>
                        <p>Great news! We've received your order and it's being processed.</p>
                        
                        <p><strong>Order Number:</strong> {order_number}</p>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 20px 0;">
                            <thead>
                                <tr>
                                    <th style="background: #2D3E50; color: white; padding: 12px; text-align: left;">Product</th>
                                    <th style="background: #2D3E50; color: white; padding: 12px; text-align: center;">Qty</th>
                                    <th style="background: #2D3E50; color: white; padding: 12px; text-align: right;">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items_html}
                                <tr>
                                    <td colspan="2" style="padding: 15px; text-align: right; font-weight: bold;">Total:</td>
                                    <td style="padding: 15px; text-align: right; color: #D4A843; font-weight: bold; font-size: 18px;">TZS {total:,.0f}</td>
                                </tr>
                                <tr>
                                    <td colspan="2" style="padding: 10px; text-align: right;">Deposit Required:</td>
                                    <td style="padding: 10px; text-align: right;">TZS {deposit:,.0f}</td>
                                </tr>
                            </tbody>
                        </table>
                        
                        <p>We'll send you another email when your order status changes.</p>
                        
                        <p style="text-align: center;">
                            <a href="https://pdf-stamp-test.preview.emergentagent.com/orders/{order_id}" style="display: inline-block; background: #D4A843; color: #2D3E50; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">Track Your Order</a>
                        </p>
                    </td>
                </tr>
                <tr>
                    <td style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
                        <p style="margin: 0;">Konekt Limited | Dar es Salaam, Tanzania</p>
                        <p style="margin: 5px 0 0 0;">Questions? Contact us at info@konekt.co.tz</p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        
        return await EmailService.send_email(to_email, f"Order Confirmed - {order_number}", html_content)

    @staticmethod
    async def send_order_status_update(to_email: str, order_id: str, order_number: str, new_status: str, customer_name: str = "Customer"):
        """Send order status update to customer"""
        status_messages = {
            "pending": ("Order Received", "Your order has been received and is awaiting deposit payment.", "📋"),
            "deposit_paid": ("Deposit Received", "We've received your deposit! Your order is now in design review.", "💳"),
            "design_review": ("Design Review", "Our team is reviewing your design. We'll reach out if we have any questions.", "🎨"),
            "approved": ("Design Approved", "Your design has been approved and production will begin shortly.", "✅"),
            "printing": ("In Production", "Your order is being produced! We're working hard to deliver quality.", "🏭"),
            "quality_check": ("Quality Check", "Your order is undergoing final quality inspection.", "🔍"),
            "ready": ("Ready for Delivery", "Great news! Your order is ready and will be dispatched soon.", "📦"),
            "shipped": ("Order Shipped", "Your order is on its way! Track it using the link below.", "🚚"),
            "delivered": ("Order Delivered", "Your order has been delivered. We hope you love it!", "🎉"),
            "cancelled": ("Order Cancelled", "Your order has been cancelled. Contact us if you have questions.", "❌"),
        }
        
        title, message, emoji = status_messages.get(new_status, ("Order Update", f"Your order status has been updated to: {new_status}", "📬"))
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
                <tr>
                    <td style="background: #2D3E50; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0; font-size: 28px;">{title} {emoji}</h1>
                    </td>
                </tr>
                <tr>
                    <td style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                        <p style="font-size: 16px;">Hi {customer_name},</p>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" style="text-align: center; margin: 30px 0;">
                            <tr>
                                <td>
                                    <span style="display: inline-block; background: #D4A843; color: #2D3E50; padding: 10px 25px; border-radius: 20px; font-weight: bold; text-transform: uppercase;">{new_status.replace('_', ' ')}</span>
                                </td>
                            </tr>
                        </table>
                        
                        <p>{message}</p>
                        
                        <p><strong>Order Number:</strong> {order_number}</p>
                        
                        <p style="text-align: center; margin-top: 30px;">
                            <a href="https://pdf-stamp-test.preview.emergentagent.com/orders/{order_id}" style="display: inline-block; background: #D4A843; color: #2D3E50; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold;">View Order Details</a>
                        </p>
                    </td>
                </tr>
                <tr>
                    <td style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
                        <p style="margin: 0;">Konekt Limited | Dar es Salaam, Tanzania</p>
                        <p style="margin: 5px 0 0 0;">Questions? Contact us at info@konekt.co.tz</p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        
        return await EmailService.send_email(to_email, f"{title} - {order_number}", html_content)

    @staticmethod
    async def send_admin_new_order_notification(order_id: str, order_number: str, customer_email: str, customer_name: str, total: float, items_count: int):
        """Notify admin about new order"""
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
                <tr>
                    <td style="background: #2D3E50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h2 style="margin: 0;">📦 New Order Received</h2>
                    </td>
                </tr>
                <tr>
                    <td style="background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0;">
                            <tr><td><strong>Order Number:</strong></td><td>{order_number}</td></tr>
                            <tr><td><strong>Customer:</strong></td><td>{customer_name}</td></tr>
                            <tr><td><strong>Email:</strong></td><td>{customer_email}</td></tr>
                            <tr><td><strong>Items:</strong></td><td>{items_count}</td></tr>
                            <tr><td><strong>Total:</strong></td><td style="color: #D4A843; font-weight: bold;">TZS {total:,.0f}</td></tr>
                        </table>
                        
                        <p style="text-align: center; margin-top: 20px;">
                            <a href="https://pdf-stamp-test.preview.emergentagent.com/admin/orders" style="display: inline-block; background: #D4A843; color: #2D3E50; padding: 10px 25px; text-decoration: none; border-radius: 20px; font-weight: bold;">View in Admin</a>
                        </p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        
        return await EmailService.send_email(ADMIN_EMAIL, f"New Order: {order_number} - TZS {total:,.0f}", html_content)

    @staticmethod
    async def send_admin_consultation_notification(request_id: str, name: str, email: str, phone: str, company: str, request_type: str, service_type: str = None):
        """Notify admin about new consultation/maintenance request"""
        request_label = "Consultation Request" if request_type == "consultation" else "Service Request"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
                <tr>
                    <td style="background: #2D3E50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h2 style="margin: 0;">🔧 New {request_label}</h2>
                    </td>
                </tr>
                <tr>
                    <td style="background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px;">
                        <table width="100%" cellpadding="0" cellspacing="0" style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0;">
                            <tr><td style="padding: 5px 0;"><strong>Name:</strong></td><td style="padding: 5px 0;">{name}</td></tr>
                            <tr><td style="padding: 5px 0;"><strong>Company:</strong></td><td style="padding: 5px 0;">{company or 'Not specified'}</td></tr>
                            <tr><td style="padding: 5px 0;"><strong>Email:</strong></td><td style="padding: 5px 0;">{email}</td></tr>
                            <tr><td style="padding: 5px 0;"><strong>Phone:</strong></td><td style="padding: 5px 0;">{phone}</td></tr>
                            <tr><td style="padding: 5px 0;"><strong>Service:</strong></td><td style="padding: 5px 0;">{service_type or 'General Inquiry'}</td></tr>
                            <tr><td style="padding: 5px 0;"><strong>Type:</strong></td><td style="padding: 5px 0;">{request_type.capitalize()}</td></tr>
                        </table>
                        
                        <p style="text-align: center; margin-top: 20px;">
                            <a href="tel:{phone}" style="display: inline-block; background: #2D3E50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 20px; font-weight: bold; margin: 5px;">📞 Call</a>
                            <a href="mailto:{email}" style="display: inline-block; background: #2D3E50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 20px; font-weight: bold; margin: 5px;">✉️ Email</a>
                            <a href="https://pdf-stamp-test.preview.emergentagent.com/admin/maintenance" style="display: inline-block; background: #D4A843; color: #2D3E50; padding: 10px 20px; text-decoration: none; border-radius: 20px; font-weight: bold; margin: 5px;">View All</a>
                        </p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        
        return await EmailService.send_email(ADMIN_EMAIL, f"New {request_label}: {name}", html_content)
