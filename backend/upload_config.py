"""
Konekt Upload Configuration
Defines upload directories and utilities
"""
import os
from pathlib import Path


def _resolve_upload_root() -> Path:
    """Resolve a writable upload root for different hosts (Render/Emergent/local)."""
    explicit = os.environ.get("UPLOAD_ROOT")
    if explicit:
        return Path(explicit)

    candidates = [
        Path("/var/data/konekt/uploads"),  # Render persistent disk (when mounted)
        Path("/tmp/konekt/uploads"),       # Safe writable fallback
    ]
    for c in candidates:
        try:
            c.mkdir(parents=True, exist_ok=True)
            return c
        except Exception:
            continue

    # Last resort: project-local relative folder
    return Path("static/uploads")


# Upload root directory
UPLOAD_ROOT = _resolve_upload_root()
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

# Payment proofs directory
PAYMENT_PROOFS_DIR = UPLOAD_ROOT / "payment_proofs"
PAYMENT_PROOFS_DIR.mkdir(parents=True, exist_ok=True)

# Service files directory
SERVICE_FILES_DIR = UPLOAD_ROOT / "service_files"
SERVICE_FILES_DIR.mkdir(parents=True, exist_ok=True)


def get_public_base_url(request) -> str:
    """Get the public base URL for file access"""
    forwarded_host = request.headers.get("x-forwarded-host")
    if forwarded_host:
        protocol = request.headers.get("x-forwarded-proto", "https")
        return f"{protocol}://{forwarded_host}"

    base_url = os.environ.get("REACT_APP_BACKEND_URL", "")
    if base_url:
        return base_url

    return f"{request.url.scheme}://{request.url.netloc}"
