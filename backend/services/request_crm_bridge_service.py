"""
Request CRM Bridge Service
Converts a Request into a CRM lead in the crm_leads collection.
Used by Sales/Admin actions only.
"""
import logging
from datetime import datetime, timezone

logger = logging.getLogger("request_crm_bridge")


def _now():
    return datetime.now(timezone.utc)


async def convert_request_to_lead(db, request_doc: dict, actor: dict) -> dict:
    """
    Converts a request into a CRM lead (crm_leads collection).
    Idempotent - returns existing lead if already converted.
    """
    request_id = request_doc["id"]

    # Idempotency: check if this request was already converted
    existing = await db.crm_leads.find_one({"source_request_id": request_id})
    if existing:
        existing["id"] = str(existing.pop("_id"))
        return existing

    now = _now()
    contact_name = request_doc.get("guest_name") or request_doc.get("customer_name", "")
    email = request_doc.get("guest_email") or request_doc.get("customer_email", "")

    lead_doc = {
        # CRM-standard fields (aligned with admin_routes.py create_lead)
        "contact_name": contact_name,
        "name": contact_name,
        "email": email,
        "company_name": request_doc.get("company_name", ""),
        "phone": request_doc.get("phone", ""),
        "phone_prefix": request_doc.get("phone_prefix", "+255"),
        "source": "request",
        "industry": "",
        "notes": request_doc.get("notes") or request_doc.get("message", ""),
        "status": "new",
        "stage": "new_lead",
        "lead_score": 0,
        "estimated_value": 0,
        "expected_value": 0,
        "assigned_to": request_doc.get("assigned_sales_owner_id") or "",
        "city": "",
        "country": "Tanzania",

        # Traceability fields
        "source_request_id": request_id,
        "source_request_type": request_doc.get("request_type", ""),
        "source_request_reference": request_doc.get("request_number", ""),
        "converted_from_request": True,

        # Timestamps
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "created_by": actor.get("id") if actor else None,

        # Timeline & activities
        "timeline": [{
            "label": "Lead created from request",
            "event_type": "created",
            "note": f"Converted from {request_doc.get('request_type', 'request')} #{request_doc.get('request_number', 'N/A')}",
            "created_at": now.isoformat(),
            "actor": actor.get("email") if actor else "system",
        }],
        "activities": [],
    }

    result = await db.crm_leads.insert_one(lead_doc)
    lead_id_str = str(result.inserted_id)

    # Update request with linked CRM lead
    await db.requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "linked_lead_id": lead_id_str,
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

    # Return with id = stringified ObjectId (matches CRM page expectations)
    lead_doc.pop("_id", None)
    lead_doc["id"] = lead_id_str
    logger.info("[crm_bridge] request %s converted to CRM lead %s by %s", request_id, lead_id_str, (actor or {}).get("id"))
    return lead_doc
