"""
Auto-Numbering Configuration Routes
Admin UI to configure formats for SKUs, invoices, quotes, and orders
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List
import jwt

router = APIRouter(prefix="/api/admin/auto-numbering", tags=["Auto Numbering"])

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
JWT_ALGORITHM = "HS256"
security = HTTPBearer(auto_error=False)


class NumberingFormat(BaseModel):
    prefix: str = ""
    include_date: bool = True
    date_format: str = "YYYYMMDD"  # YYYYMMDD, YYMM, MMYY
    separator: str = "-"
    sequence_length: int = 4
    start_number: int = 1


class AutoNumberingConfig(BaseModel):
    invoice_format: Optional[NumberingFormat] = None
    quote_format: Optional[NumberingFormat] = None
    order_format: Optional[NumberingFormat] = None
    sku_format: Optional[NumberingFormat] = None
    delivery_note_format: Optional[NumberingFormat] = None
    grn_format: Optional[NumberingFormat] = None


async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        role = user.get("role", "customer")
        if role not in ["admin", "super_admin", "finance"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_default_config():
    """Return default numbering configuration"""
    return {
        "invoice_format": {
            "prefix": "INV",
            "include_date": True,
            "date_format": "YYYYMMDD",
            "separator": "-",
            "sequence_length": 4,
            "start_number": 1,
        },
        "quote_format": {
            "prefix": "QT",
            "include_date": True,
            "date_format": "YYYYMMDD",
            "separator": "-",
            "sequence_length": 4,
            "start_number": 1,
        },
        "order_format": {
            "prefix": "KNK",
            "include_date": True,
            "date_format": "YYYYMMDD",
            "separator": "-",
            "sequence_length": 6,
            "start_number": 1,
        },
        "sku_format": {
            "prefix": "SKU",
            "include_date": False,
            "date_format": "YYYYMMDD",
            "separator": "-",
            "sequence_length": 5,
            "start_number": 1,
        },
        "delivery_note_format": {
            "prefix": "DN",
            "include_date": True,
            "date_format": "YYYYMMDD",
            "separator": "-",
            "sequence_length": 4,
            "start_number": 1,
        },
        "grn_format": {
            "prefix": "GRN",
            "include_date": True,
            "date_format": "YYYYMMDD",
            "separator": "-",
            "sequence_length": 4,
            "start_number": 1,
        },
    }


@router.get("/config")
async def get_numbering_config(user: dict = Depends(get_admin_user)):
    """Get current auto-numbering configuration"""
    config = await db.auto_numbering_config.find_one({"type": "numbering"}, {"_id": 0})
    
    if not config:
        config = get_default_config()
        config["type"] = "numbering"
    
    return config


@router.put("/config")
async def update_numbering_config(
    data: AutoNumberingConfig,
    user: dict = Depends(get_admin_user)
):
    """Update auto-numbering configuration"""
    now = datetime.now(timezone.utc)
    
    update_data = {
        "type": "numbering",
        "updated_at": now.isoformat(),
        "updated_by": user.get("id"),
    }
    
    # Add non-None fields
    if data.invoice_format:
        update_data["invoice_format"] = data.invoice_format.model_dump()
    if data.quote_format:
        update_data["quote_format"] = data.quote_format.model_dump()
    if data.order_format:
        update_data["order_format"] = data.order_format.model_dump()
    if data.sku_format:
        update_data["sku_format"] = data.sku_format.model_dump()
    if data.delivery_note_format:
        update_data["delivery_note_format"] = data.delivery_note_format.model_dump()
    if data.grn_format:
        update_data["grn_format"] = data.grn_format.model_dump()
    
    await db.auto_numbering_config.update_one(
        {"type": "numbering"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"ok": True, "message": "Numbering configuration updated"}


@router.get("/preview/{document_type}")
async def preview_number_format(
    document_type: str,
    user: dict = Depends(get_admin_user)
):
    """Preview what the next number would look like"""
    config = await db.auto_numbering_config.find_one({"type": "numbering"}, {"_id": 0})
    default_config = get_default_config()
    
    # Merge with defaults - always have all formats available
    if not config:
        config = default_config
    else:
        # Fill in any missing formats from defaults
        for key, value in default_config.items():
            if key not in config:
                config[key] = value
    
    format_key = f"{document_type}_format"
    if format_key not in config:
        raise HTTPException(status_code=400, detail=f"Unknown document type: {document_type}")
    
    fmt = config[format_key]
    
    # Get current sequence
    seq_doc = await db.auto_numbering_sequences.find_one({"type": document_type})
    current_seq = seq_doc.get("current", 0) if seq_doc else 0
    next_seq = current_seq + 1
    
    # Build preview
    parts = []
    if fmt.get("prefix"):
        parts.append(fmt["prefix"])
    
    if fmt.get("include_date"):
        from datetime import datetime
        now = datetime.now()
        date_fmt = fmt.get("date_format", "YYYYMMDD")
        if date_fmt == "YYYYMMDD":
            parts.append(now.strftime("%Y%m%d"))
        elif date_fmt == "YYMM":
            parts.append(now.strftime("%y%m"))
        elif date_fmt == "MMYY":
            parts.append(now.strftime("%m%y"))
    
    seq_len = fmt.get("sequence_length", 4)
    parts.append(str(next_seq).zfill(seq_len))
    
    separator = fmt.get("separator", "-")
    preview = separator.join(parts)
    
    return {
        "document_type": document_type,
        "preview": preview,
        "current_sequence": current_seq,
        "next_sequence": next_seq,
    }


@router.post("/reset-sequence/{document_type}")
async def reset_sequence(
    document_type: str,
    start_number: int = 1,
    user: dict = Depends(get_admin_user)
):
    """Reset sequence for a document type (use with caution)"""
    await db.auto_numbering_sequences.update_one(
        {"type": document_type},
        {"$set": {
            "current": start_number - 1,
            "reset_at": datetime.now(timezone.utc).isoformat(),
            "reset_by": user.get("id"),
        }},
        upsert=True
    )
    
    return {
        "ok": True,
        "message": f"Sequence for {document_type} reset to start at {start_number}",
    }
