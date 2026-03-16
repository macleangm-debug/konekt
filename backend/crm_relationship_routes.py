"""
CRM Relationship Routes
Create quotes, invoices, tasks from leads, convert to won
"""
from datetime import datetime
import os
from bson import ObjectId
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

from crm_timeline_service import add_lead_timeline_event
from collection_mode_service import get_quote_collection, get_invoice_collection

router = APIRouter(prefix="/api/admin/crm-relationships", tags=["CRM Relationships"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.post("/leads/{lead_id}/create-quote")
async def create_quote_from_lead(lead_id: str, payload: dict):
    lead = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    quotes_collection = await get_quote_collection(db)
    generated_quote_number = payload.get("quote_number") or f"QT-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    quote_doc = {
        "quote_number": generated_quote_number,
        "lead_id": str(lead["_id"]),
        "lead_source": lead.get("source"),
        "assigned_to": lead.get("assigned_to"),
        "customer_email": lead.get("email"),
        "customer_name": lead.get("name"),
        "customer_company": lead.get("company_name"),
        "customer_phone": lead.get("phone"),
        "line_items": payload.get("line_items", []),
        "subtotal": float(payload.get("subtotal", 0) or 0),
        "tax": float(payload.get("tax", 0) or 0),
        "discount": float(payload.get("discount", 0) or 0),
        "total": float(payload.get("total", 0) or 0),
        "currency": payload.get("currency", "TZS"),
        "status": "draft",
        "affiliate_code": lead.get("affiliate_code"),
        "affiliate_email": lead.get("affiliate_email"),
        "campaign_id": lead.get("campaign_id"),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await quotes_collection.insert_one(quote_doc)
    created = await quotes_collection.find_one({"_id": result.inserted_id})

    await db.crm_leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": {"stage": "quote_sent", "updated_at": datetime.utcnow()}}
    )

    await add_lead_timeline_event(
        db,
        lead_id=ObjectId(lead_id),
        event_type="quote_created",
        label="Quote created from lead",
        actor_email=payload.get("actor_email"),
        note=generated_quote_number,
        meta={"quote_id": str(result.inserted_id)},
    )

    return serialize_doc(created)


@router.post("/leads/{lead_id}/create-invoice")
async def create_invoice_from_lead(lead_id: str, payload: dict):
    lead = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    invoices_collection = await get_invoice_collection(db)
    generated_invoice_number = payload.get("invoice_number") or f"INV-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    invoice_doc = {
        "invoice_number": generated_invoice_number,
        "lead_id": str(lead["_id"]),
        "lead_source": lead.get("source"),
        "assigned_to": lead.get("assigned_to"),
        "customer_email": lead.get("email"),
        "customer_name": lead.get("name"),
        "customer_company": lead.get("company_name"),
        "customer_phone": lead.get("phone"),
        "line_items": payload.get("line_items", []),
        "subtotal": float(payload.get("subtotal", 0) or 0),
        "tax": float(payload.get("tax", 0) or 0),
        "discount": float(payload.get("discount", 0) or 0),
        "total": float(payload.get("total", 0) or 0),
        "paid_amount": 0,
        "balance_due": float(payload.get("total", 0) or 0),
        "currency": payload.get("currency", "TZS"),
        "status": "sent",
        "affiliate_code": lead.get("affiliate_code"),
        "affiliate_email": lead.get("affiliate_email"),
        "campaign_id": lead.get("campaign_id"),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await invoices_collection.insert_one(invoice_doc)
    created = await invoices_collection.find_one({"_id": result.inserted_id})

    await add_lead_timeline_event(
        db,
        lead_id=ObjectId(lead_id),
        event_type="invoice_created",
        label="Invoice created from lead",
        actor_email=payload.get("actor_email"),
        note=generated_invoice_number,
        meta={"invoice_id": str(result.inserted_id)},
    )

    return serialize_doc(created)


@router.post("/leads/{lead_id}/create-task")
async def create_task_from_lead(lead_id: str, payload: dict):
    lead = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    task_doc = {
        "title": payload.get("title") or f"Follow up {lead.get('name')}",
        "description": payload.get("description", ""),
        "lead_id": str(lead["_id"]),
        "customer_email": lead.get("email"),
        "assigned_to": payload.get("assigned_to") or lead.get("assigned_to"),
        "assigned_name": payload.get("assigned_name") or lead.get("assigned_name"),
        "status": payload.get("status", "todo"),
        "priority": payload.get("priority", "medium"),
        "department": payload.get("department", "sales"),
        "due_date": payload.get("due_date"),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await db.tasks.insert_one(task_doc)
    created = await db.tasks.find_one({"_id": result.inserted_id})

    await add_lead_timeline_event(
        db,
        lead_id=ObjectId(lead_id),
        event_type="task_created",
        label="Task created from lead",
        actor_email=payload.get("actor_email"),
        note=task_doc["title"],
        meta={"task_id": str(result.inserted_id)},
    )

    return serialize_doc(created)


@router.post("/leads/{lead_id}/convert-to-won")
async def convert_lead_to_won(lead_id: str, payload: dict):
    lead = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    win_reason = payload.get("win_reason")
    note = payload.get("note", "")

    await db.crm_leads.update_one(
        {"_id": ObjectId(lead_id)},
        {"$set": {"stage": "won", "win_reason": win_reason, "updated_at": datetime.utcnow()}}
    )

    await add_lead_timeline_event(
        db,
        lead_id=ObjectId(lead_id),
        event_type="won",
        label="Lead converted to won",
        actor_email=payload.get("actor_email"),
        note=note,
        meta={"win_reason": win_reason},
    )

    updated = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
    return serialize_doc(updated)
