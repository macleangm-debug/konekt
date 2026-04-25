"""
QR Code Service — server-side cached QR generation for canonical landing pages.

Supported kinds:
  - product        → /shop/product/{id}
  - group_deal     → /group-deals/{id}
  - promo_campaign → /promo/{id}
  - content_post   → /content/{id}

Usage:
  GET /api/qr/{kind}/{id}.png            → returns PNG (file response, cached on disk)
  GET /api/qr/{kind}/{id}.png?ref=CODE   → same, but the encoded URL carries
                                            ?ref=CODE so attribution sticks
                                            even when only the image is shared
  GET /api/qr/{kind}/{id}                → returns {url, qr_image_url, target_url} JSON

Cache: /app/static/qr/{kind}/{id}.png   (no-ref)
       /app/static/qr/{kind}/{id}__ref-{CODE}.png

The QR always encodes the canonical public landing URL (FRONTEND_URL + path)
optionally with `?ref=<code>` query string so an affiliate or sales rep
who shares the screenshotted creative still receives attribution.
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
import os
import re

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

_REF_RX = re.compile(r"^[A-Z0-9_]{2,20}$")


def _frontend_base() -> str:
    """Resolve the canonical public domain for QR target URLs.

    Priority:
      1. PRODUCTION_DOMAIN env (e.g. https://konekt.co.tz) — set this on
         deploy so QR codes printed at preview-time still resolve to
         production after go-live.
      2. CANONICAL_FRONTEND_URL env — explicit override.
      3. konekt.co.tz hard-default — guarantees screenshots shared today
         keep working even if env config drifts.

    `FRONTEND_URL` is intentionally NOT used: in preview pods it points
    at konekt-payments-fix.preview.emergentagent.com, which would leak
    the preview domain into every printed QR. QRs must always encode
    the production domain.
    """
    prod = os.environ.get("PRODUCTION_DOMAIN")
    if prod:
        return prod.rstrip("/")
    canonical = os.environ.get("CANONICAL_FRONTEND_URL")
    if canonical:
        return canonical.rstrip("/")
    return "https://konekt.co.tz"


def _normalise_ref(ref: str | None) -> str | None:
    if not ref:
        return None
    code = ref.strip().upper()
    if not _REF_RX.match(code):
        return None
    return code


def _target_url(kind: str, entity_id: str, ref: str | None = None) -> str:
    tmpl = DEEP_LINKS.get(kind)
    if not tmpl:
        raise HTTPException(status_code=404, detail=f"Unknown QR kind: {kind}")
    url = f"{_frontend_base()}{tmpl.format(id=entity_id)}"
    if ref:
        url += f"?ref={ref}"
    return url


def _cache_path(kind: str, entity_id: str, ref: str | None = None) -> Path:
    d = QR_CACHE_ROOT / kind
    d.mkdir(parents=True, exist_ok=True)
    if ref:
        return d / f"{entity_id}__ref-{ref}.png"
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
async def get_qr_image(kind: str, entity_id: str, ref: str | None = None):
    """Return the QR as a PNG file.  Cached per (kind, id, ref) on disk."""
    if kind not in DEEP_LINKS:
        raise HTTPException(status_code=404, detail=f"Unknown QR kind: {kind}")
    code = _normalise_ref(ref)
    path = _cache_path(kind, entity_id, code)
    if not path.exists():
        target = _target_url(kind, entity_id, code)
        _render_qr(target, path)
    suffix = f"-ref-{code}" if code else ""
    return FileResponse(str(path), media_type="image/png", filename=f"konekt-qr-{kind}-{entity_id}{suffix}.png")


@router.get("/api/qr/{kind}/{entity_id}")
async def get_qr_info(kind: str, entity_id: str, ref: str | None = None):
    """Return JSON info about the QR: target URL + cached image URL."""
    if kind not in DEEP_LINKS:
        raise HTTPException(status_code=404, detail=f"Unknown QR kind: {kind}")
    code = _normalise_ref(ref)
    path = _cache_path(kind, entity_id, code)
    if not path.exists():
        target = _target_url(kind, entity_id, code)
        _render_qr(target, path)
    target = _target_url(kind, entity_id, code)
    suffix = f"?ref={code}" if code else ""
    return {
        "kind": kind,
        "entity_id": entity_id,
        "ref": code,
        "target_url": target,
        "qr_image_url": f"/api/qr/{kind}/{entity_id}.png{suffix}",
    }


@router.post("/api/qr/{kind}/{entity_id}/refresh")
async def refresh_qr(kind: str, entity_id: str, ref: str | None = None):
    """Delete cached QR and regenerate (use after target URL scheme changes)."""
    if kind not in DEEP_LINKS:
        raise HTTPException(status_code=404, detail=f"Unknown QR kind: {kind}")
    code = _normalise_ref(ref)
    path = _cache_path(kind, entity_id, code)
    if path.exists():
        path.unlink()
    target = _target_url(kind, entity_id, code)
    _render_qr(target, path)
    return {
        "ok": True,
        "target_url": target,
        "qr_image_url": f"/api/qr/{kind}/{entity_id}.png" + (f"?ref={code}" if code else ""),
    }
