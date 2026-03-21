"""
Sales Queue Routes
Provide a simplified view of sales opportunities for the sales team.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Request, HTTPException
from bson import ObjectId

router = APIRouter(prefix="/api/sales-queue", tags=["Sales Queue"])


def serialize_doc(doc):
    if doc is None:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.get("")
async def list_sales_queue(
    request: Request, 
    stage: str = None, 
    source: str = None,
    assigned_to: str = None,
    limit: int = 300
):
    """List sales queue items with filters"""
    db = request.app.mongodb
    query = {}
    
    if stage:
        query["stage"] = stage
    if source:
        query["source"] = source
    if assigned_to:
        query["assigned_sales_id"] = assigned_to
    
    docs = await db.sales_opportunities.find(query).sort("created_at", -1).to_list(length=limit)
    return [serialize_doc(doc) for doc in docs]


@router.get("/stats")
async def get_sales_queue_stats(request: Request):
    """Get aggregate stats for the sales queue"""
    db = request.app.mongodb
    
    total = await db.sales_opportunities.count_documents({})
    new = await db.sales_opportunities.count_documents({"stage": "new"})
    contacted = await db.sales_opportunities.count_documents({"stage": "contacted"})
    quote_sent = await db.sales_opportunities.count_documents({"stage": "quote_sent"})
    approved = await db.sales_opportunities.count_documents({"stage": "approved"})
    closed_won = await db.sales_opportunities.count_documents({"stage": "closed_won"})
    closed_lost = await db.sales_opportunities.count_documents({"stage": "closed_lost"})
    
    return {
        "total": total,
        "new": new,
        "contacted": contacted,
        "quote_sent": quote_sent,
        "approved": approved,
        "closed_won": closed_won,
        "closed_lost": closed_lost,
    }


@router.get("/{opportunity_id}")
async def get_sales_queue_item(opportunity_id: str, request: Request):
    """Get a single sales queue item with full details"""
    db = request.app.mongodb
    
    try:
        doc = await db.sales_opportunities.find_one({"_id": ObjectId(opportunity_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid opportunity ID")
    
    if not doc:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    return serialize_doc(doc)


@router.put("/{opportunity_id}/stage")
async def update_sales_queue_stage(opportunity_id: str, payload: dict, request: Request):
    """Update the stage of a sales queue item"""
    db = request.app.mongodb
    now = datetime.now(timezone.utc)
    
    new_stage = payload.get("stage")
    note = payload.get("note", "")
    
    valid_stages = [
        "new", "contacted", "quote_in_progress", "quote_sent", 
        "approved", "handed_to_operations", "closed_won", "closed_lost"
    ]
    
    if new_stage not in valid_stages:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {valid_stages}")
    
    await db.sales_opportunities.update_one(
        {"_id": ObjectId(opportunity_id)},
        {
            "$set": {
                "stage": new_stage,
                "updated_at": now,
            },
            "$push": {
                "stage_history": {
                    "stage": new_stage,
                    "note": note,
                    "timestamp": now.isoformat(),
                }
            }
        }
    )
    
    doc = await db.sales_opportunities.find_one({"_id": ObjectId(opportunity_id)})
    return serialize_doc(doc)


@router.put("/{opportunity_id}/assign")
async def assign_sales_queue_item(opportunity_id: str, payload: dict, request: Request):
    """Assign a sales queue item to a sales rep"""
    db = request.app.mongodb
    now = datetime.now(timezone.utc)
    
    await db.sales_opportunities.update_one(
        {"_id": ObjectId(opportunity_id)},
        {"$set": {
            "assigned_sales_id": payload.get("assigned_sales_id"),
            "assigned_sales_name": payload.get("assigned_sales_name"),
            "updated_at": now,
        }}
    )
    
    doc = await db.sales_opportunities.find_one({"_id": ObjectId(opportunity_id)})
    return serialize_doc(doc)
