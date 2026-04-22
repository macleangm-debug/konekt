"""
QR Code Service — server-side cached QR generation for canonical landing pages.

Supported kinds:
  - product        → /shop/product/{id}
  - group_deal     → /group-deals/{id}
  - promo_campaign → /promo/{id}
  - content_post   → /content/{id}

Usage:
  GET /api/qr/{kind}/{id}.png   → returns PNG (file response, cached on disk)
  GET /api/qr/{kind}/{id}       → returns {url, qr_image_url, target_url} JSON

Cache: /app/static/qr/{kind}/{id}.png

The QR always encodes the canonical public landing URL (FRONTEND_URL + path).
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
import os
import io

import qrcode
from qrcode.constants import ERROR_CORRECT_M


router = APIRouter(tags=["QR Codes"])

QR_CACHE_ROOT = Path("/app/static/qr")
QR_CACHE_ROOT.mkdir(parents=True, exist_ok=True)

# Deep-link templates per kind.  Safe paths — no PII.
DEEP_LINKS = {
    "product": "/shop/product/{id}",
    "group_deal": "/group-deals/{id}",
    "promo_campaign": "/promo/{id}",
    "content_post": "/content/{id}",
}


def _frontend_base() -> str:
    base = (os.environ.get("FRONTEND_URL") or "").rstrip("/")
    # Prefer the production live domain when running against preview, so QR prints don't break after go-live
    prod = os.environ.get("PRODUCTION_DOMAIN")
    if prod:
        return prod.rstrip("/")
    return base or "https://konekt.co.tz"


def _target_url(kind: str, entity_id: str) -> str:
    tmpl = DEEP_LINKS.get(kind)
    if not tmpl:
        raise HTTPException(status_code=404, detail=f"Unknown QR kind: {kind}")
    return f"{_frontend_base()}{tmpl.format(id=entity_id)}"


def _cache_path(kind: str, entity_id: str) -> Path:
    d = QR_CACHE_ROOT / kind
    d.mkdir(parents=True, exist_ok=True)
    return d / f"{entity_id}.png"


def _render_qr(target_url: str, out_path: Path) -> None:
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_M,
        box_size=10,
        border=2,
    )
    qr.add_data(target_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#20364D", back_color="white")
    img.save(out_path, format="PNG")


@router.get("/api/qr/{kind}/{entity_id}.png")
async def get_qr_image(kind: str, entity_id: str):
    """Return the QR as a PNG file.  Cached on disk; regenerated only if missing."""
    if kind not in DEEP_LINKS:
        raise HTTPException(status_code=404, detail=f"Unknown QR kind: {kind}")
    path = _cache_path(kind, entity_id)
    if not path.exists():
        target = _target_url(kind, entity_id)
        _render_qr(target, path)
    return FileResponse(str(path), media_type="image/png", filename=f"konekt-qr-{kind}-{entity_id}.png")


@router.get("/api/qr/{kind}/{entity_id}")
async def get_qr_info(kind: str, entity_id: str):
    """Return JSON info about the QR: target URL + cached image URL."""
    if kind not in DEEP_LINKS:
        raise HTTPException(status_code=404, detail=f"Unknown QR kind: {kind}")
    path = _cache_path(kind, entity_id)
    if not path.exists():
        target = _target_url(kind, entity_id)
        _render_qr(target, path)
    target = _target_url(kind, entity_id)
    return {
        "kind": kind,
        "entity_id": entity_id,
        "target_url": target,
        "qr_image_url": f"/api/qr/{kind}/{entity_id}.png",
        "static_url": f"/static/qr/{kind}/{entity_id}.png",
    }


@router.post("/api/qr/{kind}/{entity_id}/refresh")
async def refresh_qr(kind: str, entity_id: str):
    """Delete cached QR and regenerate (use after target URL scheme changes)."""
    if kind not in DEEP_LINKS:
        raise HTTPException(status_code=404, detail=f"Unknown QR kind: {kind}")
    path = _cache_path(kind, entity_id)
    if path.exists():
        path.unlink()
    target = _target_url(kind, entity_id)
    _render_qr(target, path)
    return {
        "ok": True,
        "target_url": target,
        "qr_image_url": f"/api/qr/{kind}/{entity_id}.png",
    }
