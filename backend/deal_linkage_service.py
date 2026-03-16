"""
Deal Linkage Service
Links leads to related quotes, invoices, orders, payments, and tasks
"""
from bson import ObjectId


async def get_lead_related_documents(db, lead: dict):
    """Get all documents related to a lead by email, lead_id, or company"""
    lead_email = lead.get("email")
    lead_company = lead.get("company_name")
    lead_id = str(lead.get("_id"))

    quotes = await db.quotes_v2.find(
        {
            "$or": [
                {"customer_email": lead_email},
                {"lead_id": lead_id},
                {"customer_company": lead_company},
            ]
        }
    ).sort("created_at", -1).to_list(length=100)

    invoices = await db.invoices_v2.find(
        {
            "$or": [
                {"customer_email": lead_email},
                {"lead_id": lead_id},
                {"customer_company": lead_company},
            ]
        }
    ).sort("created_at", -1).to_list(length=100)

    orders = await db.orders.find(
        {
            "$or": [
                {"customer_email": lead_email},
                {"lead_id": lead_id},
                {"customer_company": lead_company},
            ]
        }
    ).sort("created_at", -1).to_list(length=100)

    payments = await db.payments.find(
        {
            "$or": [
                {"customer_email": lead_email},
                {"lead_id": lead_id},
            ]
        }
    ).sort("created_at", -1).to_list(length=100)

    tasks = await db.tasks.find(
        {
            "$or": [
                {"lead_id": lead_id},
                {"customer_email": lead_email},
            ]
        }
    ).sort("created_at", -1).to_list(length=100)

    def serialize_many(items):
        output = []
        for doc in items:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            output.append(doc)
        return output

    return {
        "quotes": serialize_many(quotes),
        "invoices": serialize_many(invoices),
        "orders": serialize_many(orders),
        "payments": serialize_many(payments),
        "tasks": serialize_many(tasks),
    }
