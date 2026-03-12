"""
Konekt Payment Upload Routes
Handle payment proof uploads
"""
from datetime import datetime
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

from upload_config import PAYMENT_PROOFS_DIR, get_public_base_url
from upload_utils import save_upload_file

router = APIRouter(prefix="/api/uploads", tags=["Uploads"])


@router.post("/payment-proof")
async def upload_payment_proof(
    request: Request,
    payment_id: str = Form(...),
    customer_email: str = Form(...),
    file: UploadFile = File(...),
):
    """Upload a payment proof file (bank transfer receipt, screenshot, etc.)"""
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    # Create date-based subdirectory
    date_dir = datetime.utcnow().strftime("%Y%m%d")
    target_dir = PAYMENT_PROOFS_DIR / date_dir
    target_dir.mkdir(parents=True, exist_ok=True)

    # Save the file
    saved = await save_upload_file(file, target_dir, allowed_types="all")
    
    # Build public URL
    public_base_url = get_public_base_url(request)
    relative_url = f"/static/uploads/payment_proofs/{date_dir}/{saved['stored_name']}"

    return {
        "message": "Payment proof uploaded successfully",
        "payment_id": payment_id,
        "file": {
            "filename": saved["original_name"],
            "stored_name": saved["stored_name"],
            "size": saved["size"],
            "content_type": saved["content_type"],
            "url": f"{public_base_url}{relative_url}",
            "relative_url": relative_url,
            "uploaded_by": customer_email,
        },
    }
