"""
Health Routes
Health check endpoints for deployment monitoring
"""
from fastapi import APIRouter
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/health", tags=["Health"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.get("")
async def health():
    """Health check endpoint"""
    try:
        await db.command("ping")
        db_ok = True
    except Exception:
        db_ok = False
    
    return {
        "status": "ok" if db_ok else "degraded",
        "database": db_ok,
        "service": "konekt-backend",
    }


@router.get("/ready")
async def readiness():
    """Readiness check endpoint"""
    try:
        await db.command("ping")
        return {"ready": True}
    except Exception:
        return {"ready": False}
