"""
EFD Receipt Routes — On-demand compliance document workflow.
EFD receipts are internal-only, triggered by staff, and linked to invoices/orders.
"""
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/efd", tags=["EFD Receipts"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


def _serialize(doc):
    if not doc:
        return None
    d = dict(doc)
    d["id"] = str(d.pop("_id"))
    for k, v in d.items():
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


@router.post("/request/{invoice_id}")
async def request_efd(invoice_id: str, payload: dict):
    """
    Staff initiates EFD request for an invoice.
    Validates VRN + BRN for business clients before proceeding.
    """
    invoice = await db.invoices.find_one({"id": invoice_id})
    if not invoice:
        try:
            invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
        except Exception:
            pass
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Check if already requested
    existing = await db.efd_receipts.find_one({"invoice_id": invoice_id})
    if existing:
        return _serialize(existing)

    # For business clients, validate VRN and BRN
    customer_id = invoice.get("customer_id")
    if customer_id:
        customer = await db.users.find_one({"id": customer_id})
        if customer and (customer.get("client_type") == "business" or customer.get("company")):
            vrn = payload.get("vrn") or customer.get("vrn")
            brn = payload.get("brn") or customer.get("brn")
            missing = []
            if not vrn:
                missing.append("VRN")
            if not brn:
                missing.append("BRN")
            if missing:
                raise HTTPException(
                    status_code=400,
                    detail=f"Business clients require {', '.join(missing)} before EFD can be issued."
                )

    efd_doc = {
        "invoice_id": invoice_id,
        "invoice_number": invoice.get("invoice_number", ""),
        "customer_id": customer_id,
        "customer_name": invoice.get("customer_name", ""),
        "vrn": payload.get("vrn", ""),
        "brn": payload.get("brn", ""),
        "efd_number": payload.get("efd_number", ""),
        "status": "pending",
        "efd_file": None,
        "requested_by": payload.get("requested_by", ""),
        "requested_at": datetime.now(timezone.utc),
        "uploaded_at": None,
        "created_at": datetime.now(timezone.utc),
    }

    result = await db.efd_receipts.insert_one(efd_doc)
    created = await db.efd_receipts.find_one({"_id": result.inserted_id})
    return _serialize(created)


@router.patch("/{efd_id}")
async def update_efd(efd_id: str, payload: dict):
    """Update EFD receipt (upload file path, EFD number, status)."""
    try:
        efd = await db.efd_receipts.find_one({"_id": ObjectId(efd_id)})
    except Exception:
        raise HTTPException(status_code=404, detail="EFD receipt not found")
    if not efd:
        raise HTTPException(status_code=404, detail="EFD receipt not found")

    update_fields = {}
    if "efd_file" in payload:
        update_fields["efd_file"] = payload["efd_file"]
        update_fields["status"] = "uploaded"
        update_fields["uploaded_at"] = datetime.now(timezone.utc)
    if "efd_number" in payload:
        update_fields["efd_number"] = payload["efd_number"]
    if "status" in payload:
        update_fields["status"] = payload["status"]

    if update_fields:
        await db.efd_receipts.update_one({"_id": ObjectId(efd_id)}, {"$set": update_fields})

    updated = await db.efd_receipts.find_one({"_id": ObjectId(efd_id)})
    return _serialize(updated)


@router.get("/invoice/{invoice_id}")
async def get_efd_for_invoice(invoice_id: str):
    """Get EFD receipt linked to an invoice (if any)."""
    doc = await db.efd_receipts.find_one({"invoice_id": invoice_id})
    if not doc:
        return None
    return _serialize(doc)


@router.get("")
async def list_efd_receipts(status: str = None):
    """List all EFD receipts, optionally filtered by status."""
    query = {}
    if status:
        query["status"] = status
    docs = await db.efd_receipts.find(query).sort("created_at", -1).to_list(length=200)
    return [_serialize(d) for d in docs]
