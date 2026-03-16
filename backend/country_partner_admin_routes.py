"""
Country Partner Admin Routes
Admin management of country partner applications
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

router = APIRouter(prefix="/api/admin/country-partner-applications", tags=["Country Partner Applications"])

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


@router.get("")
async def list_country_partner_applications(status: str = None, country_code: str = None):
    """List all country partner applications"""
    query = {}
    if status:
        query["status"] = status
    if country_code:
        query["country_code"] = country_code.upper()

    docs = await db.country_partner_applications.find(query).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{application_id}")
async def get_country_partner_application(application_id: str):
    """Get specific partner application"""
    doc = await db.country_partner_applications.find_one({"_id": ObjectId(application_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")
    return serialize_doc(doc)


@router.post("/{application_id}/review")
async def review_country_partner_application(application_id: str, payload: dict):
    """Review and update partner application status"""
    app_doc = await db.country_partner_applications.find_one({"_id": ObjectId(application_id)})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")

    status = payload.get("status", "under_review")
    allowed_statuses = {"submitted", "under_review", "approved", "rejected", "onboarded"}
    if status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {allowed_statuses}")

    score = int(payload.get("score", app_doc.get("score", 0)) or 0)
    review_note = payload.get("review_note", "")

    await db.country_partner_applications.update_one(
        {"_id": ObjectId(application_id)},
        {
            "$set": {
                "status": status,
                "score": score,
                "review_note": review_note,
                "reviewed_by": payload.get("reviewed_by"),
                "reviewed_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    updated = await db.country_partner_applications.find_one({"_id": ObjectId(application_id)})
    return serialize_doc(updated)


@router.post("/{application_id}/convert-to-partner")
async def convert_application_to_partner(application_id: str, payload: dict = None):
    """Convert approved application to a partner account"""
    app_doc = await db.country_partner_applications.find_one({"_id": ObjectId(application_id)})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")

    if app_doc.get("status") != "approved":
        raise HTTPException(status_code=400, detail="Only approved applications can be converted")

    # Check if partner already exists
    existing_partner = await db.partners.find_one({"email": app_doc.get("email")})
    if existing_partner:
        raise HTTPException(status_code=400, detail="Partner with this email already exists")

    # Create partner record
    partner_doc = {
        "name": app_doc.get("company_name"),
        "partner_type": app_doc.get("company_type", "distributor"),
        "contact_person": app_doc.get("contact_person"),
        "email": app_doc.get("email"),
        "phone": app_doc.get("phone"),
        "country_code": app_doc.get("country_code"),
        "regions": app_doc.get("regions_served", []),
        "coverage_mode": "selected_regions",
        "fulfillment_type": "partner",
        "address": f"{app_doc.get('city', '')}, {app_doc.get('country_code', '')}",
        "tax_number": app_doc.get("tax_number"),
        "registration_number": app_doc.get("registration_number"),
        "lead_time_days": 3,
        "settlement_terms": "net_30",
        "categories_supported": app_doc.get("categories_supported", []),
        "status": "active",
        "application_id": str(app_doc["_id"]),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.partners.insert_one(partner_doc)
    partner = await db.partners.find_one({"_id": result.inserted_id})

    # Update application status
    await db.country_partner_applications.update_one(
        {"_id": ObjectId(application_id)},
        {
            "$set": {
                "status": "onboarded",
                "partner_id": str(result.inserted_id),
                "updated_at": datetime.now(timezone.utc),
            }
        }
    )

    return {
        "message": "Partner created successfully",
        "partner": serialize_doc(partner)
    }


@router.get("/stats/summary")
async def get_application_stats():
    """Get summary statistics of applications"""
    pipeline = [
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    
    status_counts = {}
    async for row in db.country_partner_applications.aggregate(pipeline):
        status_counts[row["_id"]] = row["count"]

    country_pipeline = [
        {"$group": {
            "_id": "$country_code",
            "count": {"$sum": 1}
        }}
    ]
    
    country_counts = {}
    async for row in db.country_partner_applications.aggregate(country_pipeline):
        country_counts[row["_id"]] = row["count"]

    total = await db.country_partner_applications.count_documents({})

    return {
        "total": total,
        "by_status": status_counts,
        "by_country": country_counts,
    }
