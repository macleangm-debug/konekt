from datetime import datetime
import asyncio
import os

from motor.motor_asyncio import AsyncIOMotorClient


MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "konekt_db")


SERVICE_FORMS = [
    {
        "title": "Logo Design",
        "slug": "logo-design",
        "category": "creative",
        "description": "Professional logo design for startups, companies, and brands.",
        "base_price": 150000,
        "currency": "TZS",
        "requires_payment": True,
        "requires_quote_review": False,
        "position": 1,
        "is_active": True,
        "form_schema": [
            {"key": "brand_description", "label": "Tell us about your brand", "type": "textarea", "required": True},
            {"key": "industry", "label": "Industry", "type": "text", "required": True},
            {"key": "target_audience", "label": "Target audience", "type": "textarea"},
            {"key": "preferred_colors", "label": "Preferred colors", "type": "text"},
            {"key": "avoided_colors", "label": "Colors to avoid", "type": "text"},
            {
                "key": "style_direction",
                "label": "Style direction",
                "type": "select",
                "options": [
                    {"label": "Modern", "value": "modern"},
                    {"label": "Luxury", "value": "luxury"},
                    {"label": "Minimal", "value": "minimal"},
                    {"label": "Corporate", "value": "corporate"},
                    {"label": "Playful", "value": "playful"},
                ],
            },
            {"key": "symbols", "label": "Symbols or icons to explore", "type": "text"},
            {"key": "usage", "label": "Where will the logo be used?", "type": "textarea"},
            {"key": "deadline", "label": "Preferred deadline", "type": "date"},
        ],
        "add_ons": [
            {"id": "copywriting-tagline", "title": "Tagline Copywriting", "description": "Professional tagline suggestions", "price": 30000},
            {"id": "brand-guideline-mini", "title": "Mini Brand Guide", "description": "Basic color and logo usage guide", "price": 50000},
            {"id": "express-delivery", "title": "Express Delivery", "description": "Priority turnaround", "price": 40000},
        ],
    },
    {
        "title": "Flyer Design",
        "slug": "flyer-design",
        "category": "creative",
        "description": "Promotional flyers for campaigns, events, offers, and announcements.",
        "base_price": 80000,
        "currency": "TZS",
        "requires_payment": True,
        "requires_quote_review": False,
        "position": 2,
        "is_active": True,
        "form_schema": [
            {"key": "campaign_title", "label": "Campaign title", "type": "text", "required": True},
            {"key": "purpose", "label": "Purpose of the flyer", "type": "textarea", "required": True},
            {"key": "target_audience", "label": "Target audience", "type": "textarea"},
            {"key": "headline", "label": "Main headline", "type": "text"},
            {"key": "body_content", "label": "Main content", "type": "textarea"},
            {"key": "call_to_action", "label": "Call to action", "type": "text"},
            {
                "key": "format_type",
                "label": "Format",
                "type": "radio",
                "options": [
                    {"label": "Digital", "value": "digital"},
                    {"label": "Print", "value": "print"},
                    {"label": "Both", "value": "both"},
                ],
            },
            {
                "key": "orientation",
                "label": "Orientation",
                "type": "radio",
                "options": [
                    {"label": "Portrait", "value": "portrait"},
                    {"label": "Landscape", "value": "landscape"},
                ],
            },
            {"key": "deadline", "label": "Preferred deadline", "type": "date"},
        ],
        "add_ons": [
            {"id": "copywriting-content", "title": "Copywriting", "description": "We write the flyer content for you", "price": 40000},
            {"id": "stock-images", "title": "Stock Image Sourcing", "description": "Professional image sourcing", "price": 25000},
            {"id": "social-resize-pack", "title": "Social Resize Pack", "description": "Resize for social media formats", "price": 30000},
        ],
    },
    {
        "title": "Brochure Design",
        "slug": "brochure-design",
        "category": "creative",
        "description": "Corporate brochures and marketing documents.",
        "base_price": 250000,
        "currency": "TZS",
        "requires_payment": False,
        "requires_quote_review": True,
        "position": 3,
        "is_active": True,
        "form_schema": [
            {"key": "document_type", "label": "Document type", "type": "text", "required": True},
            {"key": "page_count", "label": "Estimated number of pages", "type": "number", "required": True},
            {"key": "business_overview", "label": "Business overview", "type": "textarea", "required": True},
            {"key": "target_audience", "label": "Target audience", "type": "textarea"},
            {"key": "sections_needed", "label": "Sections needed", "type": "textarea"},
            {
                "key": "content_ready",
                "label": "Do you already have content?",
                "type": "radio",
                "options": [
                    {"label": "Yes", "value": "yes"},
                    {"label": "No", "value": "no"},
                    {"label": "Partly", "value": "partly"},
                ],
            },
            {
                "key": "delivery_format",
                "label": "Delivery format",
                "type": "radio",
                "options": [
                    {"label": "Digital", "value": "digital"},
                    {"label": "Print", "value": "print"},
                    {"label": "Both", "value": "both"},
                ],
            },
            {"key": "deadline", "label": "Preferred deadline", "type": "date"},
        ],
        "add_ons": [
            {"id": "copywriting-full", "title": "Full Copywriting", "description": "We write the brochure content", "price": 120000},
            {"id": "extra-pages", "title": "Extra Page Bundle", "description": "Additional design pages", "price": 50000},
            {"id": "premium-infographics", "title": "Premium Infographics", "description": "Custom infographic design", "price": 80000},
        ],
    },
    {
        "title": "Company Profile Design",
        "slug": "company-profile-design",
        "category": "creative",
        "description": "Professional company profiles for corporate presentation and pitching.",
        "base_price": 300000,
        "currency": "TZS",
        "requires_payment": False,
        "requires_quote_review": True,
        "position": 4,
        "is_active": True,
        "form_schema": [
            {"key": "business_name", "label": "Business name", "type": "text", "required": True},
            {"key": "industry", "label": "Industry", "type": "text", "required": True},
            {"key": "company_story", "label": "Company story", "type": "textarea"},
            {"key": "services_products", "label": "Services or products", "type": "textarea", "required": True},
            {"key": "key_clients", "label": "Key clients or sectors served", "type": "textarea"},
            {"key": "team_info", "label": "Team information to include", "type": "textarea"},
            {"key": "certifications", "label": "Certifications or achievements", "type": "textarea"},
            {"key": "page_count", "label": "Expected number of pages", "type": "number"},
            {"key": "deadline", "label": "Preferred deadline", "type": "date"},
        ],
        "add_ons": [
            {"id": "copywriting-profile", "title": "Profile Copywriting", "description": "Professional company profile writing", "price": 150000},
            {"id": "executive-summary", "title": "Executive Summary", "description": "Sharp investor-ready summary", "price": 60000},
        ],
    },
    {
        "title": "Banner Design",
        "slug": "banner-design",
        "category": "creative",
        "description": "Design for banners, roll-ups, backdrops, and large-format displays.",
        "base_price": 100000,
        "currency": "TZS",
        "requires_payment": True,
        "requires_quote_review": False,
        "position": 5,
        "is_active": True,
        "form_schema": [
            {"key": "banner_type", "label": "Banner type", "type": "text", "required": True},
            {"key": "dimensions", "label": "Dimensions", "type": "text", "required": True},
            {"key": "purpose", "label": "Purpose / event", "type": "textarea", "required": True},
            {"key": "headline", "label": "Headline / key message", "type": "text"},
            {"key": "call_to_action", "label": "Call to action", "type": "text"},
            {"key": "contact_details", "label": "Contact details to display", "type": "textarea"},
            {"key": "deadline", "label": "Preferred deadline", "type": "date"},
        ],
        "add_ons": [
            {"id": "copywriting-banner", "title": "Banner Copywriting", "description": "Strong campaign copy", "price": 30000},
            {"id": "print-ready-check", "title": "Print Ready Check", "description": "Production-ready quality review", "price": 20000},
        ],
    },
    {
        "title": "Copywriting Service",
        "slug": "copywriting-service",
        "category": "copywriting",
        "description": "Professional business and marketing copywriting.",
        "base_price": 120000,
        "currency": "TZS",
        "requires_payment": False,
        "requires_quote_review": True,
        "position": 6,
        "is_active": True,
        "form_schema": [
            {
                "key": "content_type",
                "label": "Content type",
                "type": "select",
                "required": True,
                "options": [
                    {"label": "Flyer", "value": "flyer"},
                    {"label": "Brochure", "value": "brochure"},
                    {"label": "Company Profile", "value": "company_profile"},
                    {"label": "Website Copy", "value": "website"},
                    {"label": "Social Media", "value": "social_media"},
                    {"label": "Other", "value": "other"},
                ],
            },
            {"key": "brand_name", "label": "Brand / company name", "type": "text", "required": True},
            {"key": "audience", "label": "Target audience", "type": "textarea", "required": True},
            {"key": "tone", "label": "Preferred tone", "type": "text"},
            {"key": "objective", "label": "What is the goal of this content?", "type": "textarea", "required": True},
            {"key": "key_points", "label": "Key points to include", "type": "textarea"},
            {"key": "word_count", "label": "Estimated word count", "type": "number"},
            {"key": "deadline", "label": "Preferred deadline", "type": "date"},
        ],
        "add_ons": [
            {"id": "seo-optimization", "title": "SEO Optimization", "description": "Search-focused writing support", "price": 50000},
            {"id": "extra-revisions", "title": "Extra Revisions", "description": "Additional revision rounds", "price": 30000},
        ],
    },
    {
        "title": "Equipment Repair Request",
        "slug": "equipment-repair-request",
        "category": "maintenance",
        "description": "Submit an office equipment repair request with technical details.",
        "base_price": 50000,
        "currency": "TZS",
        "requires_payment": False,
        "requires_quote_review": True,
        "position": 7,
        "is_active": True,
        "form_schema": [
            {"key": "machine_type", "label": "Machine type", "type": "text", "required": True},
            {"key": "brand", "label": "Brand", "type": "text"},
            {"key": "model_number", "label": "Model number", "type": "text"},
            {"key": "serial_number", "label": "Serial number", "type": "text"},
            {"key": "issue_description", "label": "Describe the issue", "type": "textarea", "required": True},
            {"key": "problem_started", "label": "When did the problem start?", "type": "text"},
            {
                "key": "powers_on",
                "label": "Does the equipment power on?",
                "type": "radio",
                "options": [
                    {"label": "Yes", "value": "yes"},
                    {"label": "No", "value": "no"},
                ],
            },
            {
                "key": "service_mode",
                "label": "Preferred service mode",
                "type": "radio",
                "options": [
                    {"label": "On-site", "value": "onsite"},
                    {"label": "Drop-off", "value": "dropoff"},
                ],
            },
            {
                "key": "urgency",
                "label": "Urgency",
                "type": "select",
                "options": [
                    {"label": "Low", "value": "low"},
                    {"label": "Medium", "value": "medium"},
                    {"label": "High", "value": "high"},
                    {"label": "Critical", "value": "critical"},
                ],
            },
        ],
        "add_ons": [
            {"id": "priority-diagnosis", "title": "Priority Diagnosis", "description": "Faster technical assessment", "price": 40000},
            {"id": "onsite-visit", "title": "On-site Visit", "description": "Technician visit to client location", "price": 80000},
        ],
    },
    {
        "title": "Preventive Maintenance",
        "slug": "preventive-maintenance",
        "category": "maintenance",
        "description": "Planned office equipment maintenance for long-term reliability.",
        "base_price": 100000,
        "currency": "TZS",
        "requires_payment": False,
        "requires_quote_review": True,
        "position": 8,
        "is_active": True,
        "form_schema": [
            {"key": "equipment_type", "label": "Equipment type", "type": "text", "required": True},
            {"key": "units_count", "label": "Number of units", "type": "number", "required": True},
            {"key": "brands_models", "label": "Brands / models", "type": "textarea"},
            {"key": "location_details", "label": "Location details", "type": "textarea", "required": True},
            {
                "key": "frequency",
                "label": "Desired maintenance frequency",
                "type": "select",
                "options": [
                    {"label": "Monthly", "value": "monthly"},
                    {"label": "Quarterly", "value": "quarterly"},
                    {"label": "Bi-Annual", "value": "biannual"},
                    {"label": "Annual", "value": "annual"},
                ],
            },
            {
                "key": "service_type",
                "label": "Service type",
                "type": "radio",
                "options": [
                    {"label": "One-time", "value": "one_time"},
                    {"label": "Contract", "value": "contract"},
                ],
            },
            {"key": "preferred_start_date", "label": "Preferred start date", "type": "date"},
        ],
        "add_ons": [
            {"id": "inspection-report", "title": "Detailed Inspection Report", "description": "Formal maintenance findings report", "price": 50000},
        ],
    },
    {
        "title": "Technical Support Request",
        "slug": "technical-support-request",
        "category": "support",
        "description": "Request technical support for office equipment, systems, or installations.",
        "base_price": 30000,
        "currency": "TZS",
        "requires_payment": False,
        "requires_quote_review": True,
        "position": 9,
        "is_active": True,
        "form_schema": [
            {"key": "product_type", "label": "Product or equipment type", "type": "text", "required": True},
            {"key": "issue_category", "label": "Issue category", "type": "text", "required": True},
            {"key": "issue_description", "label": "Issue description", "type": "textarea", "required": True},
            {
                "key": "support_mode",
                "label": "Preferred support mode",
                "type": "radio",
                "options": [
                    {"label": "Remote", "value": "remote"},
                    {"label": "On-site", "value": "onsite"},
                ],
            },
            {
                "key": "urgency",
                "label": "Urgency",
                "type": "select",
                "options": [
                    {"label": "Low", "value": "low"},
                    {"label": "Medium", "value": "medium"},
                    {"label": "High", "value": "high"},
                    {"label": "Critical", "value": "critical"},
                ],
            },
            {"key": "preferred_callback_time", "label": "Preferred callback time", "type": "text"},
        ],
        "add_ons": [
            {"id": "priority-support", "title": "Priority Support", "description": "Faster response and handling", "price": 35000},
        ],
    },
]


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    for service in SERVICE_FORMS:
        existing = await db.service_forms.find_one({"slug": service["slug"]})
        if existing:
            await db.service_forms.update_one(
                {"_id": existing["_id"]},
                {"$set": {**service, "updated_at": datetime.utcnow()}},
            )
            print(f"Updated: {service['title']}")
        else:
            doc = {**service, "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()}
            await db.service_forms.insert_one(doc)
            print(f"Inserted: {service['title']}")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
