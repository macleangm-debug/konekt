"""
Media Upload Routes
File upload for listing images and documents
"""
import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from typing import List

router = APIRouter(prefix="/api/media-upload", tags=["Media Upload"])

UPLOAD_ROOT = "/app/backend/uploads"
LISTING_MEDIA_DIR = os.path.join(UPLOAD_ROOT, "listing_media")

# Ensure directories exist
os.makedirs(LISTING_MEDIA_DIR, exist_ok=True)

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_DOC_EXTENSIONS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/listing-media")
async def upload_listing_media(
    file: UploadFile = File(...),
    kind: str = Form(default="image"),  # image | document
):
    """Upload a single file for listings"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = os.path.splitext(file.filename)[1].lower()

    allowed = ALLOWED_IMAGE_EXTENSIONS if kind == "image" else ALLOWED_DOC_EXTENSIONS
    if ext not in allowed:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Allowed for {kind}: {', '.join(allowed)}"
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max size: {MAX_FILE_SIZE / 1024 / 1024}MB")

    file_id = str(uuid.uuid4())
    safe_name = f"{file_id}{ext}"
    full_path = os.path.join(LISTING_MEDIA_DIR, safe_name)

    with open(full_path, "wb") as f:
        f.write(content)

    public_url = f"/uploads/listing_media/{safe_name}"

    return {
        "file_name": file.filename,
        "stored_name": safe_name,
        "kind": kind,
        "url": public_url,
        "size": len(content),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/listing-media/multiple")
async def upload_multiple_listing_media(
    files: List[UploadFile] = File(...),
    kind: str = Form(default="image"),
):
    """Upload multiple files at once"""
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    results = []
    errors = []

    allowed = ALLOWED_IMAGE_EXTENSIONS if kind == "image" else ALLOWED_DOC_EXTENSIONS

    for idx, file in enumerate(files):
        try:
            if not file.filename:
                errors.append({"index": idx, "error": "No filename"})
                continue

            ext = os.path.splitext(file.filename)[1].lower()
            if ext not in allowed:
                errors.append({"index": idx, "filename": file.filename, "error": f"Unsupported type: {ext}"})
                continue

            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                errors.append({"index": idx, "filename": file.filename, "error": "File too large"})
                continue

            file_id = str(uuid.uuid4())
            safe_name = f"{file_id}{ext}"
            full_path = os.path.join(LISTING_MEDIA_DIR, safe_name)

            with open(full_path, "wb") as f:
                f.write(content)

            results.append({
                "file_name": file.filename,
                "stored_name": safe_name,
                "kind": kind,
                "url": f"/uploads/listing_media/{safe_name}",
                "size": len(content),
            })

        except Exception as e:
            errors.append({"index": idx, "filename": file.filename if file.filename else "unknown", "error": str(e)})

    return {
        "uploaded": results,
        "errors": errors,
        "success_count": len(results),
        "error_count": len(errors),
    }


@router.delete("/listing-media/{filename}")
async def delete_listing_media(filename: str):
    """Delete an uploaded file"""
    file_path = os.path.join(LISTING_MEDIA_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    os.remove(file_path)
    return {"message": "File deleted", "filename": filename}
