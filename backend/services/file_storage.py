"""
File Storage Service — Emergent Object Storage integration.
Provides upload/download for vendor product images and other files.
"""
import os
import logging
import requests
from uuid import uuid4

logger = logging.getLogger("file_storage")

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "konekt"

_storage_key = None

MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "pdf": "application/pdf",
    "svg": "image/svg+xml",
}


def init_storage():
    """Initialize storage once at startup. Returns a session-scoped storage_key."""
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    logger.info("Object storage initialized")
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload a file. Returns {"path": ..., "size": ..., "etag": ...}"""
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    """Download a file. Returns (content_bytes, content_type)."""
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


def upload_file(data: bytes, filename: str, content_type: str = None, folder: str = "uploads") -> dict:
    """Upload a file and return metadata including the storage path."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    if not content_type:
        content_type = MIME_TYPES.get(ext, "application/octet-stream")

    file_id = str(uuid4())
    path = f"{APP_NAME}/{folder}/{file_id}.{ext}"

    result = put_object(path, data, content_type)
    return {
        "file_id": file_id,
        "storage_path": result["path"],
        "original_filename": filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "ext": ext,
    }
