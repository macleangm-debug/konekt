"""
Smart Partner Ecosystem Routes
Unified partner management with type-aware logic (Service vs Product)
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/partners-smart", tags=["Smart Partner Ecosystem"])

# Database connection
client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
db = client[os.environ.get('DB_NAME', 'konekt_db')]


def serialize_doc(doc):
    if doc is None:
        return None
    doc["id"] = str(doc.pop("_id", ""))
    return doc


class PartnerCreate(BaseModel):
    name: str
    email: str
    partner_type: str  # "service", "product", "hybrid"
    country_code: str = "TZ"
    regions: List[str] = []
    specific_services: List[str] = []  # For service partners
    contact_phone: Optional[str] = None
    lead_time_days: int = 3
    settlement_terms: str = "net_30"
    notes: Optional[str] = None


class PartnerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    partner_type: Optional[str] = None
    country_code: Optional[str] = None
    regions: Optional[List[str]] = None
    specific_services: Optional[List[str]] = None
    contact_phone: Optional[str] = None
    lead_time_days: Optional[int] = None
    settlement_terms: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


@router.get("")
async def list_partners(partner_type: Optional[str] = None, status: Optional[str] = None):
    """List all partners with optional filtering by type and status"""
    query = {}
    if partner_type:
        query["partner_type"] = partner_type
    if status:
        query["status"] = status
    
    partners = await db.partners.find(query, {"_id": 1, "name": 1, "email": 1, "partner_type": 1, 
                                               "country_code": 1, "regions": 1, "specific_services": 1,
                                               "status": 1, "lead_time_days": 1, "created_at": 1}).sort("created_at", -1).to_list(length=500)
    
    # Get partner stats
    for p in partners:
        p["id"] = str(p.pop("_id", ""))
        
        # Get job count for this partner
        job_count = await db.service_jobs.count_documents({"partner_id": p["id"]})
        p["total_jobs"] = job_count
        
        # Get completed jobs
        completed_count = await db.service_jobs.count_documents({"partner_id": p["id"], "status": "completed"})
        p["completed_jobs"] = completed_count
    
    return partners


@router.get("/{partner_id}")
async def get_partner(partner_id: str):
    """Get single partner with full details"""
    try:
        partner = await db.partners.find_one({"_id": ObjectId(partner_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid partner ID")
    
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    partner = serialize_doc(partner)
    
    # Get performance stats
    total_jobs = await db.service_jobs.count_documents({"partner_id": partner_id})
    completed_jobs = await db.service_jobs.count_documents({"partner_id": partner_id, "status": "completed"})
    
    partner["stats"] = {
        "total_jobs": total_jobs,
        "completed_jobs": completed_jobs,
        "completion_rate": round((completed_jobs / total_jobs * 100) if total_jobs > 0 else 0, 1)
    }
    
    return partner


@router.post("")
async def create_partner(data: PartnerCreate):
    """Create a new partner with type-aware validation"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Validate based on partner type
    if data.partner_type == "service" and not data.specific_services:
        # Service partners should have services defined
        pass  # Allow empty for now, admin can add later
    
    partner_doc = {
        "name": data.name,
        "email": data.email,
        "partner_type": data.partner_type,
        "country_code": data.country_code,
        "regions": data.regions,
        "specific_services": data.specific_services,
        "contact_phone": data.contact_phone,
        "lead_time_days": data.lead_time_days,
        "settlement_terms": data.settlement_terms,
        "notes": data.notes,
        "status": "active",
        "created_at": now,
        "updated_at": now,
        # Type-specific flags
        "has_catalog": data.partner_type in ["product", "hybrid"],
        "has_inventory": data.partner_type in ["product", "hybrid"],
        "quote_based": data.partner_type in ["service", "hybrid"],
    }
    
    result = await db.partners.insert_one(partner_doc)
    partner_doc["id"] = str(result.inserted_id)
    if "_id" in partner_doc:
        del partner_doc["_id"]
    
    return {"message": "Partner created successfully", "partner": partner_doc}


@router.put("/{partner_id}")
async def update_partner(partner_id: str, data: PartnerUpdate):
    """Update partner with type-aware logic"""
    try:
        existing = await db.partners.find_one({"_id": ObjectId(partner_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid partner ID")
    
    if not existing:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Update type-specific flags if type changed
    if "partner_type" in update_data:
        pt = update_data["partner_type"]
        update_data["has_catalog"] = pt in ["product", "hybrid"]
        update_data["has_inventory"] = pt in ["product", "hybrid"]
        update_data["quote_based"] = pt in ["service", "hybrid"]
    
    await db.partners.update_one({"_id": ObjectId(partner_id)}, {"$set": update_data})
    
    updated = await db.partners.find_one({"_id": ObjectId(partner_id)})
    return {"message": "Partner updated", "partner": serialize_doc(updated)}


@router.put("/{partner_id}/status")
async def update_partner_status(partner_id: str, payload: dict):
    """Update partner status (active, paused, suspended)"""
    status = payload.get("status")
    if status not in ["active", "paused", "suspended"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    try:
        result = await db.partners.update_one(
            {"_id": ObjectId(partner_id)},
            {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid partner ID")
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    return {"message": f"Partner status updated to {status}"}


@router.put("/{partner_id}/services")
async def update_partner_services(partner_id: str, payload: dict):
    """Update specific services for a partner"""
    services = payload.get("services", [])
    
    try:
        result = await db.partners.update_one(
            {"_id": ObjectId(partner_id)},
            {"$set": {
                "specific_services": services,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid partner ID")
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Partner not found")
    
    return {"message": "Services updated", "services": services}


@router.get("/stats/summary")
async def get_partners_summary():
    """Get summary statistics for the partner ecosystem"""
    total = await db.partners.count_documents({})
    active = await db.partners.count_documents({"status": "active"})
    service_partners = await db.partners.count_documents({"partner_type": "service"})
    product_partners = await db.partners.count_documents({"partner_type": "product"})
    hybrid_partners = await db.partners.count_documents({"partner_type": "hybrid"})
    
    return {
        "total_partners": total,
        "active_partners": active,
        "by_type": {
            "service": service_partners,
            "product": product_partners,
            "hybrid": hybrid_partners
        }
    }
