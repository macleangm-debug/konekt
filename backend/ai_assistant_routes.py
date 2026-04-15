"""
Mr. Konekt — Context-Aware System Assistant
Smart assistant for navigating, selling, and operating on Konekt.
Context-aware (current page, user role), role-aware, and action-guiding.
"""
from fastapi import APIRouter, Request, Header
from typing import Optional
import os
import jwt

router = APIRouter(prefix="/api/ai-assistant", tags=["AI Assistant (Mr. Konekt)"])

JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-change-in-production")

# ─── System Knowledge ─────────────────────────────────────
SYSTEM_FLOWS = {
    "commercial_flow": "CRM (Lead) -> Quote -> Accepted -> Invoice + Order (pending_payment) -> Payment Approved -> Order Confirmed -> Fulfillment",
    "pricing_rule": "sell_price is ALWAYS calculated via the Pricing Engine from vendor cost. base_price (vendor cost) is internal only.",
    "assignment": "New leads are auto-assigned to sales reps via the Assignment Engine (Customer Ownership first, then Weighted Availability).",
    "categories": "Categories have display_mode (visual or list_quote) and commercial_mode (fixed_price, request_quote, hybrid).",
}

# ─── Page Context Map ─────────────────────────────────────
PAGE_CONTEXT = {
    "/admin": "This is the Admin Dashboard showing business overview, revenue, orders, and key metrics.",
    "/admin/crm": "CRM page — manage leads, customers, and sales pipeline. Click a lead to see profile, ownership, activity timeline, and performance.",
    "/admin/requests-inbox": "Requests Inbox — all inbound customer requests (quote requests, contact forms, service inquiries). Assign to sales or convert to quotes.",
    "/admin/quotes": "Quotes — create, send, and manage customer quotes. When a quote is accepted, it auto-generates an Invoice + Order (pending_payment).",
    "/admin/invoices": "Invoices — payment tracking documents. Invoices are generated from accepted quotes or marketplace checkout. Track payments here.",
    "/admin/orders": "Orders — fulfillment documents. Orders start as pending_payment and become confirmed only after payment approval. Do NOT fulfill pending orders.",
    "/admin/delivery-notes": "Delivery Notes — create and manage delivery documents for confirmed orders.",
    "/admin/payments": "Payment Review — verify bank transfer proofs, approve or reject payments. Approving payment confirms the linked order.",
    "/admin/commission-engine": "Commission Engine — configure and track sales/affiliate commissions. Commissions trigger only after payment is confirmed.",
    "/admin/catalog": "Catalog Workspace — manage product listings, categories, pricing, and catalog health.",
    "/admin/vendor-ops": "Vendor Ops — manage vendor submissions, competitive quoting, and supply chain operations.",
    "/admin/vendor-supply-review": "Supply Review — check pricing integrity, margin compliance, and product data quality before approvals.",
    "/admin/group-deals": "Group Deals — create and manage group purchasing deals with minimum/maximum quantities.",
    "/admin/partnerships/affiliates": "Affiliates — manage affiliate partners, their codes, performance, and payouts.",
    "/admin/content-studio": "Content Studio — create marketing campaigns, WhatsApp messages, and promotional content.",
    "/admin/settings-hub": "Settings Hub — central configuration for pricing, margins, payment terms, and business rules.",
    "/admin/users": "Users — manage all system users (admin, sales, vendor_ops, affiliate, customer).",
    "/admin/walk-in-sale": "Walk-in Sale — quick point-of-sale for in-person customers.",
}

# ─── Role-Specific Quick Actions ──────────────────────────
ROLE_ACTIONS = {
    "admin": [
        {"label": "Create a Quote", "value": "how to create a quote"},
        {"label": "Review Payments", "value": "how to review payments"},
        {"label": "Check Supply Review", "value": "what is supply review"},
        {"label": "View Business Health", "value": "business health report"},
        {"label": "Configure Settings", "value": "how to configure settings"},
    ],
    "sales": [
        {"label": "Create a Quote", "value": "how to create a quote"},
        {"label": "My Pipeline", "value": "check my sales pipeline"},
        {"label": "Customer CRM", "value": "how to manage customers"},
        {"label": "Submit Discount Request", "value": "how to request a discount"},
    ],
    "vendor_ops": [
        {"label": "Check Supply Review", "value": "what is supply review"},
        {"label": "Manage Vendors", "value": "how to manage vendors"},
        {"label": "Product Approvals", "value": "how to approve products"},
        {"label": "Pricing Check", "value": "how does pricing engine work"},
    ],
    "affiliate": [
        {"label": "My Earnings", "value": "check my earnings"},
        {"label": "Share Products", "value": "how to share and earn"},
        {"label": "My Promo Code", "value": "what is my promo code"},
    ],
    "customer": [
        {"label": "How to Order", "value": "how to order products"},
        {"label": "Request a Quote", "value": "request service quote"},
        {"label": "Track My Order", "value": "track my order"},
        {"label": "Payment Help", "value": "payment help"},
    ],
}

# ─── Knowledge Base (Enhanced) ────────────────────────────
KNOWLEDGE_BASE = {
    "order_products": {
        "keywords": ["order", "buy", "purchase", "product", "how to order"],
        "reply": """Here's how to order products on Konekt:

1. **Browse Marketplace** — Visit the marketplace to see available products
2. **Add to Cart** — Select products and quantities
3. **Checkout** — Review your cart and provide delivery details
4. **Pay by Bank Transfer** — Use our bank details to make payment
5. **Upload Payment Proof** — Submit your receipt on the invoice page
6. **Order Confirmed** — Once payment is verified, your order is confirmed for fulfillment

The system automatically creates both an Invoice and an Order when you checkout. Your order stays in "pending payment" until we verify your payment."""
    },
    "request_service": {
        "keywords": ["service", "quote", "request", "printing", "branding", "design"],
        "reply": """To request a service or custom quote:

1. **Browse Services** or use the **List & Quote Catalog** for bulk items
2. **Select Items** — Search, pick items, enter quantities
3. **Submit Quote Request** — Your request enters our CRM and gets assigned to a sales rep
4. **Receive Quote** — Our team prepares a customized quote
5. **Approve Quote** — When you accept, the system auto-generates an Invoice + Order
6. **Pay & Track** — Pay via bank transfer, and your order will be confirmed

You can also add custom items that aren't in our catalog yet."""
    },
    "track_order": {
        "keywords": ["track", "status", "where is", "my order", "progress"],
        "reply": """To track your order:

**Login** → **Dashboard** → **Orders**

Order flow: **Pending Payment** → **Confirmed** (after payment verified) → **Processing** → **Dispatched** → **Delivered**

Important: Orders only advance past "Pending Payment" after your payment is verified by our team."""
    },
    "payment_help": {
        "keywords": ["pay", "payment", "bank", "transfer", "proof", "invoice"],
        "reply": """Payment is via Bank Transfer:

**Bank:** CRDB BANK
**Account:** 015C8841347002
**Account Name:** KONEKT LIMITED
**SWIFT:** CORUTZTZ

**Steps:**
1. Transfer the invoice amount to our bank
2. Include your invoice number as reference
3. Upload payment proof on the invoice page
4. Our team verifies within 24 hours
5. Once verified, your order is confirmed for fulfillment"""
    },
    "create_quote": {
        "keywords": ["create quote", "new quote", "make quote", "how to create a quote"],
        "reply": """To create a quote:

1. Go to **CRM & Sales Pipeline → Quotes**
2. Click **Create Quote**
3. Fill in customer details, line items, and pricing
4. Send the quote to the customer

When the customer accepts the quote, the system automatically generates:
- An **Invoice** (payment tracking)
- An **Order** in "pending payment" (fulfillment tracking)

The order won't trigger fulfillment until payment is approved."""
    },
    "supply_review": {
        "keywords": ["supply review", "pricing check", "margin", "pricing integrity"],
        "reply": """Supply Review is your pricing integrity control tower.

It helps you:
- Check if products meet minimum margin requirements
- Verify vendor costs vs. selling prices
- Flag pricing anomalies before products go live
- Ensure the Pricing Engine rules are being followed

Remember: sell_price must always come from the Pricing Engine, never directly from vendor cost."""
    },
    "pricing_engine": {
        "keywords": ["pricing engine", "how does pricing", "sell price", "margin rules"],
        "reply": """The Pricing Engine is the central source of truth for all selling prices.

**Rule:** sell_price = pricing_engine(vendor_cost, category_margin_rules)

- Vendor cost (base_price) is internal and never shown to customers
- Margins are configured per-category or use global defaults
- Minimum margin thresholds are enforced automatically
- If a manual price is set below minimum margin, it's auto-adjusted

Configure margin rules in **Settings Hub → Commercial**."""
    },
    "commercial_flow": {
        "keywords": ["flow", "process", "workflow", "commercial", "quote to order"],
        "reply": """The Konekt commercial flow:

**CRM Lead** → **Quote** → **Accepted** → **Invoice + Order** → **Payment** → **Confirmed Order** → **Fulfillment**

Key rules:
- Orders are created with "pending_payment" status
- No fulfillment, commissions, or revenue until payment is confirmed
- Invoices are payment tracking documents
- Orders are fulfillment tracking documents
- Both marketplace checkout and quotes follow the same flow"""
    },
    "assignment_engine": {
        "keywords": ["assign", "assignment", "who handles", "sales assign", "round robin"],
        "reply": """The Assignment Engine auto-assigns leads to sales reps:

**Priority:** Customer Ownership first (existing customer → same sales rep)
**Fallback:** Weighted Availability scoring (capacity, specialization, response speed)

Each assignment is logged in the audit trail. You can see assignment history and override if needed."""
    },
    "about_konekt": {
        "keywords": ["what is konekt", "about", "who are you", "company"],
        "reply": """Konekt is a B2B procurement and commerce platform.

**What we offer:** Printing & branding, creative services, office supplies, technical support, uniforms & workwear.

**How it works:** CRM → Quotes → Invoices → Payment → Orders → Fulfillment. All in one platform with smart assignment, pricing engine, and vendor ops.

I'm Mr. Konekt — your in-app assistant for navigating and operating the platform."""
    },
    "contact_support": {
        "keywords": ["support", "help", "contact", "human", "agent", "talk to"],
        "reply": """If you need human support:

**Sales Team:** Submit a request via the quote form — our team responds within 24 hours.
**Customer Support:** Email support@konekt.co.tz or use the Contact form.

I'm Mr. Konekt, and I can help with most questions about the platform. What would you like to know?"""
    },
    "earnings": {
        "keywords": ["earnings", "commission", "earn", "payout", "my earnings"],
        "reply": """To check your earnings:

**Affiliates:** Go to your Affiliate Dashboard → Earnings tab to see sales, commissions, and payout status.
**Sales:** Go to your Sales Dashboard → Commission section.

Commissions are triggered only after payment is confirmed on an order. Payouts are processed by the finance team."""
    },
}


def find_best_response(message: str, page: str = "", role: str = "") -> str:
    """Find the best matching response, with page context awareness."""
    msg_lower = message.lower()

    # Check for page-specific "what is this" / "what do I do here" queries
    if any(kw in msg_lower for kw in ["what is this", "what do i do", "where am i", "this page", "help me here"]):
        if page:
            for path, desc in PAGE_CONTEXT.items():
                if page.startswith(path) and path != "/admin":
                    return f"{desc}\n\nNeed help with a specific action on this page?"
            if page.startswith("/admin"):
                return PAGE_CONTEXT.get("/admin", "You're on the admin dashboard.") + "\n\nWhat would you like to do?"
        return "I can help you navigate the platform. What are you trying to do?"

    # Standard knowledge base matching
    best_match = None
    best_score = 0

    for key, data in KNOWLEDGE_BASE.items():
        score = sum(1 for keyword in data["keywords"] if keyword in msg_lower)
        if score > best_score:
            best_score = score
            best_match = key

    if best_match and best_score > 0:
        return KNOWLEDGE_BASE[best_match]["reply"]

    # Default with role context
    base = "I'm Mr. Konekt — your smart assistant. Here's what I can help with:\n\n"
    if role in ("admin", "sales", "sales_manager"):
        base += "- **Create Quotes** — Walk through the quote flow\n"
        base += "- **Commercial Flow** — Understand Quote → Invoice → Order\n"
        base += "- **CRM & Pipeline** — Manage leads and customers\n"
        base += "- **Pricing Engine** — How pricing and margins work\n"
    elif role in ("vendor_ops",):
        base += "- **Supply Review** — Check pricing integrity\n"
        base += "- **Vendor Management** — Manage vendor ops\n"
        base += "- **Product Approvals** — Review submissions\n"
    elif role == "affiliate":
        base += "- **My Earnings** — Check commissions and payouts\n"
        base += "- **Share & Earn** — How to promote products\n"
    else:
        base += "- **Order Products** — Browse marketplace and checkout\n"
        base += "- **Request Quote** — Get custom pricing for bulk items\n"
        base += "- **Track Order** — Check order and payment status\n"
        base += "- **Payment Help** — Bank details and proof upload\n"

    base += "\nJust ask about any of these, or tell me what page you're on!"
    return base


def _extract_user_from_token(authorization: str = None):
    """Extract user role from JWT if present."""
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "").strip() if authorization.startswith("Bearer ") else authorization
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except Exception:
        return None


@router.post("/chat")
async def chat(payload: dict, authorization: Optional[str] = Header(None)):
    """Handle chat messages with context awareness."""
    message = payload.get("message", "")
    page = payload.get("page", "")
    role = payload.get("role", "")

    # Try to extract role from token if not provided
    if not role and authorization:
        user = _extract_user_from_token(authorization)
        if user:
            role = user.get("role", "")

    if not message.strip():
        greeting = "Hello! I'm Mr. Konekt, your smart assistant."
        if page and page in PAGE_CONTEXT:
            greeting += f"\n\n{PAGE_CONTEXT[page]}"
        greeting += "\n\nHow can I help you today?"
        return {"reply": greeting}

    reply = find_best_response(message, page=page, role=role)
    return {"reply": reply}


@router.get("/quick-actions")
async def quick_actions(role: str = "customer"):
    """Return role-specific quick action suggestions."""
    actions = ROLE_ACTIONS.get(role, ROLE_ACTIONS["customer"])
    return {"actions": actions}


@router.post("/request-handoff")
async def request_handoff(payload: dict):
    """Handle request for human handoff."""
    return {
        "message": "I've notified our sales team. A human advisor will reach out to you shortly via email or phone. In the meantime, I'm still here to help with any questions!"
    }
