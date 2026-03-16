"""
Country Expansion Routes
Public endpoints for waitlist and partner applications
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/expansion", tags=["Country Expansion"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


@router.post("/waitlist")
async def join_country_waitlist(payload: dict):
    """Join the country waitlist"""
    country_code = (payload.get("country_code") or "").upper()
    email = (payload.get("email") or "").strip().lower()

    if not country_code or not email:
        raise HTTPException(status_code=400, detail="country_code and email are required")

    # Check for existing entry
    existing = await db.country_waitlist_requests.find_one({
        "country_code": country_code,
        "email": email
    })
    if existing:
        return {"message": "You're already on the waitlist", "id": str(existing["_id"])}

    doc = {
        "country_code": country_code,
        "customer_type": payload.get("customer_type", "individual"),  # individual | company
        "name": payload.get("name"),
        "email": email,
        "phone": payload.get("phone"),
        "company_name": payload.get("company_name"),
        "region": payload.get("region"),
        "requested_products_services": payload.get("requested_products_services", []),
        "note": payload.get("note", ""),
        "status": "new",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.country_waitlist_requests.insert_one(doc)
    created = await db.country_waitlist_requests.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.post("/partner-application")
async def submit_country_partner_application(payload: dict):
    """Submit application to become a country partner"""
    country_code = (payload.get("country_code") or "").upper()
    email = (payload.get("email") or "").strip().lower()
    company_name = payload.get("company_name")

    if not country_code or not email or not company_name:
        raise HTTPException(status_code=400, detail="country_code, email, and company_name are required")

    # Check for existing application
    existing = await db.country_partner_applications.find_one({
        "country_code": country_code,
        "email": email
    })
    if existing:
        return {"message": "You have already submitted an application", "id": str(existing["_id"])}

    doc = {
        "country_code": country_code,
        "company_name": company_name,
        "contact_person": payload.get("contact_person"),
        "email": email,
        "phone": payload.get("phone"),
        "city": payload.get("city"),
        "regions_served": payload.get("regions_served", []),
        "company_type": payload.get("company_type"),  # distributor | service_provider | manufacturer | hybrid
        "categories_supported": payload.get("categories_supported", []),
        "years_in_business": payload.get("years_in_business"),
        "annual_revenue": payload.get("annual_revenue"),
        "employee_count": payload.get("employee_count"),
        "tax_number": payload.get("tax_number"),
        "registration_number": payload.get("registration_number"),
        "warehouse_available": bool(payload.get("warehouse_available", False)),
        "service_team_available": bool(payload.get("service_team_available", False)),
        "delivery_fleet_available": bool(payload.get("delivery_fleet_available", False)),
        "website": payload.get("website"),
        "notes": payload.get("notes", ""),
        "status": "submitted",  # submitted | under_review | approved | rejected | onboarded
        "score": 0,
        "review_note": "",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.country_partner_applications.insert_one(doc)
    created = await db.country_partner_applications.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.get("/partner-application/status/{email}")
async def check_partner_application_status(email: str, country_code: str = None):
    """Check status of partner application"""
    query = {"email": email.lower()}
    if country_code:
        query["country_code"] = country_code.upper()

    docs = await db.country_partner_applications.find(query).to_list(length=10)
    return [serialize_doc(doc) for doc in docs]
