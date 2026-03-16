"""
Partner Activity Log Service - Track partner actions for auditing
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any


async def log_partner_activity(
    db,
    *,
    partner_id: str,
    action: str,
    details: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    ip_address: Optional[str] = None,
):
    """
    Log an activity for a partner.
    
    Actions can include:
    - listing_created
    - listing_updated
    - listing_submitted
    - listing_approved
    - listing_rejected
    - bulk_import_started
    - bulk_import_completed
    - stock_updated
    - fulfillment_accepted
    - fulfillment_completed
    - login
    - logout
    """
    log_doc = {
        "partner_id": partner_id,
        "action": action,
        "details": details or {},
        "user_id": user_id,
        "user_email": user_email,
        "ip_address": ip_address,
        "created_at": datetime.now(timezone.utc),
    }
    
    await db.partner_activity_logs.insert_one(log_doc)


async def get_partner_activity_logs(
    db,
    *,
    partner_id: str,
    action: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
):
    """
    Get activity logs for a partner.
    """
    query = {"partner_id": partner_id}
    if action:
        query["action"] = action
    
    cursor = db.partner_activity_logs.find(
        query, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit)
    
    logs = await cursor.to_list(length=limit)
    return logs


async def get_recent_partner_activities(
    db,
    *,
    limit: int = 50,
    action_filter: Optional[str] = None,
):
    """
    Get recent activities across all partners.
    """
    query = {}
    if action_filter:
        query["action"] = action_filter
    
    cursor = db.partner_activity_logs.find(
        query, {"_id": 0}
    ).sort("created_at", -1).limit(limit)
    
    logs = await cursor.to_list(length=limit)
    return logs
