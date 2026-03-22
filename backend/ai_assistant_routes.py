"""
Konekt AI Assistant Routes
Handles chat interactions with scripted responses for common queries.
Ready to upgrade to GPT-powered assistant later.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/ai-assistant", tags=["AI Assistant"])

# Knowledge base for common queries
KNOWLEDGE_BASE = {
    "order_products": {
        "keywords": ["order", "buy", "purchase", "product", "how to order"],
        "reply": """To order products from Konekt:

1. **Browse Marketplace** - Visit /marketplace to see available products
2. **Add to Cart** - Click on products and add them to your cart
3. **Login/Register** - Create an account or login when ready to checkout
4. **Checkout** - Review your cart and proceed to checkout
5. **Pay by Bank Transfer** - Use our bank details to make payment
6. **Upload Payment Proof** - Submit your payment receipt
7. **Track Order** - Monitor progress from your account dashboard

Would you like me to guide you through any specific step?"""
    },
    "request_service": {
        "keywords": ["service", "quote", "request", "printing", "branding", "design"],
        "reply": """To request a service from Konekt:

1. **Browse Services** - Visit /services to explore our offerings
2. **Select Service** - Open the service page that interests you
3. **Request Quote** - Click 'Request Quote' or 'Start Service Request'
4. **Fill Brief** - Provide details about your requirements
5. **Receive Quote** - Our team will prepare a customized quote
6. **Approve & Pay** - Accept the quote and receive an invoice
7. **Track Progress** - Monitor service delivery from your dashboard

What type of service are you looking for?"""
    },
    "track_order": {
        "keywords": ["track", "status", "where is", "my order", "progress"],
        "reply": """To track your order or service:

**For Product Orders:**
- Login to your account
- Go to Dashboard → Orders
- Click on any order to see detailed status and timeline

**For Service Requests:**
- Login to your account
- Go to Dashboard → Service Requests
- View current stage and partner updates

**Order Statuses:** Received → Payment Pending → Confirmed → Processing → Dispatched → Delivered

**Service Statuses:** Request Received → Quote Sent → Approved → Partner Assigned → In Progress → Completed

Need help finding a specific order?"""
    },
    "payment_help": {
        "keywords": ["pay", "payment", "bank", "transfer", "proof", "invoice"],
        "reply": """Payment information for Konekt:

**Payment Method:** Bank Transfer (only active method currently)

**Bank Details:**
- Bank: CRDB BANK
- Account: 015C8841347002
- SWIFT: CORUTZTZ

**How to Pay:**
1. Transfer the invoice amount to our bank account
2. Include your invoice number as reference
3. Login to your account and go to the invoice
4. Click 'Pay Invoice' and upload your payment proof
5. Our team will verify and confirm within 24 hours

**Payment Timeline:** You can track payment status in real-time on your invoice page.

Do you need help with a specific invoice?"""
    },
    "pricing": {
        "keywords": ["price", "cost", "how much", "pricing", "rates"],
        "reply": """Pricing at Konekt depends on your specific requirements.

**For Products:**
- Browse the marketplace to see listed prices
- Prices are shown in TZS (Tanzanian Shillings)
- Bulk orders may qualify for discounts

**For Services:**
- Services are quoted based on scope and requirements
- Request a quote to get customized pricing
- No obligation - compare and decide at your pace

**Get a Quote:**
Visit /request-quote to submit your requirements and receive a detailed quote within 24 hours.

What would you like to get pricing for?"""
    },
    "contact_support": {
        "keywords": ["support", "help", "contact", "human", "agent", "talk to"],
        "reply": """I can help with most questions, but if you need human support:

**Sales Team:** For quotes, pricing, and business inquiries
- Submit a request via /request-quote
- Our sales team responds within 24 hours

**Customer Support:** For order issues and technical help
- Email: support@konekt.co.tz
- Use the 'Contact Us' form on the website

**For Urgent Issues:**
- Login to your account
- Create a support ticket from your dashboard

Is there something specific I can help you resolve first?"""
    },
    "about_konekt": {
        "keywords": ["what is konekt", "about", "who are you", "company"],
        "reply": """Konekt is a B2B platform for promotional materials and business services.

**What We Offer:**
- 🖨️ Printing & Branding (business cards, banners, signage)
- 🎨 Creative & Design services
- 🏢 Office supplies and furniture
- 🛠️ Technical support and installations
- 👔 Uniforms & workwear

**Why Konekt:**
- Structured quote and approval workflows
- Country-aware routing and partner fulfillment
- Better visibility from request to delivery
- One platform for products and services

**Who We Serve:**
Procurement teams, corporate operations, creative buyers, and service-driven organizations.

How can I help you get started?"""
    }
}

def find_best_response(message: str) -> str:
    """Find the best matching response from knowledge base."""
    msg_lower = message.lower()
    
    best_match = None
    best_score = 0
    
    for key, data in KNOWLEDGE_BASE.items():
        score = sum(1 for keyword in data["keywords"] if keyword in msg_lower)
        if score > best_score:
            best_score = score
            best_match = key
    
    if best_match and best_score > 0:
        return KNOWLEDGE_BASE[best_match]["reply"]
    
    # Default response
    return """I'm here to help with Konekt services. Here's what I can assist with:

• **Order Products** - How to browse and purchase from marketplace
• **Request Services** - Get quotes for printing, design, and more
• **Track Orders** - Check status of your orders or services
• **Payment Help** - Bank details and payment proof upload
• **Pricing** - Get quotes and understand our pricing

Just ask me about any of these, or type your question!"""

@router.post("/chat")
async def chat(payload: dict):
    """Handle chat messages and return appropriate responses."""
    message = payload.get("message", "")
    
    if not message.strip():
        return {"reply": "Hello! How can I assist you with Konekt services today?"}
    
    reply = find_best_response(message)
    return {"reply": reply}

@router.get("/quick-actions")
async def quick_actions():
    """Return list of quick action suggestions."""
    return {
        "actions": [
            {"label": "How to order products?", "value": "how to order products"},
            {"label": "Request a service quote", "value": "request service quote"},
            {"label": "Track my order", "value": "track order status"},
            {"label": "Payment help", "value": "payment help bank transfer"},
            {"label": "Talk to support", "value": "contact support human"},
        ]
    }
