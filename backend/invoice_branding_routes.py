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

    primary_upper = primary.upper()
    secondary_upper = secondary.upper() if secondary else ""

    # Single-color Konekt "K" logo in the center of the circle
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
  <defs>
    <path id="topArc" d="M 30,120 a 90,90 0 1,1 180,0" fill="none"/>
    <path id="bottomArc" d="M 210,120 a 90,90 0 1,1 -180,0" fill="none"/>
  </defs>
  <circle cx="120" cy="120" r="112" fill="none" stroke="{c}" stroke-width="3"/>
  <circle cx="120" cy="120" r="100" fill="none" stroke="{c}" stroke-width="1.5"/>
  <circle cx="120" cy="120" r="52" fill="none" stroke="{c}" stroke-width="0.8" stroke-dasharray="3,3"/>
  <text fill="{c}" font-family="Arial,sans-serif" font-size="13" font-weight="700" letter-spacing="2">
    <textPath href="#topArc" startOffset="50%" text-anchor="middle">{primary_upper}</textPath>
  </text>
  <text fill="{c}" font-family="Arial,sans-serif" font-size="11" letter-spacing="1.5">
    <textPath href="#bottomArc" startOffset="50%" text-anchor="middle">{secondary_upper}</textPath>
  </text>
  <!-- Single-color K logo at center -->
  <text x="120" y="130" text-anchor="middle" fill="{c}" font-family="Georgia,serif" font-size="46" font-weight="700" font-style="italic">K</text>
  <text x="120" y="160" text-anchor="middle" fill="{c}" font-family="Arial,sans-serif" font-size="7" letter-spacing="0.5">{reg}{" | " + tin if tin else ""}</text>
</svg>'''
    return svg


def _generate_square_stamp_svg(settings: dict) -> str:
    color_map = {"blue": "#1a4b8c", "red": "#b91c1c", "black": "#1e293b"}
    c = color_map.get(settings.get("stamp_color", "blue"), "#1a4b8c")
    primary = settings.get("stamp_text_primary", "Company Name")
    secondary = settings.get("stamp_text_secondary", "")
    reg = settings.get("stamp_registration_number", "")
    tin = settings.get("stamp_tax_number", "")

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
  <rect x="10" y="10" width="220" height="220" rx="8" fill="none" stroke="{c}" stroke-width="3"/>
  <rect x="18" y="18" width="204" height="204" rx="4" fill="none" stroke="{c}" stroke-width="1"/>
  <text x="120" y="50" text-anchor="middle" fill="{c}" font-family="Arial,sans-serif" font-size="13" font-weight="700" letter-spacing="1">{primary.upper()}</text>
  <line x1="40" y1="60" x2="200" y2="60" stroke="{c}" stroke-width="0.8"/>
  <!-- Single-color K logo at center -->
  <text x="120" y="140" text-anchor="middle" fill="{c}" font-family="Georgia,serif" font-size="52" font-weight="700" font-style="italic">K</text>
  <line x1="40" y1="165" x2="200" y2="165" stroke="{c}" stroke-width="0.8"/>
  <text x="120" y="183" text-anchor="middle" fill="{c}" font-family="Arial,sans-serif" font-size="9">{reg}</text>
  <text x="120" y="198" text-anchor="middle" fill="{c}" font-family="Arial,sans-serif" font-size="9">{tin}</text>
  <text x="120" y="215" text-anchor="middle" fill="{c}" font-family="Arial,sans-serif" font-size="9">{secondary}</text>
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
