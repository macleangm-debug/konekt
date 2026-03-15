from datetime import datetime
import os
from fastapi import APIRouter, HTTPException, Request
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/affiliates", tags=["Affiliate Admin"])

# Database connection
client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'konekt')]


def serialize_doc(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.get("/applications")
async def list_affiliate_applications(request: Request, status: str | None = None):
    query = {}
    if status:
        query["status"] = status

    docs = await db.affiliate_applications.find(query).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.post("/applications/{application_id}/review")
async def review_affiliate_application(application_id: str, payload: dict, request: Request):
    decision = payload.get("decision")
    note = payload.get("note", "")
    commission_rate = float(payload.get("commission_rate", 0) or 0)

    if decision not in {"approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Invalid decision")

    application = await db.affiliate_applications.find_one({"_id": ObjectId(application_id)})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    now = datetime.utcnow()
    await db.affiliate_applications.update_one(
        {"_id": ObjectId(application_id)},
        {
            "$set": {
                "status": decision,
                "review_note": note,
                "commission_rate": commission_rate,
                "reviewed_at": now,
            }
        },
    )

    if decision == "approved":
        existing = await db.affiliates.find_one({"email": application.get("email")})
        if not existing:
            await db.affiliates.insert_one(
                {
                    "name": application.get("name"),
                    "email": application.get("email"),
                    "status": "active",
                    "commission_rate": commission_rate,
                    "promo_code": application.get("promo_code"),
                    "referral_link": application.get("referral_link"),
                    "created_at": now,
                    "updated_at": now,
                }
            )

    updated = await db.affiliate_applications.find_one({"_id": ObjectId(application_id)})
    return serialize_doc(updated)
