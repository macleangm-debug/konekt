"""
Konekt Upload Configuration
Defines upload directories and utilities
"""
import os
from pathlib import Path

# Upload root directory
UPLOAD_ROOT = Path("/app/static/uploads")
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

# Payment proofs directory
PAYMENT_PROOFS_DIR = UPLOAD_ROOT / "payment_proofs"
PAYMENT_PROOFS_DIR.mkdir(parents=True, exist_ok=True)

# Service files directory
SERVICE_FILES_DIR = UPLOAD_ROOT / "service_files"
SERVICE_FILES_DIR.mkdir(parents=True, exist_ok=True)


def get_public_base_url(request) -> str:
    """Get the public base URL for file access"""
    # Check for forwarded host first (for proxied requests)
    forwarded_host = request.headers.get("x-forwarded-host")
    if forwarded_host:
        protocol = request.headers.get("x-forwarded-proto", "https")
        return f"{protocol}://{forwarded_host}"
    
    # Fall back to environment variable or request host
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "")
    if base_url:
        return base_url
    
    return f"{request.url.scheme}://{request.url.netloc}"
