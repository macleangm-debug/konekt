from datetime import datetime
import os
from fastapi import APIRouter, HTTPException, Request
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/service-requests", tags=["Service Requests"])

# Database connection
client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'konekt')]


def serialize_doc(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.post("")
async def create_service_request(payload: dict, request: Request):
    user_email = getattr(request.state, "user_email", None)

    service_form_id = payload.get("service_form_id")
    if not service_form_id:
        raise HTTPException(status_code=400, detail="service_form_id is required")

    service_form = await db.service_forms.find_one({"_id": ObjectId(service_form_id), "is_active": True})
    if not service_form:
        raise HTTPException(status_code=404, detail="Service form not found")

    selected_add_on_ids = payload.get("selected_add_ons", [])
    selected_add_ons = []
    add_on_total = 0.0

    for selected_id in selected_add_on_ids:
        matched = next((a for a in service_form.get("add_ons", []) if a.get("id") == selected_id), None)
        if matched:
            selected_add_ons.append(matched)
            add_on_total += float(matched.get("price", 0) or 0)

    base_price = float(service_form.get("base_price", 0) or 0)
    total_price = base_price + add_on_total
    now = datetime.utcnow()

    doc = {
        "service_form_id": str(service_form["_id"]),
        "service_title": service_form.get("title"),
        "service_slug": service_form.get("slug"),
        "category": service_form.get("category"),
        "customer_email": payload.get("customer_email") or user_email,
        "customer_name": payload.get("customer_name"),
        "company_name": payload.get("company_name"),
        "country": payload.get("country"),
        "phone_prefix": payload.get("phone_prefix"),
        "phone_number": payload.get("phone_number"),
        "address_line_1": payload.get("address_line_1"),
        "address_line_2": payload.get("address_line_2"),
        "city": payload.get("city"),
        "service_answers": payload.get("service_answers", {}),
        "selected_add_ons": selected_add_ons,
        "attachments": payload.get("attachments", []),
        "payment_choice": payload.get("payment_choice", "quote_first"),
        "base_price": base_price,
        "add_on_total": add_on_total,
        "total_price": total_price,
        "currency": service_form.get("currency", "TZS"),
        "requires_payment": service_form.get("requires_payment", False),
        "requires_quote_review": service_form.get("requires_quote_review", True),
        "status": "submitted",
        "created_at": now,
        "updated_at": now,
    }

    result = await db.service_requests.insert_one(doc)
    created = await db.service_requests.find_one({"_id": result.inserted_id})

    save_address = bool(payload.get("save_address", True))
    customer_email = payload.get("customer_email") or user_email

    if save_address and customer_email:
        existing_default = await db.customer_addresses.find_one({
            "customer_email": customer_email,
            "is_default": True,
        })

        address_doc = {
            "customer_email": customer_email,
            "full_name": payload.get("customer_name"),
            "company_name": payload.get("company_name"),
            "country": payload.get("country"),
            "city": payload.get("city"),
            "address_line_1": payload.get("address_line_1"),
            "address_line_2": payload.get("address_line_2"),
            "phone_prefix": payload.get("phone_prefix"),
            "phone_number": payload.get("phone_number"),
            "is_default": False if existing_default else True,
            "created_at": now,
            "updated_at": now,
        }
        await db.customer_addresses.insert_one(address_doc)

    return serialize_doc(created)


@router.get("/my")
async def list_my_service_requests(request: Request):
    user_email = getattr(request.state, "user_email", None)
    if not user_email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    docs = await db.service_requests.find({"customer_email": user_email}).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/my/{request_id}")
async def get_my_service_request(request_id: str, request: Request):
    user_email = getattr(request.state, "user_email", None)
    if not user_email:
        raise HTTPException(status_code=401, detail="Unauthorized")

    doc = await db.service_requests.find_one({"_id": ObjectId(request_id), "customer_email": user_email})
    if not doc:
        raise HTTPException(status_code=404, detail="Service request not found")

    return serialize_doc(doc)
