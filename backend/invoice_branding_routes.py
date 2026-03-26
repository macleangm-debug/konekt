"""
Invoice Branding & Authorization Settings
CFO details, signature upload, company stamp (generated/uploaded)
"""
import os
import uuid
import math
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Request, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/admin/settings/invoice-branding", tags=["Invoice Branding"])

UPLOAD_DIR = Path("/app/backend/uploads/branding")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_BRANDING = {
    "show_signature": False,
    "show_stamp": False,
    "cfo_name": "",
    "cfo_title": "Chief Finance Officer",
    "cfo_signature_url": "",
    "stamp_mode": "generated",
    "stamp_shape": "circle",
    "stamp_color": "blue",
    "stamp_text_primary": "Konekt Limited",
    "stamp_text_secondary": "Dar es Salaam, Tanzania",
    "stamp_registration_number": "",
    "stamp_tax_number": "",
    "stamp_phrase": "Official Company Stamp",
    "stamp_uploaded_url": "",
    "stamp_preview_url": "",
}


def _clean(doc):
    if not doc:
        return None
    d = dict(doc)
    d.pop("_id", None)
    d.pop("type", None)
    return d


@router.get("")
async def get_invoice_branding(request: Request):
    db = request.app.mongodb
    doc = await db.business_settings.find_one({"type": "invoice_branding"})
    if not doc:
        return {**DEFAULT_BRANDING}
    result = _clean(doc)
    return result


@router.post("")
async def save_invoice_branding(payload: dict, request: Request):
    db = request.app.mongodb
    allowed = set(DEFAULT_BRANDING.keys())
    clean = {k: v for k, v in payload.items() if k in allowed}
    clean["type"] = "invoice_branding"
    clean["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.business_settings.update_one(
        {"type": "invoice_branding"}, {"$set": clean}, upsert=True
    )
    doc = await db.business_settings.find_one({"type": "invoice_branding"})
    return _clean(doc)


@router.post("/signature-upload")
async def upload_signature(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files accepted")
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "png"
    fname = f"cfo-signature-{uuid.uuid4().hex[:8]}.{ext}"
    fpath = UPLOAD_DIR / fname
    content = await file.read()
    fpath.write_bytes(content)
    url = f"/uploads/branding/{fname}"
    return {"url": url}


@router.post("/stamp-upload")
async def upload_stamp(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files accepted")
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "png"
    fname = f"company-stamp-{uuid.uuid4().hex[:8]}.{ext}"
    fpath = UPLOAD_DIR / fname
    content = await file.read()
    fpath.write_bytes(content)
    url = f"/uploads/branding/{fname}"
    return {"url": url}


def _generate_circle_stamp_svg(settings: dict) -> str:
    color_map = {"blue": "#1a4b8c", "red": "#b91c1c", "black": "#1e293b"}
    c = color_map.get(settings.get("stamp_color", "blue"), "#1a4b8c")
    primary = settings.get("stamp_text_primary", "Company Name")
    secondary = settings.get("stamp_text_secondary", "")
    reg = settings.get("stamp_registration_number", "")
    tin = settings.get("stamp_tax_number", "")
    phrase = settings.get("stamp_phrase", "Official Company Stamp")

    # Build circular text paths
    primary_upper = primary.upper()
    secondary_upper = secondary.upper() if secondary else ""

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
  <defs>
    <path id="topArc" d="M 30,120 a 90,90 0 1,1 180,0" fill="none"/>
    <path id="bottomArc" d="M 210,120 a 90,90 0 1,1 -180,0" fill="none"/>
  </defs>
  <circle cx="120" cy="120" r="112" fill="none" stroke="{c}" stroke-width="3"/>
  <circle cx="120" cy="120" r="100" fill="none" stroke="{c}" stroke-width="1.5"/>
  <text fill="{c}" font-family="Arial,sans-serif" font-size="13" font-weight="700" letter-spacing="2">
    <textPath href="#topArc" startOffset="50%" text-anchor="middle">{primary_upper}</textPath>
  </text>
  <text fill="{c}" font-family="Arial,sans-serif" font-size="11" letter-spacing="1.5">
    <textPath href="#bottomArc" startOffset="50%" text-anchor="middle">{secondary_upper}</textPath>
  </text>
  <text x="120" y="112" text-anchor="middle" fill="{c}" font-family="Arial,sans-serif" font-size="9" font-weight="600">{phrase}</text>
  <text x="120" y="128" text-anchor="middle" fill="{c}" font-family="Arial,sans-serif" font-size="8">{reg}</text>
  <text x="120" y="142" text-anchor="middle" fill="{c}" font-family="Arial,sans-serif" font-size="8">{tin}</text>
</svg>'''
    return svg


def _generate_square_stamp_svg(settings: dict) -> str:
    color_map = {"blue": "#1a4b8c", "red": "#b91c1c", "black": "#1e293b"}
    c = color_map.get(settings.get("stamp_color", "blue"), "#1a4b8c")
    primary = settings.get("stamp_text_primary", "Company Name")
    secondary = settings.get("stamp_text_secondary", "")
    reg = settings.get("stamp_registration_number", "")
    tin = settings.get("stamp_tax_number", "")
    phrase = settings.get("stamp_phrase", "Official Company Stamp")

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
  <rect x="10" y="10" width="220" height="220" rx="8" fill="none" stroke="{c}" stroke-width="3"/>
  <rect x="18" y="18" width="204" height="204" rx="4" fill="none" stroke="{c}" stroke-width="1"/>
  <text x="120" y="60" text-anchor="middle" fill="{c}" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing="1">{primary.upper()}</text>
  <line x1="40" y1="72" x2="200" y2="72" stroke="{c}" stroke-width="0.8"/>
  <text x="120" y="100" text-anchor="middle" fill="{c}" font-family="Arial,sans-serif" font-size="10">{reg}</text>
  <text x="120" y="118" text-anchor="middle" fill="{c}" font-family="Arial,sans-serif" font-size="10">{tin}</text>
  <text x="120" y="148" text-anchor="middle" fill="{c}" font-family="Arial,sans-serif" font-size="11" font-weight="600">{phrase}</text>
  <line x1="40" y1="162" x2="200" y2="162" stroke="{c}" stroke-width="0.8"/>
  <text x="120" y="185" text-anchor="middle" fill="{c}" font-family="Arial,sans-serif" font-size="10">{secondary}</text>
</svg>'''
    return svg


@router.post("/generate-stamp")
async def generate_stamp(payload: dict):
    shape = payload.get("stamp_shape", "circle")
    if shape == "square":
        svg = _generate_square_stamp_svg(payload)
    else:
        svg = _generate_circle_stamp_svg(payload)

    fname = f"generated-stamp-{uuid.uuid4().hex[:8]}.svg"
    fpath = UPLOAD_DIR / fname
    fpath.write_text(svg)
    url = f"/uploads/branding/{fname}"
    return {"stamp_preview_url": url, "svg": svg}
