import os
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
SERVICE_UPLOAD_DIR = UPLOAD_DIR / "service_requests"
SERVICE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(prefix="/api/uploads", tags=["Uploads"])


@router.post("/service-request-file")
async def upload_service_request_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    ext = Path(file.filename).suffix.lower()
    allowed = {
        ".jpg", ".jpeg", ".png", ".pdf", ".doc", ".docx",
        ".ppt", ".pptx", ".xls", ".xlsx", ".zip", ".txt"
    }

    if ext not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = SERVICE_UPLOAD_DIR / filename

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    return {
        "filename": file.filename,
        "stored_name": filename,
        "content_type": file.content_type,
        "size": len(content),
        "url": f"/uploads/service_requests/{filename}",
        "uploaded_at": datetime.utcnow().isoformat(),
    }
