"""
Recurring Invoice Routes - Recurring billing plans and invoice generation
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/recurring-invoices", tags=["Recurring Invoices"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    if doc is None:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    for key, value in doc.items():
        if isinstance(value, ObjectId):
            doc[key] = str(value)
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


@router.get("/plans")
async def list_recurring_invoice_plans(status: str = None, customer_id: str = None):
    """List recurring invoice plans"""
    query = {}
    if status:
        query["status"] = status
    if customer_id:
        query["customer_id"] = customer_id
    docs = await db.recurring_invoice_plans.find(query).sort("created_at", -1).to_list(length=500)
    return [serialize_doc(doc) for doc in docs]


@router.get("/plans/{plan_id}")
async def get_recurring_invoice_plan(plan_id: str):
    """Get a specific recurring invoice plan"""
    doc = await db.recurring_invoice_plans.find_one({"_id": ObjectId(plan_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Recurring invoice plan not found")
    return serialize_doc(doc)


@router.post("/plans")
async def create_recurring_invoice_plan(payload: dict):
    """Create a new recurring invoice plan"""
    customer_id = payload.get("customer_id")
    customer = await db.customers.find_one({"_id": ObjectId(customer_id)})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    doc = {
        "customer_id": customer_id,
        "customer_email": customer.get("email"),
        "customer_name": customer.get("full_name") or customer.get("name"),
        "company_name": payload.get("company_name") or customer.get("company_name"),
        "plan_name": payload.get("plan_name", "Monthly Retainer"),
        "frequency": payload.get("frequency", "monthly"),  # weekly | monthly | quarterly | yearly
        "invoice_items": payload.get("invoice_items", []),  # [{description, amount, quantity}]
        "currency": payload.get("currency", "TZS"),
        "start_date": payload.get("start_date"),
        "next_run_date": payload.get("next_run_date"),
        "last_run_date": None,
        "run_count": 0,
        "status": payload.get("status", "active"),  # active | paused | cancelled
        "payment_terms_days": int(payload.get("payment_terms_days", 30) or 30),
        "auto_send": bool(payload.get("auto_send", True)),
        "notes": payload.get("notes", ""),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.recurring_invoice_plans.insert_one(doc)
    created = await db.recurring_invoice_plans.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.put("/plans/{plan_id}")
async def update_recurring_invoice_plan(plan_id: str, payload: dict):
    """Update a recurring invoice plan"""
    existing = await db.recurring_invoice_plans.find_one({"_id": ObjectId(plan_id)})
    if not existing:
        raise HTTPException(status_code=404, detail="Recurring invoice plan not found")

    updates = {
        "plan_name": payload.get("plan_name", existing.get("plan_name")),
        "company_name": payload.get("company_name", existing.get("company_name")),
        "frequency": payload.get("frequency", existing.get("frequency")),
        "invoice_items": payload.get("invoice_items", existing.get("invoice_items", [])),
        "currency": payload.get("currency", existing.get("currency")),
        "next_run_date": payload.get("next_run_date", existing.get("next_run_date")),
        "status": payload.get("status", existing.get("status")),
        "payment_terms_days": int(payload.get("payment_terms_days", existing.get("payment_terms_days", 30)) or 30),
        "auto_send": bool(payload.get("auto_send", existing.get("auto_send", True))),
        "notes": payload.get("notes", existing.get("notes")),
        "updated_at": datetime.now(timezone.utc),
    }

    await db.recurring_invoice_plans.update_one({"_id": ObjectId(plan_id)}, {"$set": updates})
    updated = await db.recurring_invoice_plans.find_one({"_id": ObjectId(plan_id)})
    return serialize_doc(updated)


@router.post("/plans/{plan_id}/generate-now")
async def generate_invoice_now(plan_id: str):
    """Manually generate an invoice from a recurring plan"""
    plan = await db.recurring_invoice_plans.find_one({"_id": ObjectId(plan_id)})
    if not plan:
        raise HTTPException(status_code=404, detail="Recurring invoice plan not found")

    # Calculate total from invoice items
    items = plan.get("invoice_items", [])
    subtotal = sum(
        float(item.get("amount", 0) or 0) * float(item.get("quantity", 1) or 1)
        for item in items
    )

    # Generate invoice number
    last_invoice = await db.invoices.find_one(sort=[("created_at", -1)])
    last_num = 1000
    if last_invoice and last_invoice.get("invoice_number"):
        try:
            last_num = int(last_invoice["invoice_number"].replace("INV-", ""))
        except (ValueError, AttributeError):
            pass
    invoice_number = f"INV-{last_num + 1}"

    invoice_doc = {
        "invoice_number": invoice_number,
        "customer_id": plan.get("customer_id"),
        "customer_email": plan.get("customer_email"),
        "customer_name": plan.get("customer_name"),
        "company_name": plan.get("company_name"),
        "items": items,
        "subtotal": subtotal,
        "tax": 0,
        "discount": 0,
        "total": subtotal,
        "currency": plan.get("currency", "TZS"),
        "status": "sent",
        "payment_status": "unpaid",
        "source_type": "recurring_invoice_plan",
        "source_plan_id": str(plan["_id"]),
        "payment_terms_days": plan.get("payment_terms_days", 30),
        "notes": f"Generated from recurring plan: {plan.get('plan_name')}",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = await db.invoices.insert_one(invoice_doc)

    # Update plan stats
    await db.recurring_invoice_plans.update_one(
        {"_id": ObjectId(plan_id)},
        {
            "$set": {"last_run_date": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)},
            "$inc": {"run_count": 1}
        }
    )

    created = await db.invoices.find_one({"_id": result.inserted_id})
    return serialize_doc(created)


@router.post("/plans/{plan_id}/pause")
async def pause_recurring_invoice_plan(plan_id: str):
    """Pause a recurring invoice plan"""
    await db.recurring_invoice_plans.update_one(
        {"_id": ObjectId(plan_id)},
        {"$set": {"status": "paused", "updated_at": datetime.now(timezone.utc)}}
    )
    return {"ok": True, "status": "paused"}


@router.post("/plans/{plan_id}/resume")
async def resume_recurring_invoice_plan(plan_id: str):
    """Resume a paused recurring invoice plan"""
    await db.recurring_invoice_plans.update_one(
        {"_id": ObjectId(plan_id)},
        {"$set": {"status": "active", "updated_at": datetime.now(timezone.utc)}}
    )
    return {"ok": True, "status": "active"}


@router.delete("/plans/{plan_id}")
async def delete_recurring_invoice_plan(plan_id: str):
    """Delete a recurring invoice plan"""
    result = await db.recurring_invoice_plans.delete_one({"_id": ObjectId(plan_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recurring invoice plan not found")
    return {"deleted": True}
