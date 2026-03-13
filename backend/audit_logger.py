"""
Audit Logger Utility
Logs key system actions for accountability, review, and fraud prevention
"""
from datetime import datetime


async def log_audit_event(
    db,
    *,
    actor_id=None,
    actor_email=None,
    actor_role=None,
    action: str,
    entity_type: str,
    entity_id: str,
    entity_label: str = None,
    details: dict = None,
):
    """
    Log an audit event to the database
    
    Args:
        db: MongoDB database connection
        actor_id: ID of the user performing the action
        actor_email: Email of the user performing the action
        actor_role: Role of the user performing the action
        action: The action being performed (e.g., "quote.create", "invoice.send")
        entity_type: Type of entity being acted upon (e.g., "quote", "invoice", "order")
        entity_id: ID of the entity being acted upon
        entity_label: Human-readable label for the entity (e.g., quote number)
        details: Additional details about the action
    """
    await db.audit_logs.insert_one(
        {
            "actor_id": actor_id,
            "actor_email": actor_email,
            "actor_role": actor_role,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "entity_label": entity_label,
            "details": details or {},
            "created_at": datetime.utcnow(),
        }
    )
