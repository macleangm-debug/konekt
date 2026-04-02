"""
Sales Capability Service — MongoDB-backed lanes, category specialization, workload limits.
"""
from datetime import datetime, timezone


DEFAULT_CAPABILITY = {
    "lanes": [],
    "categories": [],
    "max_active_leads": 25,
    "active": True,
}


async def get_sales_capability(db, sales_user_id: str):
    doc = await db.sales_capabilities.find_one({"user_id": sales_user_id}, {"_id": 0})
    if not doc:
        return {**DEFAULT_CAPABILITY, "user_id": sales_user_id}
    return doc


async def upsert_sales_capability(db, sales_user_id: str, data: dict):
    now = datetime.now(timezone.utc).isoformat()
    allowed = {"lanes", "categories", "max_active_leads", "active"}
    update = {k: v for k, v in data.items() if k in allowed}
    update["updated_at"] = now

    existing = await db.sales_capabilities.find_one({"user_id": sales_user_id})
    if existing:
        await db.sales_capabilities.update_one(
            {"user_id": sales_user_id},
            {"$set": update}
        )
    else:
        await db.sales_capabilities.insert_one({
            **DEFAULT_CAPABILITY,
            **update,
            "user_id": sales_user_id,
            "created_at": now,
        })

    return await get_sales_capability(db, sales_user_id)


async def get_active_lead_count(db, sales_user_id: str) -> int:
    return await db.crm_leads.count_documents({
        "assigned_sales_owner_id": sales_user_id,
        "stage": {"$nin": ["won", "lost", "closed"]},
    })
