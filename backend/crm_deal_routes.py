"""
CRM Deal Routes
Lead detail with linkage, sales forecast, staff leaderboard, marketing ROI
"""
from datetime import datetime
import os
from bson import ObjectId
from fastapi import APIRouter, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

from deal_linkage_service import get_lead_related_documents

router = APIRouter(prefix="/api/admin/crm-deals", tags=["CRM Deals"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def serialize_doc(doc):
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc


@router.get("/leads/{lead_id}")
async def get_lead_detail(lead_id: str):
    # Try ObjectId lookup first, then fallback to custom id field
    lead = None
    try:
        lead = await db.crm_leads.find_one({"_id": ObjectId(lead_id)})
    except Exception:
        pass
    if not lead:
        lead = await db.crm_leads.find_one({"id": lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    related = await get_lead_related_documents(db, lead)
    lead_serialized = serialize_doc(lead)

    return {
        "lead": lead_serialized,
        "related": related,
    }


@router.get("/forecast")
async def sales_forecast():
    leads = await db.crm_leads.find({
        "stage": {"$in": ["qualified", "meeting_demo", "quote_sent", "negotiation", "won"]}
    }).to_list(length=1000)

    stage_weights = {
        "qualified": 0.25,
        "meeting_demo": 0.40,
        "quote_sent": 0.60,
        "negotiation": 0.80,
        "won": 1.00,
    }

    pipeline_value = 0
    weighted_value = 0

    for lead in leads:
        expected_value = float(lead.get("expected_value", 0) or 0)
        stage = lead.get("stage", "qualified")
        weight = stage_weights.get(stage, 0.10)

        pipeline_value += expected_value
        weighted_value += expected_value * weight

    return {
        "pipeline_value": pipeline_value,
        "weighted_forecast": round(weighted_value, 2),
        "lead_count": len(leads),
        "stage_weights": stage_weights,
    }


@router.get("/leaderboard")
async def staff_leaderboard():
    assigned_cursor = db.crm_leads.aggregate([
        {
            "$group": {
                "_id": "$assigned_to",
                "lead_count": {"$sum": 1},
                "won_count": {
                    "$sum": {
                        "$cond": [{"$eq": ["$stage", "won"]}, 1, 0]
                    }
                },
                "quote_sent_count": {
                    "$sum": {
                        "$cond": [{"$eq": ["$stage", "quote_sent"]}, 1, 0]
                    }
                },
                "pipeline_value": {
                    "$sum": {"$ifNull": ["$expected_value", 0]}
                }
            }
        }
    ])

    results = []
    async for row in assigned_cursor:
        email = row["_id"] or "unassigned"

        won_revenue_cursor = db.invoices.aggregate([
            {"$match": {"assigned_to": email, "status": "paid"}},
            {"$group": {"_id": None, "revenue": {"$sum": "$total"}}}
        ])

        won_revenue = 0
        async for revenue_row in won_revenue_cursor:
            won_revenue = revenue_row.get("revenue", 0)

        lead_count = row.get("lead_count", 0)
        won_count = row.get("won_count", 0)
        conversion_rate = (won_count / lead_count * 100) if lead_count else 0

        results.append({
            "assigned_to": email,
            "lead_count": lead_count,
            "won_count": won_count,
            "quote_sent_count": row.get("quote_sent_count", 0),
            "pipeline_value": row.get("pipeline_value", 0),
            "won_revenue": won_revenue,
            "conversion_rate": round(conversion_rate, 2),
        })

    results.sort(key=lambda x: (x["won_revenue"], x["won_count"], x["lead_count"]), reverse=True)
    return results


@router.get("/marketing-roi")
async def marketing_roi():
    lead_sources = await db.crm_leads.aggregate([
        {
            "$group": {
                "_id": "$source",
                "lead_count": {"$sum": 1},
                "won_count": {"$sum": {"$cond": [{"$eq": ["$stage", "won"]}, 1, 0]}},
                "pipeline_value": {"$sum": {"$ifNull": ["$expected_value", 0]}}
            }
        }
    ]).to_list(length=200)

    output = []

    for row in lead_sources:
        source = row["_id"] or "unknown"

        paid_invoice_cursor = db.invoices.aggregate([
            {"$match": {"lead_source": source, "status": "paid"}},
            {"$group": {"_id": None, "closed_revenue": {"$sum": "$total"}}}
        ])

        closed_revenue = 0
        async for revenue_row in paid_invoice_cursor:
            closed_revenue = revenue_row.get("closed_revenue", 0)

        output.append({
            "source": source,
            "lead_count": row.get("lead_count", 0),
            "won_count": row.get("won_count", 0),
            "pipeline_value": row.get("pipeline_value", 0),
            "closed_revenue": closed_revenue,
        })

    output.sort(key=lambda x: x["closed_revenue"], reverse=True)
    return output
