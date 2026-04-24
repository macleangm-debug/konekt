"""
Seed Sample Catalog Routes
Seeds sample products and services for testing
SECURITY: Admin-only. Was previously publicly accessible and is a vector for
          re-introducing demo data onto production. Guard added Apr 2026.
"""
import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import jwt

router = APIRouter(prefix="/api/admin/seed-sample-catalog", tags=["Seed Sample Catalog"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
_security = HTTPBearer(auto_error=False)


async def _require_admin(credentials: HTTPAuthorizationCredentials = Depends(_security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload.get("user_id")}, {"_id": 0})
        if not user or user.get("role") not in ("admin", "super_admin"):
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("")
async def seed_sample_catalog(user: dict = Depends(_require_admin)):
    """Seed sample products and services for testing (admin-only)."""
    now = datetime.utcnow()
    
    # Sample service groups
    sample_groups = [
        {"key": "printing_branding", "name": "Printing & Branding", "description": "Printed and branded business materials.", "is_active": True},
        {"key": "facilities_services", "name": "Facilities Services", "description": "Cleaning, maintenance, and workplace support.", "is_active": True},
        {"key": "creative_services", "name": "Creative & Design", "description": "Design, branding, and content support.", "is_active": True},
    ]

    groups_created = 0
    for group in sample_groups:
        existing = await db.service_groups.find_one({"key": group["key"]})
        if not existing:
            group["created_at"] = now
            group["updated_at"] = now
            await db.service_groups.insert_one(group)
            groups_created += 1

    # Sample services
    sample_services = [
        {
            "key": "printing",
            "slug": "printing",
            "group_key": "printing_branding",
            "group_name": "Printing & Branding",
            "name": "Printing Services",
            "short_description": "Cards, brochures, banners, labels, packaging, and corporate print materials.",
            "description": "Request structured business printing support across branded and operational materials.",
            "service_mode": "request",
            "pricing_mode": "quote",
            "site_visit_required": False,
            "delivery_required": True,
            "is_active": True,
            "first_order_discount_eligible": True,
        },
        {
            "key": "office_branding",
            "slug": "office-branding",
            "group_key": "printing_branding",
            "group_name": "Printing & Branding",
            "name": "Office Branding",
            "short_description": "Wall graphics, signage, internal branding, and workspace visual identity.",
            "description": "Coordinate office and workspace branding with design, production, and installation support.",
            "service_mode": "request",
            "pricing_mode": "quote",
            "site_visit_required": True,
            "delivery_required": False,
            "is_active": True,
            "first_order_discount_eligible": True,
        },
        {
            "key": "deep_cleaning",
            "slug": "deep-cleaning",
            "group_key": "facilities_services",
            "group_name": "Facilities Services",
            "name": "Deep Office Cleaning",
            "short_description": "Carpet cleaning, upholstery, floor care, washroom deep cleaning, and office refresh.",
            "description": "Book deep office cleaning with structured follow-up and recurring options.",
            "service_mode": "request",
            "pricing_mode": "quote",
            "site_visit_required": True,
            "delivery_required": False,
            "is_active": True,
            "first_order_discount_eligible": False,
        },
        {
            "key": "uniform_tailoring",
            "slug": "uniform-tailoring",
            "group_key": "facilities_services",
            "group_name": "Facilities Services",
            "name": "Uniform Tailoring",
            "short_description": "Corporate uniforms, workwear, and custom tailoring for staff.",
            "description": "Request uniform production with measurement, design, and bulk order support.",
            "service_mode": "request",
            "pricing_mode": "quote",
            "site_visit_required": False,
            "delivery_required": True,
            "is_active": True,
            "first_order_discount_eligible": True,
        },
        {
            "key": "graphic_design",
            "slug": "graphic-design",
            "group_key": "creative_services",
            "group_name": "Creative & Design",
            "name": "Graphic Design Support",
            "short_description": "Logo design, marketing materials, presentations, and visual content.",
            "description": "Professional graphic design services for business communications.",
            "service_mode": "request",
            "pricing_mode": "quote",
            "site_visit_required": False,
            "delivery_required": False,
            "is_active": True,
            "first_order_discount_eligible": True,
        },
    ]

    services_created = 0
    for service in sample_services:
        existing = await db.service_types.find_one({"key": service["key"]})
        if not existing:
            service["created_at"] = now
            service["updated_at"] = now
            await db.service_types.insert_one(service)
            services_created += 1

    # Sample products
    sample_products = [
        {
            "sku": "BC-001",
            "name": "Premium Business Cards",
            "product_group": "promotional_products",
            "category": "Printed Materials",
            "price": 25000,
            "currency": "TZS",
            "description": "Premium laminated business cards for corporate teams. Pack of 100.",
            "is_active": True,
            "first_order_discount_eligible": True,
        },
        {
            "sku": "LNY-001",
            "name": "Branded Lanyards",
            "product_group": "promotional_products",
            "category": "Promotional Items",
            "price": 18000,
            "currency": "TZS",
            "description": "Corporate lanyards for events, staff, and access control. Pack of 10.",
            "is_active": True,
            "first_order_discount_eligible": True,
        },
        {
            "sku": "NTB-001",
            "name": "Executive Notebooks",
            "product_group": "office_supplies",
            "category": "Stationery",
            "price": 32000,
            "currency": "TZS",
            "description": "Professional notebooks for teams and executive gifting. A5 size.",
            "is_active": True,
            "first_order_discount_eligible": True,
        },
        {
            "sku": "RUB-001",
            "name": "Roll-Up Banner",
            "product_group": "promotional_products",
            "category": "Display Materials",
            "price": 85000,
            "currency": "TZS",
            "description": "Portable roll-up banner stand for exhibitions and events. 85x200cm.",
            "is_active": True,
            "first_order_discount_eligible": True,
        },
        {
            "sku": "NTG-001",
            "name": "Magnetic Name Tags",
            "product_group": "promotional_products",
            "category": "ID Products",
            "price": 12000,
            "currency": "TZS",
            "description": "Professional magnetic name tags with custom printing. Pack of 5.",
            "is_active": True,
            "first_order_discount_eligible": True,
        },
        {
            "sku": "CHR-001",
            "name": "Executive Office Chair",
            "product_group": "office_furniture",
            "category": "Furniture",
            "price": 350000,
            "currency": "TZS",
            "description": "Comfortable executive office chair with lumbar support.",
            "is_active": True,
            "first_order_discount_eligible": False,
        },
        {
            "sku": "TNR-001",
            "name": "HP Printer Toner",
            "product_group": "office_supplies",
            "category": "Consumables",
            "price": 95000,
            "currency": "TZS",
            "description": "Original HP toner cartridge for laser printers.",
            "is_active": True,
            "first_order_discount_eligible": False,
        },
        {
            "sku": "DRY-001",
            "name": "Corporate Diary 2026",
            "product_group": "office_supplies",
            "category": "Stationery",
            "price": 45000,
            "currency": "TZS",
            "description": "Executive leather-bound diary with weekly planning pages.",
            "is_active": True,
            "first_order_discount_eligible": True,
        },
    ]

    products_created = 0
    for product in sample_products:
        existing = await db.products.find_one({"sku": product["sku"]})
        if not existing:
            product["created_at"] = now
            product["updated_at"] = now
            await db.products.insert_one(product)
            products_created += 1

    return {
        "ok": True,
        "message": "Sample catalog seeded successfully.",
        "created": {
            "service_groups": groups_created,
            "services": services_created,
            "products": products_created,
        }
    }


@router.get("/status")
async def get_catalog_status():
    """Get current catalog counts"""
    return {
        "service_groups": await db.service_groups.count_documents({"is_active": True}),
        "services": await db.service_types.count_documents({"is_active": True}),
        "products": await db.products.count_documents({"is_active": True}),
    }
