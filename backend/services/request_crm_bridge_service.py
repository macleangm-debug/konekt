"""
Request CRM Bridge Service
Converts a Request into a CRM lead.
Used by Sales/Admin actions only.
"""
import logging
from datetime import datetime, timezone
from uuid import uuid4

logger = logging.getLogger("request_crm_bridge")


def _now():
    return datetime.now(timezone.utc)


async def convert_request_to_lead(db, request_doc: dict, actor: dict) -> dict:
    """
    Converts a request into a CRM lead.
    Idempotent — returns existing lead if already converted.
    """
    existing = await db.leads.find_one({"request_id": request_doc["id"]})
    if existing:
        existing.pop("_id", None)
        return existing

    now = _now()
    lead_id = str(uuid4())
    lead_doc = {
        "id": lead_id,
        "request_id": request_doc["id"],
        "source": "request",
        "source_request_type": request_doc.get("request_type"),
        "customer_name": request_doc.get("guest_name") or request_doc.get("customer_name", ""),
        "customer_email": request_doc.get("guest_email") or request_doc.get("customer_email", ""),
        "company_name": request_doc.get("company_name", ""),
        "phone_prefix": request_doc.get("phone_prefix", "+255"),
        "phone": request_doc.get("phone", ""),
        "notes": request_doc.get("notes", ""),
        "status": "new",
        "assigned_sales_owner_id": request_doc.get("assigned_sales_owner_id"),
        "created_at": now,
        "updated_at": now,
        "created_by": actor.get("id") if actor else None,
    }
    await db.leads.insert_one(lead_doc)

    await db.requests.update_one(
        {"id": request_doc["id"]},
        {
            "$set": {
                "linked_lead_id": lead_id,
                "status": "converted_to_lead",
                "crm_stage": "lead",
                "updated_at": now,
            },
            "$push": {
                "timeline": {
                    "key": "converted_to_lead",
                    "label": "Converted to CRM lead",
                    "at": now.isoformat(),
                    "by": actor.get("id") if actor else "system",
                }
            },
        },
    )
    logger.info("[crm_bridge] request %s converted to lead %s by %s", request_doc["id"], lead_id, (actor or {}).get("id"))
    return lead_doc
