"""
Document Numbering Service — generates sequential document numbers from Settings Hub.

Format: {PREFIX}-{COUNTRY}-{SEQUENCE}
Example: QT-TZ-000001, IN-TZ-000001, ORD-TZ-000001

When use_shared_sequence=True, a quote and its invoice share the same sequence number.
"""
from datetime import datetime, timezone


async def get_numbering_config(db):
    """Load document numbering config from Settings Hub."""
    hub = await db.admin_settings.find_one({"key": "settings_hub"})
    defaults = {
        "country_code": "TZ",
        "quote_prefix": "QT",
        "invoice_prefix": "IN",
        "order_prefix": "ORD",
        "delivery_note_prefix": "DN",
        "use_shared_sequence": True,
    }
    if hub and hub.get("value"):
        stored = hub["value"].get("document_numbering", {})
        return {**defaults, **stored}
    return defaults


async def _next_sequence(db, doc_type: str):
    """Atomically increment and return the next sequence number."""
    result = await db.document_sequences.find_one_and_update(
        {"type": doc_type},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    return result["seq"]


async def generate_document_number(db, doc_type: str, shared_seq: int = None):
    """Generate a document number.
    
    doc_type: 'quote', 'invoice', 'order', 'delivery_note'
    shared_seq: if provided, use this sequence instead of generating new one
    """
    config = await get_numbering_config(db)
    country = config["country_code"]

    prefix_map = {
        "quote": config["quote_prefix"],
        "invoice": config["invoice_prefix"],
        "order": config["order_prefix"],
        "delivery_note": config["delivery_note_prefix"],
    }
    prefix = prefix_map.get(doc_type, doc_type.upper()[:3])

    if shared_seq is not None:
        seq = shared_seq
    else:
        seq = await _next_sequence(db, "global" if config.get("use_shared_sequence") else doc_type)

    return f"{prefix}-{country}-{seq:06d}", seq
