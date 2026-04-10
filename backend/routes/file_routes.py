"""
File Upload/Download Routes.
Handles image uploads for vendor products and general file serving.
"""
import os
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, UploadFile, File, Header, Query, Request
from fastapi.responses import Response
from typing import Optional, List
from services.file_storage import upload_file, get_object, init_storage

router = APIRouter(prefix="/api/files", tags=["Files"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}


@router.post("/upload")
async def upload_image(
    request: Request,
    file: UploadFile = File(...),
    folder: str = "products",
):
    """Upload an image file. Returns file metadata with storage path."""
    db = request.app.mongodb

    # Validate
    if file.content_type and file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"File type {file.content_type} not allowed. Use JPEG, PNG, GIF, or WebP.")

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    # Upload to object storage
    result = upload_file(data, file.filename, file.content_type, folder=folder)

    # Store reference in DB
    doc = {
        "id": result["file_id"],
        "storage_path": result["storage_path"],
        "original_filename": result["original_filename"],
        "content_type": result["content_type"],
        "size": result["size"],
        "folder": folder,
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.uploaded_files.insert_one(doc)

    return {
        "ok": True,
        "file_id": result["file_id"],
        "storage_path": result["storage_path"],
        "original_filename": result["original_filename"],
        "content_type": result["content_type"],
        "size": result["size"],
    }


@router.post("/upload-multiple")
async def upload_multiple(
    request: Request,
    files: List[UploadFile] = File(...),
    folder: str = "products",
):
    """Upload multiple image files. Returns list of file metadata."""
    db = request.app.mongodb
    results = []

    for f in files[:10]:  # Max 10 files
        if f.content_type and f.content_type not in ALLOWED_IMAGE_TYPES:
            results.append({"error": f"Skipped {f.filename}: unsupported type {f.content_type}"})
            continue

        data = await f.read()
        if len(data) > MAX_FILE_SIZE:
            results.append({"error": f"Skipped {f.filename}: too large"})
            continue

        result = upload_file(data, f.filename, f.content_type, folder=folder)
        doc = {
            "id": result["file_id"],
            "storage_path": result["storage_path"],
            "original_filename": result["original_filename"],
            "content_type": result["content_type"],
            "size": result["size"],
            "folder": folder,
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.uploaded_files.insert_one(doc)
        results.append({
            "file_id": result["file_id"],
            "storage_path": result["storage_path"],
            "original_filename": result["original_filename"],
        })

    return {"ok": True, "files": results}


@router.get("/serve/{path:path}")
async def serve_file(path: str, request: Request, auth: Optional[str] = Query(None)):
    """Serve a file from object storage. Supports query param auth for img tags."""
    db = request.app.mongodb

    # Check DB record
    record = await db.uploaded_files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        # Fallback: try serving directly if path exists
        try:
            data, content_type = get_object(path)
            return Response(content=data, media_type=content_type)
        except Exception:
            raise HTTPException(status_code=404, detail="File not found")

    try:
        data, content_type = get_object(path)
        return Response(
            content=data,
            media_type=record.get("content_type", content_type),
            headers={"Cache-Control": "public, max-age=86400"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve file: {str(e)}")
