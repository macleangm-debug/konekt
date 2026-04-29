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

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads" / "branding"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_BRANDING = {
    "show_signature": False,
    "show_stamp": False,
    "cfo_name": "",
    "cfo_title": "Chief Finance Officer",
    "cfo_signature_url": "",
    "signature_method": "upload",
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
    "contact_email": "accounts@konekt.co.tz",
    "contact_phone": "+255 XXX XXX XXX",
    "contact_address": "Dar es Salaam, Tanzania",
    "company_logo_url": "",
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
    # Merge defaults for any missing keys (e.g. newly added fields)
    for k, v in DEFAULT_BRANDING.items():
        if k not in result or result[k] is None:
            result[k] = v
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


@router.post("/logo-upload")
async def upload_logo(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files accepted")
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "png"
    fname = f"company-logo-{uuid.uuid4().hex[:8]}.{ext}"
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


def _connected_triad_svg(size=52, color="#1a365d"):
    """Generate the Connected Triad icon as inline SVG elements for stamp center.
    Matches the canonical BrandLogo.jsx KonektTriadIcon exactly."""
    s = size
    topX = round(s * 0.58, 1)
    topY = round(s * 0.13, 1)
    leftX = round(s * 0.12, 1)
    leftY = round(s * 0.82, 1)
    rightX = round(s * 0.90, 1)
    rightY = round(s * 0.72, 1)
    accentR = round(max(2.8, s * 0.14), 1)
    nodeR = round(max(2.2, s * 0.108), 1)
    sw = round(max(2.0, s * 0.062), 1)
    rmX = round((topX + rightX) / 2 + s * 0.06, 1)
    rmY = round((topY + rightY) / 2 - s * 0.04, 1)
    return (
        f'<line x1="{topX}" y1="{topY}" x2="{leftX}" y2="{leftY}" stroke="{color}" stroke-width="{sw}" stroke-linecap="round" opacity="0.45"/>'
        f'<path d="M{topX},{topY} Q{rmX},{rmY} {rightX},{rightY}" stroke="{color}" stroke-width="{sw}" stroke-linecap="round" fill="none" opacity="0.45"/>'
        f'<line x1="{leftX}" y1="{leftY}" x2="{rightX}" y2="{rightY}" stroke="{color}" stroke-width="{sw}" stroke-linecap="round" opacity="0.45"/>'
        f'<circle cx="{topX}" cy="{topY}" r="{accentR}" fill="{color}"/>'
        f'<circle cx="{leftX}" cy="{leftY}" r="{nodeR}" fill="{color}"/>'
        f'<circle cx="{rightX}" cy="{rightY}" r="{nodeR}" fill="{color}"/>'
    )


def _generate_circle_stamp_svg(settings: dict) -> str:
    color_map = {"blue": "#1a365d", "navy": "#1a365d", "red": "#7f1d1d", "black": "#0f172a"}
    c = color_map.get(settings.get("stamp_color", "blue"), "#1a365d")
    primary = settings.get("stamp_text_primary", "Konekt Limited").upper()
    secondary = settings.get("stamp_text_secondary", "").upper()
    reg = settings.get("stamp_registration_number", "")
    tin = settings.get("stamp_tax_number", "")

    triad = _connected_triad_svg(size=50, color=c)

    reg_tin = ""
    if reg and tin:
        reg_tin = f"{reg} \u2022 {tin}"
    elif reg:
        reg_tin = reg
    elif tin:
        reg_tin = tin
    reg_el = f'<text x="120" y="168" text-anchor="middle" fill="{c}" font-family="Arial,Helvetica,sans-serif" font-size="7" letter-spacing="0.3" opacity="0.65">{reg_tin}</text>' if reg_tin else ""

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
  <defs>
    <path id="topArc" d="M 38,120 a 82,82 0 1,1 164,0" fill="none"/>
    <path id="bottomArc" d="M 202,120 a 82,82 0 1,1 -164,0" fill="none"/>
  </defs>
  <circle cx="120" cy="120" r="115" fill="none" stroke="{c}" stroke-width="4.5"/>
  <circle cx="120" cy="120" r="109" fill="none" stroke="{c}" stroke-width="1.5"/>
  <circle cx="120" cy="120" r="78" fill="none" stroke="{c}" stroke-width="0.7" stroke-dasharray="2,3" opacity="0.4"/>
  <text fill="{c}" font-family="Arial,Helvetica,sans-serif" font-size="11.5" font-weight="700" letter-spacing="3.5">
    <textPath href="#topArc" startOffset="50%" text-anchor="middle">{primary}</textPath>
  </text>
  <text fill="{c}" font-family="Arial,Helvetica,sans-serif" font-size="9.5" font-weight="400" letter-spacing="2.5">
    <textPath href="#bottomArc" startOffset="50%" text-anchor="middle">{secondary}</textPath>
  </text>
  <g transform="translate(95,88)">{triad}</g>
  <text x="120" y="154" text-anchor="middle" fill="{c}" font-family="Arial,Helvetica,sans-serif" font-size="8.5" font-weight="700" letter-spacing="3.5">KONEKT</text>
  {reg_el}
</svg>'''
    return svg


def _generate_square_stamp_svg(settings: dict) -> str:
    color_map = {"blue": "#1a365d", "navy": "#1a365d", "red": "#7f1d1d", "black": "#0f172a"}
    c = color_map.get(settings.get("stamp_color", "blue"), "#1a365d")
    primary = settings.get("stamp_text_primary", "Konekt Limited").upper()
    secondary = settings.get("stamp_text_secondary", "").upper()
    reg = settings.get("stamp_registration_number", "")
    tin = settings.get("stamp_tax_number", "")

    triad = _connected_triad_svg(size=54, color=c)

    reg_lines = ""
    if reg:
        reg_lines += f'<text x="120" y="180" text-anchor="middle" fill="{c}" font-family="Arial,sans-serif" font-size="7.5" opacity="0.65">{reg}</text>'
    if tin:
        reg_lines += f'<text x="120" y="193" text-anchor="middle" fill="{c}" font-family="Arial,sans-serif" font-size="7.5" opacity="0.65">{tin}</text>'

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
  <rect x="6" y="6" width="228" height="228" rx="5" fill="none" stroke="{c}" stroke-width="4.5"/>
  <rect x="13" y="13" width="214" height="214" rx="3" fill="none" stroke="{c}" stroke-width="1.5"/>
  <text x="120" y="46" text-anchor="middle" fill="{c}" font-family="Arial,Helvetica,sans-serif" font-size="11" font-weight="700" letter-spacing="3.5">{primary}</text>
  <line x1="32" y1="56" x2="208" y2="56" stroke="{c}" stroke-width="0.7" opacity="0.35"/>
  <g transform="translate(93,66)">{triad}</g>
  <text x="120" y="140" text-anchor="middle" fill="{c}" font-family="Arial,Helvetica,sans-serif" font-size="8.5" font-weight="700" letter-spacing="3.5">KONEKT</text>
  <line x1="32" y1="150" x2="208" y2="150" stroke="{c}" stroke-width="0.7" opacity="0.35"/>
  {reg_lines}
  <text x="120" y="214" text-anchor="middle" fill="{c}" font-family="Arial,sans-serif" font-size="8.5" letter-spacing="2">{secondary}</text>
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
