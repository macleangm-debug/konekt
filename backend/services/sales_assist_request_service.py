"""Sales Assist Request Service — stores public sales assist requests for the sales team."""
import uuid
from datetime import datetime, timezone


async def create_sales_assist_request(db, payload: dict) -> dict:
    """Create a sales assist request and persist it to the database."""
    now = datetime.now(timezone.utc)
    request_doc = {
        "id": str(uuid.uuid4()),
        "source": payload.get("source", "marketplace_sales_assist"),
        "customer_name": payload.get("customer_name", ""),
        "company_name": payload.get("company_name", ""),
        "email": payload.get("email", ""),
        "phone": payload.get("phone", ""),
        "product_id": payload.get("product_id", ""),
        "product_name": payload.get("product_name", ""),
        "quantity": payload.get("quantity"),
        "notes": payload.get("notes", ""),
        "page_url": payload.get("page_url", ""),
        "status": "new",
        "owner_sales_id": None,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }
    await db.sales_assist_requests.insert_one(request_doc)
    return {k: v for k, v in request_doc.items() if k != "_id"}
