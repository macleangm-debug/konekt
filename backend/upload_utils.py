"""
Konekt Upload Utilities
File upload helpers and validation
"""
import os
import uuid
from pathlib import Path
from datetime import datetime
from fastapi import UploadFile, HTTPException

# Allowed file types
ALLOWED_EXTENSIONS = {
    "image": {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"},
    "document": {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv"},
    "all": {".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv"},
}

# Max file size (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024


def validate_file(file: UploadFile, allowed_types: str = "all", max_size: int = MAX_FILE_SIZE):
    """Validate uploaded file type and size"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Get file extension
    ext = Path(file.filename).suffix.lower()
    
    # Validate extension
    allowed_exts = ALLOWED_EXTENSIONS.get(allowed_types, ALLOWED_EXTENSIONS["all"])
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not allowed. Allowed: {', '.join(allowed_exts)}"
        )
    
    return True


def generate_stored_filename(original_filename: str) -> str:
    """Generate a unique stored filename"""
    ext = Path(original_filename).suffix.lower()
    unique_id = uuid.uuid4().hex[:12]
    timestamp = datetime.utcnow().strftime("%H%M%S")
    return f"{timestamp}_{unique_id}{ext}"


async def save_upload_file(file: UploadFile, target_dir: Path, allowed_types: str = "all") -> dict:
    """
    Save an uploaded file to the target directory.
    Returns a dict with file metadata.
    """
    validate_file(file, allowed_types)
    
    # Read file content
    content = await file.read()
    
    # Check file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max size: {MAX_FILE_SIZE // 1024 // 1024}MB")
    
    # Generate stored filename
    stored_name = generate_stored_filename(file.filename)
    file_path = target_dir / stored_name
    
    # Ensure directory exists
    target_dir.mkdir(parents=True, exist_ok=True)
    
    # Write file
    with open(file_path, "wb") as f:
        f.write(content)
    
    return {
        "original_name": file.filename,
        "stored_name": stored_name,
        "size": len(content),
        "content_type": file.content_type or "application/octet-stream",
        "path": str(file_path),
    }
