"""
Konekt AI Services - Product Recommendations, Design Briefs, Pricing Suggestions
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/ai", tags=["AI Services"])

# Check for LLM key
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# Database connection
client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'konekt_db')]


class ProductRecommendationRequest(BaseModel):
    business_type: str
    campaign_goal: str
    budget: Optional[str] = "medium"
    audience: Optional[str] = "corporate"
    quantity_estimate: Optional[str] = "50-100"


class ProductRecommendationResponse(BaseModel):
    recommendations: List[dict]
    rationale: str
    total_estimate: Optional[str] = None


class DesignBriefRequest(BaseModel):
    service_type: str
    business_name: str
    industry: str
    goal: str
    target_audience: str
    tone: str
    additional_notes: Optional[str] = ""


class DesignBriefResponse(BaseModel):
    project_summary: str
    suggested_sections: List[str]
    visual_direction: List[str]
    required_assets: List[str]
    questions_for_client: List[str]


class LogoConceptRequest(BaseModel):
    company_name: str
    industry: str
    style: str
    colors: List[str]
    keywords: Optional[List[str]] = []


class LogoConceptResponse(BaseModel):
    concept_title: str
    concept_description: str
    image_prompt: str
    style_notes: List[str]


class PricingSuggestionRequest(BaseModel):
    item_name: str
    quantity: int
    customization_complexity: str  # low, medium, high
    turnaround_days: int


class PricingSuggestionResponse(BaseModel):
    recommended_unit_price: float
    total_estimate: float
    pricing_breakdown: dict
    pricing_reason: str


# Product recommendation mappings
INDUSTRY_PRODUCTS = {
    "banking": ["Branded notebooks", "Executive pens", "Corporate mugs", "Roll-up banners", "Lanyards", "USB drives"],
    "technology": ["T-shirts", "Laptop backpacks", "Mouse pads", "Stainless steel tumblers", "Wireless chargers"],
    "events": ["T-shirts", "Caps", "Tote bags", "Banners", "Lanyards", "Water bottles"],
    "corporate": ["Polo shirts", "Notebooks", "Pens", "Mugs", "Desktop organizers", "Business card holders"],
    "retail": ["Tote bags", "T-shirts", "Caps", "Flyers", "Posters", "Brochures"],
    "hospitality": ["Aprons", "Mugs", "Coasters", "Menus", "Table tents", "Uniforms"],
    "education": ["Notebooks", "Pens", "Tote bags", "T-shirts", "Certificates", "Folders"],
    "healthcare": ["Scrubs", "Mugs", "Pens", "Notebooks", "ID card holders", "Folders"],
    "construction": ["Caps", "T-shirts", "Safety vests", "Mugs", "Banners", "Vehicle stickers"],
    "default": ["T-shirts", "Mugs", "Pens", "Notebooks", "Caps", "Tote bags"]
}

BUDGET_MULTIPLIERS = {
    "low": 0.7,
    "medium": 1.0,
    "high": 1.5,
    "premium": 2.0
}


@router.post("/recommend-products", response_model=ProductRecommendationResponse)
async def recommend_products(payload: ProductRecommendationRequest):
    """
    AI-powered product recommendations based on business type and campaign goals.
    Returns curated product suggestions with rationale.
    """
    # Normalize industry
    industry_key = payload.business_type.lower()
    for key in INDUSTRY_PRODUCTS.keys():
        if key in industry_key:
            industry_key = key
            break
    else:
        industry_key = "default"
    
    # Get base recommendations
    base_products = INDUSTRY_PRODUCTS.get(industry_key, INDUSTRY_PRODUCTS["default"])
    
    # Build recommendation objects
    recommendations = []
    for product_name in base_products[:6]:
        rec = {
            "product": product_name,
            "reason": f"Popular choice for {payload.business_type} businesses",
            "suggested_quantity": payload.quantity_estimate
        }
        
        # Add campaign-specific notes
        if "event" in payload.campaign_goal.lower():
            rec["tip"] = "Consider adding event date/name to the design"
        elif "brand" in payload.campaign_goal.lower():
            rec["tip"] = "Focus on logo visibility and brand colors"
        elif "gift" in payload.campaign_goal.lower():
            rec["tip"] = "Premium packaging recommended for gifts"
        
        recommendations.append(rec)
    
    # Generate rationale
    rationale = (
        f"Based on your business type ({payload.business_type}) and campaign goal "
        f"({payload.campaign_goal}), these items provide strong brand visibility "
        f"while staying practical for your {payload.audience} audience. "
        f"The selection balances impact, utility, and budget efficiency."
    )
    
    return ProductRecommendationResponse(
        recommendations=recommendations,
        rationale=rationale,
        total_estimate=f"TZS 500,000 - 2,000,000 for {payload.quantity_estimate} units"
    )


@router.post("/generate-design-brief", response_model=DesignBriefResponse)
async def generate_design_brief(payload: DesignBriefRequest):
    """
    Generate a structured design brief from simple customer requirements.
    Helps clients articulate their design needs professionally.
    """
    # Service-specific sections
    section_templates = {
        "logo": [
            "Brand vision and values",
            "Target audience profile",
            "Competitor analysis",
            "Preferred visual style",
            "Usage requirements (print, digital, signage)"
        ],
        "brochure": [
            "Cover headline",
            "Company overview",
            "Products/Services showcase",
            "Key differentiators",
            "Call to action",
            "Contact information"
        ],
        "company profile": [
            "About the company",
            "Vision and mission",
            "Leadership team",
            "Products/Services",
            "Achievements/Milestones",
            "Clients/Partners",
            "Contact details"
        ],
        "flyer": [
            "Main headline",
            "Key message/offer",
            "Supporting details",
            "Visual focal point",
            "Call to action",
            "Contact/Location"
        ],
        "poster": [
            "Primary headline",
            "Event/Product details",
            "Date/Time/Location",
            "Visual imagery",
            "Branding elements"
        ]
    }
    
    # Determine service type
    service_key = payload.service_type.lower()
    for key in section_templates.keys():
        if key in service_key:
            service_key = key
            break
    else:
        service_key = "brochure"  # Default
    
    suggested_sections = section_templates.get(service_key, section_templates["brochure"])
    
    # Visual direction based on tone
    tone_visuals = {
        "professional": ["Clean lines", "Corporate color palette", "Structured layout", "Sans-serif typography"],
        "modern": ["Bold shapes", "Vibrant accents", "Asymmetric layout", "Contemporary fonts"],
        "elegant": ["Refined typography", "Subtle gradients", "Luxurious feel", "Serif fonts"],
        "playful": ["Bright colors", "Rounded shapes", "Dynamic composition", "Fun typography"],
        "minimalist": ["White space", "Simple icons", "Muted palette", "Light typography"],
        "corporate": ["Traditional layout", "Blue/grey tones", "Grid structure", "Professional fonts"]
    }
    
    visual_direction = tone_visuals.get(payload.tone.lower(), tone_visuals["professional"])
    
    # Required assets
    required_assets = [
        "Company logo (high resolution)",
        "Brand colors (hex codes)",
        "Company description/copy",
        "Contact information"
    ]
    
    if service_key in ["brochure", "company profile"]:
        required_assets.extend([
            "Product/service images",
            "Team photos (if applicable)",
            "Client testimonials"
        ])
    
    # Questions to clarify
    questions = [
        f"What makes {payload.business_name} different from competitors?",
        f"What action should {payload.target_audience} take after seeing this?",
        "Are there any design styles you want to avoid?",
        "Do you have existing brand guidelines to follow?"
    ]
    
    project_summary = (
        f"Create a {payload.service_type} for {payload.business_name}, a business in the "
        f"{payload.industry} industry. The primary goal is to {payload.goal} targeting "
        f"{payload.target_audience}. The design tone should be {payload.tone}."
    )
    
    if payload.additional_notes:
        project_summary += f" Additional requirements: {payload.additional_notes}"
    
    return DesignBriefResponse(
        project_summary=project_summary,
        suggested_sections=suggested_sections,
        visual_direction=visual_direction,
        required_assets=required_assets,
        questions_for_client=questions
    )


@router.post("/generate-logo-concept", response_model=LogoConceptResponse)
async def generate_logo_concept(payload: LogoConceptRequest):
    """
    Generate logo concept ideas and AI image prompts for early-stage businesses.
    """
    # Style descriptions
    style_descriptions = {
        "modern": "contemporary and forward-thinking",
        "classic": "timeless and trustworthy",
        "minimalist": "clean, simple, and sophisticated",
        "bold": "strong, impactful, and memorable",
        "playful": "friendly, approachable, and energetic",
        "elegant": "refined, luxurious, and premium",
        "tech": "innovative, digital-forward, and cutting-edge"
    }
    
    style_desc = style_descriptions.get(payload.style.lower(), "professional and distinctive")
    
    # Build image prompt
    color_str = ", ".join(payload.colors) if payload.colors else "professional colors"
    keywords_str = ", ".join(payload.keywords) if payload.keywords else ""
    
    image_prompt = (
        f"Create a professional logo for '{payload.company_name}', "
        f"a company in the {payload.industry} industry. "
        f"Style: {payload.style}, using colors: {color_str}. "
        f"The design should be clean, memorable, scalable, and suitable for "
        f"both print and digital applications. "
        f"Modern flat design, vector style, white background."
    )
    
    if keywords_str:
        image_prompt += f" Incorporate elements related to: {keywords_str}."
    
    # Style notes
    style_notes = [
        f"Use {payload.style} design principles",
        f"Primary palette: {color_str}",
        "Ensure readability at small sizes",
        "Design for both horizontal and square formats",
        "Consider how the mark works alone and with text"
    ]
    
    return LogoConceptResponse(
        concept_title=f"{payload.style.title()} Brand Identity",
        concept_description=(
            f"A {style_desc} logo concept for {payload.company_name}, "
            f"designed to resonate with the {payload.industry} market while "
            f"standing out from competitors. The design balances professionalism "
            f"with approachability."
        ),
        image_prompt=image_prompt,
        style_notes=style_notes
    )


@router.post("/suggest-price", response_model=PricingSuggestionResponse)
async def suggest_price(payload: PricingSuggestionRequest):
    """
    AI-powered pricing suggestions for custom orders.
    Helps admins and sales team quote accurately.
    """
    # Base prices (TZS)
    base_prices = {
        "t-shirt": 8000,
        "polo": 15000,
        "cap": 6000,
        "mug": 5000,
        "notebook": 8000,
        "pen": 3000,
        "tumbler": 18000,
        "backpack": 35000,
        "tote bag": 7000,
        "banner": 20000,
        "default": 10000
    }
    
    # Get base price
    item_key = payload.item_name.lower()
    base_price = base_prices.get("default")
    for key in base_prices.keys():
        if key in item_key:
            base_price = base_prices[key]
            break
    
    # Customization multipliers
    complexity_multipliers = {
        "low": 1.0,
        "medium": 1.3,
        "high": 1.6
    }
    
    complexity_mult = complexity_multipliers.get(payload.customization_complexity.lower(), 1.0)
    
    # Urgency multiplier
    urgency_mult = 1.0
    if payload.turnaround_days <= 2:
        urgency_mult = 1.5  # Express
    elif payload.turnaround_days <= 5:
        urgency_mult = 1.2  # Rush
    
    # Quantity discounts
    quantity_discount = 0
    if payload.quantity >= 500:
        quantity_discount = 0.20
    elif payload.quantity >= 200:
        quantity_discount = 0.15
    elif payload.quantity >= 100:
        quantity_discount = 0.10
    elif payload.quantity >= 50:
        quantity_discount = 0.05
    
    # Calculate final price
    adjusted_price = base_price * complexity_mult * urgency_mult
    discounted_price = adjusted_price * (1 - quantity_discount)
    total = discounted_price * payload.quantity
    
    # Build breakdown
    breakdown = {
        "base_price": base_price,
        "customization_adjustment": f"+{int((complexity_mult - 1) * 100)}%",
        "urgency_adjustment": f"+{int((urgency_mult - 1) * 100)}%",
        "quantity_discount": f"-{int(quantity_discount * 100)}%",
        "final_unit_price": round(discounted_price)
    }
    
    # Build reason
    reason_parts = [
        f"Base price for {payload.item_name}: TZS {base_price:,}"
    ]
    
    if complexity_mult > 1:
        reason_parts.append(f"{payload.customization_complexity} complexity adds {int((complexity_mult - 1) * 100)}%")
    
    if urgency_mult > 1:
        urgency_label = "Express" if payload.turnaround_days <= 2 else "Rush"
        reason_parts.append(f"{urgency_label} delivery ({payload.turnaround_days} days) adds {int((urgency_mult - 1) * 100)}%")
    
    if quantity_discount > 0:
        reason_parts.append(f"Quantity discount ({payload.quantity} units): -{int(quantity_discount * 100)}%")
    
    return PricingSuggestionResponse(
        recommended_unit_price=round(discounted_price),
        total_estimate=round(total),
        pricing_breakdown=breakdown,
        pricing_reason=". ".join(reason_parts) + "."
    )


@router.get("/service-packages/{service_type}")
async def get_service_packages(service_type: str):
    """
    Get standard packages for a design service type.
    """
    packages = {
        "logo": [
            {"name": "Basic", "price": 75000, "delivery_days": 2, "revisions": 1, 
             "features": ["1 concept", "PNG export", "Simple style"]},
            {"name": "Standard", "price": 150000, "delivery_days": 3, "revisions": 3, 
             "features": ["3 concepts", "PNG + PDF + SVG", "Professional refinement"]},
            {"name": "Premium", "price": 300000, "delivery_days": 5, "revisions": 5, 
             "features": ["5 concepts", "Source files", "Mini brand guide", "Social media kit"]}
        ],
        "brochure": [
            {"name": "Bi-fold", "price": 100000, "delivery_days": 3, "revisions": 2,
             "features": ["4 panels", "Both sides", "Print-ready PDF"]},
            {"name": "Tri-fold", "price": 125000, "delivery_days": 4, "revisions": 3,
             "features": ["6 panels", "Custom icons", "Multiple formats"]},
            {"name": "Multi-page", "price": 200000, "delivery_days": 5, "revisions": 4,
             "features": ["Up to 12 pages", "Booklet style", "Premium finishes"]}
        ],
        "flyer": [
            {"name": "Basic", "price": 50000, "delivery_days": 1, "revisions": 1,
             "features": ["Single side", "A5 or A4", "Digital format"]},
            {"name": "Standard", "price": 75000, "delivery_days": 2, "revisions": 2,
             "features": ["Double sided", "Custom graphics", "Print-ready"]},
            {"name": "Premium", "price": 100000, "delivery_days": 3, "revisions": 3,
             "features": ["Double sided", "Photo editing", "Social media versions"]}
        ],
        "company-profile": [
            {"name": "Basic", "price": 150000, "delivery_days": 3, "revisions": 2,
             "features": ["Up to 8 pages", "Basic layout", "PDF export"]},
            {"name": "Standard", "price": 250000, "delivery_days": 5, "revisions": 3,
             "features": ["Up to 16 pages", "Custom graphics", "Print + digital formats"]},
            {"name": "Premium", "price": 400000, "delivery_days": 7, "revisions": 5,
             "features": ["Up to 24 pages", "Infographics", "Content writing assist", "Editable source files"]}
        ]
    }
    
    service_key = service_type.lower().replace(" ", "-")
    if service_key not in packages:
        raise HTTPException(status_code=404, detail=f"Service type '{service_type}' not found")
    
    return {"service_type": service_type, "packages": packages[service_key]}


@router.post("/request-handoff")
async def request_ai_handoff(payload: dict):
    """
    Request human handoff from AI chat.
    Creates a support ticket/lead for sales team follow-up.
    """
    conversation = payload.get("conversation", "")
    customer_email = payload.get("customer_email")
    customer_name = payload.get("customer_name")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create a support handoff request
    handoff_doc = {
        "type": "ai_handoff",
        "conversation_summary": conversation[:2000],  # Limit to 2000 chars
        "customer_email": customer_email,
        "customer_name": customer_name,
        "status": "pending",
        "priority": "high",  # AI handoffs are high priority
        "created_at": now,
        "notes": "Customer requested human assistance during AI chat"
    }
    
    await db.support_handoff_requests.insert_one(handoff_doc)
    
    # Also create a notification for staff
    notification_doc = {
        "user_id": "staff_all",  # For all staff
        "type": "handoff_request",
        "title": "AI Chat Handoff Request",
        "message": f"A customer requested human assistance. Review the conversation and reach out.",
        "action_url": "/admin/support-requests",
        "status": "unread",
        "created_at": now,
    }
    await db.notifications.insert_one(notification_doc)
    
    return {
        "success": True,
        "message": "Great! I've notified our sales team. A human advisor will reach out to you shortly. You can also reach us directly at sales@konekt.co.tz or +255 xxx xxx xxx."
    }
