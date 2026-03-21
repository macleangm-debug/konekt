"""
Guest Lead Routes
Capture leads from guests who don't want to create an account yet.
Creates lightweight sales opportunities for follow-up.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Request
from bson import ObjectId

router = APIRouter(prefix="/api/guest-leads", tags=["Guest Leads"])


def serialize_doc(doc):
    if doc is None:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.post("")
async def create_guest_lead(payload: dict, request: Request):
    """Create a guest lead and corresponding sales opportunity"""
    db = request.app.mongodb
    now = datetime.now(timezone.utc)

    doc = {
        "full_name": payload.get("full_name", ""),
        "phone": payload.get("phone", ""),
        "email": (payload.get("email", "") or "").strip().lower(),
        "company_name": payload.get("company_name", ""),
        "country": payload.get("country", "Tanzania"),
        "region": payload.get("region", ""),
        "source": payload.get("source", "website"),
        "guest_session_id": payload.get("guest_session_id", ""),
        "intent_type": payload.get("intent_type", "quote_request"),
        "intent_payload": payload.get("intent_payload", {}),
        "converted_to_user_id": None,
        "status": "new",
        "created_at": now,
        "updated_at": now,
    }
    result = await db.guest_leads.insert_one(doc)
    guest_lead_id = str(result.inserted_id)

    # Create lightweight sales opportunity for follow-up
    intent_type_label = (doc["intent_type"] or "request").replace("_", " ").title()
    await db.sales_opportunities.insert_one({
        "customer_email": doc["email"],
        "customer_name": doc["full_name"],
        "company_name": doc["company_name"],
        "phone": doc["phone"],
        "opportunity_type": "guest_lead",
        "source": doc["source"],
        "title": f"Guest {intent_type_label}",
        "notes": str(doc["intent_payload"]),
        "stage": "new",
        "guest_lead_id": guest_lead_id,
        "created_at": now,
        "updated_at": now,
    })

    return {"ok": True, "guest_lead_id": guest_lead_id}


@router.get("")
async def list_guest_leads(request: Request, status: str = None, limit: int = 100):
    """List guest leads with optional status filter"""
    db = request.app.mongodb
    query = {}
    if status:
        query["status"] = status
    
    docs = await db.guest_leads.find(query).sort("created_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.get("/{lead_id}")
async def get_guest_lead(lead_id: str, request: Request):
    """Get a single guest lead by ID"""
    db = request.app.mongodb
    try:
        doc = await db.guest_leads.find_one({"_id": ObjectId(lead_id)})
    except Exception:
        return None
    return serialize_doc(doc)


@router.put("/{lead_id}/convert")
async def convert_guest_lead(lead_id: str, payload: dict, request: Request):
    """Mark guest lead as converted to a user account"""
    db = request.app.mongodb
    now = datetime.now(timezone.utc)
    
    await db.guest_leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": {
            "status": "converted",
            "converted_to_user_id": payload.get("user_id"),
            "updated_at": now,
        }}
    )
    
    doc = await db.guest_leads.find_one({"_id": ObjectId(lead_id)})
    return serialize_doc(doc)
