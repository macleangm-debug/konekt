"""
Sales Guided Questions Routes
Saves lead qualification answers from the sales team
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, Dict, Any
import jwt

router = APIRouter(prefix="/api/sales/guided-questions", tags=["Sales Guided Questions"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
JWT_ALGORITHM = "HS256"
security = HTTPBearer(auto_error=False)


class GuidedAnswersInput(BaseModel):
    lead_id: str
    question_set_type: str = "new_customer"
    answers: Dict[str, Any]


async def get_staff_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        role = user.get("role", "customer")
        if role not in ["admin", "super_admin", "staff", "supervisor", "sales"]:
            raise HTTPException(status_code=403, detail="Staff access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/save")
async def save_guided_answers(
    data: GuidedAnswersInput,
    user: dict = Depends(get_staff_user)
):
    """Save guided question answers for a lead"""
    now = datetime.now(timezone.utc)
    
    # Check if lead exists
    lead = await db.leads.find_one({"id": data.lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Save answers to lead document
    await db.leads.update_one(
        {"id": data.lead_id},
        {
            "$set": {
                "guided_answers": {
                    "question_set_type": data.question_set_type,
                    "answers": data.answers,
                    "answered_by": user.get("id"),
                    "answered_at": now.isoformat(),
                },
                "updated_at": now.isoformat(),
            }
        }
    )
    
    # Also log this as a note/activity
    activity_doc = {
        "lead_id": data.lead_id,
        "type": "guided_questions_answered",
        "description": f"Completed {data.question_set_type.replace('_', ' ')} qualification questions",
        "details": data.answers,
        "created_by": user.get("id"),
        "created_at": now.isoformat(),
    }
    await db.lead_activities.insert_one(activity_doc)
    
    # Calculate lead score based on answers
    score = calculate_lead_score(data.answers, data.question_set_type)
    
    await db.leads.update_one(
        {"id": data.lead_id},
        {"$set": {"qualification_score": score}}
    )
    
    return {
        "ok": True,
        "message": "Guided answers saved successfully",
        "qualification_score": score,
    }


@router.get("/lead/{lead_id}")
async def get_guided_answers(
    lead_id: str,
    user: dict = Depends(get_staff_user)
):
    """Get guided question answers for a lead"""
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return {
        "lead_id": lead_id,
        "guided_answers": lead.get("guided_answers"),
        "qualification_score": lead.get("qualification_score"),
    }


def calculate_lead_score(answers: Dict[str, Any], question_set_type: str) -> int:
    """
    Calculate a qualification score based on answers.
    Score ranges from 0-100.
    """
    score = 50  # Base score
    
    # Budget scoring
    budget = answers.get("budget_range") or answers.get("monthly_volume")
    if budget:
        if "Above" in budget or "20M" in budget or "10M" in budget:
            score += 25
        elif "5M" in budget:
            score += 15
        elif "2M" in budget:
            score += 10
        elif "500K" in budget or "1M" in budget:
            score += 5
    
    # Company size scoring
    size = answers.get("company_size")
    if size:
        if "200+" in size:
            score += 15
        elif "51-200" in size:
            score += 10
        elif "11-50" in size:
            score += 5
    
    # Decision maker scoring
    decision = answers.get("decision_maker")
    if decision:
        if "Yes" in decision:
            score += 10
        elif "committee" in decision.lower():
            score += 5
    
    # Timeline scoring
    timeline = answers.get("timeline")
    if timeline:
        if "Urgent" in timeline:
            score += 10
        elif "Standard" in timeline:
            score += 5
    
    # Payment terms (for business pricing)
    payment = answers.get("payment_terms")
    if payment:
        if "Pay upfront" in payment:
            score += 10
        elif "Net 15" in payment:
            score += 5
    
    # Contract commitment
    contract = answers.get("contract_length")
    if contract:
        if "12+ months" in contract:
            score += 10
        elif "6-12" in contract:
            score += 5
    
    return min(100, max(0, score))  # Clamp to 0-100
