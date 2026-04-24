"""
Konekt Vendor Supply Agreement — Session 4

Flow:
  1. Vendor logs in → frontend calls GET /api/vendor/agreement/status
     • If no signed agreement → portal is blocked until vendor signs at /partner/agreement
     • If signed → portal unlocks; vendor can always download the signed PDF from "Documents" tab
  2. Vendor fills name / address / signatory / title + types full name as signature +
     checks "I agree" → POST /api/vendor/agreement/sign
  3. Server generates the PDF (reportlab), stores on disk, writes a `vendor_agreements` doc
     with IP, timestamp, signature text, vendor info.
  4. Admin Ops list at /api/admin/vendor-agreements shows who has signed.

Agreement text is intentionally concise & plain-English.  The PDF is branded with Konekt
Triad logo text heading.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Header, Request
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from pathlib import Path
from typing import Optional
from uuid import uuid4
import os

from partner_access_service import get_partner_user_from_header

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

admin_router = APIRouter(prefix="/api/admin/vendor-agreements", tags=["Vendor Agreement (Admin)"])
vendor_router = APIRouter(prefix="/api/vendor/agreement", tags=["Vendor Agreement"])

AGREEMENT_VERSION = "1.0"  # bump whenever the template changes — forces vendors to re-sign
AGREEMENT_DIR = Path("/app/uploads/vendor_agreements")
AGREEMENT_DIR.mkdir(parents=True, exist_ok=True)


async def _load_persisted_version():
    """On startup, try to load the persisted version from admin_settings."""
    global AGREEMENT_VERSION
    try:
        row = await db.admin_settings.find_one({"key": "vendor_agreement_version"}, {"_id": 0})
        if row and row.get("value"):
            AGREEMENT_VERSION = str(row["value"])
            AGREEMENT_TEMPLATE["version"] = AGREEMENT_VERSION
    except Exception:
        pass


# ───────────────────────────── Template ─────────────────────────────

AGREEMENT_TEMPLATE = {
    "title": "KONEKT VENDOR SUPPLY AGREEMENT",
    "version": AGREEMENT_VERSION,
    "effective": "This Vendor Supply Agreement (the \"Agreement\") is entered into by and between "
                 "Konekt Limited, a company duly registered under the laws of the United Republic of "
                 "Tanzania with registered office in Dar es Salaam (\"Konekt\") and the Vendor whose "
                 "details are captured below.",
    "clauses": [
        {
            "heading": "1. Supply & Konekt as Single Client",
            "body": "The Vendor agrees to supply goods and/or services through the Konekt platform. "
                    "For all matters relating to orders routed through Konekt, Konekt is the Vendor's "
                    "sole client.  The Vendor shall not contact, solicit, or transact directly with "
                    "any end customer introduced through Konekt for a period of twelve (12) months "
                    "after last platform engagement."
        },
        {
            "heading": "2. Pricing & Product Data",
            "body": "The Vendor warrants that all prices, stock levels, SKUs and product data uploaded "
                    "to Konekt are accurate and kept current.  The Vendor authorises Konekt to apply "
                    "platform markup over the Vendor's quoted base price.  Konekt retains the markup "
                    "in full; the Vendor receives only their quoted base price less any agreed "
                    "commission."
        },
        {
            "heading": "3. Payment Terms",
            "body": "Payment terms are governed by the Vendor's assigned modality, which is one of: "
                    "(a) Pay-per-order — the Vendor issues a tax invoice against each released order "
                    "and Konekt pays prior to release of fulfillment; or (b) Monthly Statement — "
                    "Konekt generates a consolidated statement at month-end and the Vendor issues a "
                    "single invoice against the statement.  Konekt pays within seven (7) business "
                    "days of receipt of a valid invoice."
        },
        {
            "heading": "4. Quality, Lead Time & Performance",
            "body": "The Vendor shall meet agreed lead times, product specifications, and quality "
                    "standards.  Chronic failure (three (3) or more breaches in any rolling thirty-day "
                    "window) may result in suspension or termination at Konekt's discretion."
        },
        {
            "heading": "5. Confidentiality & End-Customer Data",
            "body": "Konekt will not disclose end-customer personal information to the Vendor.  The "
                    "Vendor shall not attempt to reverse-engineer, solicit, or extract end-customer "
                    "identity through the platform.  All data shared between the parties is "
                    "confidential and shall not be disclosed to third parties."
        },
        {
            "heading": "6. Term & Termination",
            "body": "This Agreement commences on the date of signature and continues until terminated "
                    "by either party on thirty (30) days' written notice.  Konekt may terminate "
                    "immediately for material breach."
        },
        {
            "heading": "7. Governing Law",
            "body": "This Agreement is governed by the laws of the United Republic of Tanzania.  Any "
                    "dispute shall first be addressed by good-faith negotiation and, failing that, "
                    "referred to arbitration in Dar es Salaam."
        },
        {
            "heading": "8. Electronic Signature",
            "body": "The parties agree that this Agreement may be signed electronically and that such "
                    "electronic signature has the same legal force as a handwritten signature."
        },
    ],
}


# ───────────────────────────── Helpers ─────────────────────────────

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _strip(doc):
    if not doc:
        return doc
    doc = dict(doc)
    doc.pop("_id", None)
    for k, v in list(doc.items()):
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc


def _client_ip(request: Request) -> str:
    # Respect standard proxy headers
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return (request.client.host if request.client else "") or ""


def _generate_pdf(out_path: Path, data: dict) -> None:
    """Render the agreement PDF.  data carries vendor info + signature metadata."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.lib import colors

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Title"], fontSize=18, textColor=colors.HexColor("#20364D"), spaceAfter=4)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontSize=12, textColor=colors.HexColor("#20364D"), spaceBefore=10, spaceAfter=4)
    body = ParagraphStyle("body", parent=styles["BodyText"], fontSize=10, leading=14, textColor=colors.HexColor("#1f2937"))
    small = ParagraphStyle("small", parent=styles["BodyText"], fontSize=8, textColor=colors.HexColor("#6b7280"))

    doc = SimpleDocTemplate(str(out_path), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=18 * mm, bottomMargin=18 * mm)
    story = []
    story.append(Paragraph("KONEKT", ParagraphStyle("brand", parent=styles["Title"], fontSize=10,
                                                    textColor=colors.HexColor("#20364D"), alignment=0)))
    story.append(Paragraph(AGREEMENT_TEMPLATE["title"], h1))
    story.append(Paragraph(f"Version {AGREEMENT_TEMPLATE['version']}  ·  Effective {data.get('signed_at', _now_iso())[:10]}", small))
    story.append(Spacer(1, 8))
    story.append(Paragraph(AGREEMENT_TEMPLATE["effective"], body))
    story.append(Spacer(1, 8))

    # Vendor details block
    vendor_rows = [
        ["Vendor legal name", data.get("vendor_legal_name", "—")],
        ["Vendor address", data.get("vendor_address", "—")],
        ["Authorised signatory", data.get("signatory_name", "—")],
        ["Signatory title", data.get("signatory_title", "—")],
        ["Signatory email", data.get("signatory_email", "—")],
        ["Vendor phone", data.get("vendor_phone", "—")],
    ]
    tbl = Table(vendor_rows, colWidths=[55 * mm, 110 * mm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F5F7FA")),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#20364D")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E7EB")),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 10))

    for c in AGREEMENT_TEMPLATE["clauses"]:
        story.append(Paragraph(c["heading"], h2))
        story.append(Paragraph(c["body"], body))

    story.append(Spacer(1, 18))
    story.append(Paragraph("SIGNATURE", h2))
    sig_rows = [
        ["Signed by (typed)", data.get("signature_text", "—")],
        ["Signatory name", data.get("signatory_name", "—")],
        ["Title", data.get("signatory_title", "—")],
        ["Signed at (UTC)", data.get("signed_at", "—")],
        ["Signed from IP", data.get("signed_ip", "—")],
        ["Agreement version", AGREEMENT_TEMPLATE["version"]],
    ]
    sig = Table(sig_rows, colWidths=[55 * mm, 110 * mm])
    sig.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#FFFBEB")),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#92400E")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#FCD34D")),
    ]))
    story.append(sig)
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "This Agreement was electronically executed.  The typed signature above is a legally-binding "
        "expression of assent by the signatory.  Konekt retains a cryptographic audit record of the "
        "signing event.",
        small,
    ))

    doc.build(story)


# ───────────────────────────── Vendor-facing ─────────────────────────────

@vendor_router.get("/template")
async def agreement_template(authorization: Optional[str] = Header(None)):
    """Return the agreement text + current signed status + prefilled vendor info."""
    user = await get_partner_user_from_header(authorization)
    vid = user["partner_id"]
    signed = await db.vendor_agreements.find_one(
        {"vendor_id": vid, "version": AGREEMENT_VERSION, "status": "signed"}, {"_id": 0}
    )
    # Prefill from partners doc if available
    from bson import ObjectId
    prefill = {}
    try:
        if len(vid) == 24:
            p = await db.partners.find_one({"_id": ObjectId(vid)}, {"_id": 0}) or {}
            prefill = {
                "vendor_legal_name": p.get("name") or p.get("company_name") or "",
                "vendor_address": p.get("address") or "",
                "vendor_phone": p.get("phone") or "",
                "signatory_email": p.get("email") or user.get("email", ""),
                "signatory_name": p.get("contact_person") or "",
            }
    except Exception:
        pass

    return {
        "template": AGREEMENT_TEMPLATE,
        "signed": bool(signed),
        "signed_record": signed or None,
        "prefill": prefill,
        "version": AGREEMENT_VERSION,
    }


@vendor_router.get("/status")
async def agreement_status(authorization: Optional[str] = Header(None)):
    """Lightweight status check used by vendor portal guard."""
    user = await get_partner_user_from_header(authorization)
    vid = user["partner_id"]
    signed = await db.vendor_agreements.find_one(
        {"vendor_id": vid, "version": AGREEMENT_VERSION, "status": "signed"},
        {"_id": 0, "id": 1, "signed_at": 1, "signatory_name": 1, "version": 1, "pdf_url": 1},
    )
    return {"signed": bool(signed), "required_version": AGREEMENT_VERSION, "record": signed}


class SignPayload(BaseModel):
    vendor_legal_name: str
    vendor_address: str
    vendor_phone: Optional[str] = ""
    signatory_name: str
    signatory_title: str
    signatory_email: str
    signature_text: str
    agreed: bool


@vendor_router.post("/sign")
async def sign_agreement(payload: SignPayload, request: Request, authorization: Optional[str] = Header(None)):
    if not payload.agreed:
        raise HTTPException(status_code=400, detail="You must tick 'I agree' to sign")
    if not payload.signature_text.strip():
        raise HTTPException(status_code=400, detail="Typed signature is required")
    if payload.signature_text.strip() != payload.signatory_name.strip():
        raise HTTPException(status_code=400, detail="Typed signature must match the signatory's full name exactly (case sensitive)")
    for field in ("vendor_legal_name", "vendor_address", "signatory_name", "signatory_title", "signatory_email"):
        if not (getattr(payload, field) or "").strip():
            raise HTTPException(status_code=400, detail=f"{field.replace('_', ' ').title()} is required")

    user = await get_partner_user_from_header(authorization)
    vid = user["partner_id"]

    # Block double-sign for same version
    already = await db.vendor_agreements.find_one(
        {"vendor_id": vid, "version": AGREEMENT_VERSION, "status": "signed"},
        {"_id": 0, "id": 1},
    )
    if already:
        raise HTTPException(status_code=400, detail="You have already signed this agreement")

    doc_id = str(uuid4())
    now = datetime.now(timezone.utc)
    ip = _client_ip(request)
    pdf_name = f"{vid}_{doc_id}.pdf"
    pdf_path = AGREEMENT_DIR / pdf_name
    pdf_url = f"/api/vendor/agreement/pdf/{doc_id}"

    data = {
        "id": doc_id,
        "vendor_id": vid,
        "version": AGREEMENT_VERSION,
        "status": "signed",
        "vendor_legal_name": payload.vendor_legal_name.strip(),
        "vendor_address": payload.vendor_address.strip(),
        "vendor_phone": (payload.vendor_phone or "").strip(),
        "signatory_name": payload.signatory_name.strip(),
        "signatory_title": payload.signatory_title.strip(),
        "signatory_email": payload.signatory_email.strip(),
        "signature_text": payload.signature_text.strip(),
        "signed_at": now.isoformat(),
        "signed_ip": ip,
        "pdf_url": pdf_url,
        "created_at": now,
        "updated_at": now,
    }

    # Render the PDF
    _generate_pdf(pdf_path, data)

    await db.vendor_agreements.insert_one(dict(data))

    # Notify admin ops
    await db.notifications.insert_one({
        "id": str(uuid4()),
        "target_type": "admin",
        "target_id": "ops",
        "title": "Vendor signed Supply Agreement",
        "message": f"{data['vendor_legal_name']} signed the v{AGREEMENT_VERSION} supply agreement.",
        "read": False,
        "created_at": now.isoformat(),
    })

    # Email the signed PDF to the signatory (best-effort)
    try:
        import resend
        import asyncio as _asyncio
        api_key = os.getenv("RESEND_API_KEY")
        from_email = os.getenv("RESEND_FROM_EMAIL") or "onboarding@resend.dev"
        if api_key and data["signatory_email"]:
            import base64
            resend.api_key = api_key
            with open(pdf_path, "rb") as fh:
                pdf_b64 = base64.b64encode(fh.read()).decode("utf-8")
            html = f"""
            <div style='font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px'>
              <h2 style='color:#20364D;margin:0 0 8px'>Your Konekt Supply Agreement</h2>
              <p style='color:#475569;font-size:14px'>Hi {data['signatory_name']},</p>
              <p style='color:#475569;font-size:14px;line-height:1.6'>Thank you for signing the Konekt Vendor Supply Agreement (v{AGREEMENT_VERSION}). A copy is attached for your records and also available from your Documents tab in the Konekt portal.</p>
              <p style='color:#94a3b8;font-size:11px;margin-top:20px'>Signed at {data['signed_at']} UTC · Agreement ID {data['id']}</p>
            </div>
            """
            await _asyncio.to_thread(
                resend.Emails.send,
                {
                    "from": from_email,
                    "to": [data["signatory_email"]],
                    "subject": f"Your signed Konekt Supply Agreement (v{AGREEMENT_VERSION})",
                    "html": html,
                    "attachments": [{
                        "filename": f"konekt-supply-agreement-v{AGREEMENT_VERSION}.pdf",
                        "content": pdf_b64,
                    }],
                },
            )
    except Exception as _email_err:
        import logging as _lg
        _lg.getLogger("vendor_agreement").warning("Signed-agreement email failed: %s", _email_err)

    return {"ok": True, "id": doc_id, "pdf_url": pdf_url}


@vendor_router.get("/history")
async def vendor_history(authorization: Optional[str] = Header(None)):
    """Vendor can list all their signed agreements (for Documents tab)."""
    user = await get_partner_user_from_header(authorization)
    vid = user["partner_id"]
    docs = await db.vendor_agreements.find({"vendor_id": vid}, {"_id": 0}).sort("created_at", -1).to_list(50)
    # Migrate legacy /uploads URLs to the API URL
    for d in docs:
        if d.get("pdf_url", "").startswith("/uploads/"):
            d["pdf_url"] = f"/api/vendor/agreement/pdf/{d['id']}"
    return docs


@vendor_router.get("/pdf/{agreement_id}")
async def vendor_pdf(agreement_id: str, authorization: Optional[str] = Header(None)):
    """Partner-auth download.  Verifies the agreement belongs to the calling vendor."""
    user = await get_partner_user_from_header(authorization)
    vid = user["partner_id"]
    doc = await db.vendor_agreements.find_one({"id": agreement_id, "vendor_id": vid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Agreement not found")
    path = AGREEMENT_DIR / f"{doc['vendor_id']}_{agreement_id}.pdf"
    if not path.exists():
        raise HTTPException(status_code=404, detail="PDF missing on server")
    return FileResponse(str(path), media_type="application/pdf",
                        filename=f"konekt-supply-agreement-v{doc.get('version')}-{agreement_id[:8]}.pdf")


# ───────────────────────────── Admin-facing ─────────────────────────────

@admin_router.get("")
async def admin_list_agreements(status: Optional[str] = None, version: Optional[str] = None):
    q = {}
    if status:
        q["status"] = status
    if version:
        q["version"] = version
    docs = await db.vendor_agreements.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)

    # Enrich with vendor name
    from bson import ObjectId
    out = []
    for d in docs:
        vid = d.get("vendor_id") or ""
        vendor_name = d.get("vendor_legal_name") or "—"
        if len(vid) == 24:
            try:
                p = await db.partners.find_one({"_id": ObjectId(vid)}, {"_id": 0, "name": 1, "company_name": 1})
                vendor_name = (p or {}).get("company_name") or (p or {}).get("name") or vendor_name
            except Exception:
                pass
        # Use admin-authenticated PDF URL
        d["pdf_url"] = f"/api/admin/vendor-agreements/{d['id']}/pdf"
        out.append({**_strip(d), "vendor_display_name": vendor_name})
    return out


@admin_router.get("/{agreement_id}/pdf")
async def admin_pdf(agreement_id: str):
    doc = await db.vendor_agreements.find_one({"id": agreement_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Agreement not found")
    path = AGREEMENT_DIR / f"{doc['vendor_id']}_{agreement_id}.pdf"
    if not path.exists():
        raise HTTPException(status_code=404, detail="PDF missing on server")
    return FileResponse(str(path), media_type="application/pdf",
                        filename=f"konekt-supply-agreement-v{doc.get('version')}-{agreement_id[:8]}.pdf")


@admin_router.get("/template/blank.pdf")
async def admin_blank_template_pdf():
    """Generate a clean blank copy of the current Konekt Vendor Supply Agreement.
    Useful for sharing with prospective vendors before they sign online.
    """
    import tempfile
    blank_data = {
        "vendor_legal_name": "____________________________",
        "vendor_address": "____________________________",
        "vendor_phone": "____________________________",
        "signatory_name": "____________________________",
        "signatory_title": "____________________________",
        "signatory_email": "____________________________",
        "signature_text": "_________________________",
        "signed_at": _now_iso(),
        "signed_ip": "—",
    }
    tmp = Path(tempfile.mkstemp(suffix=".pdf", prefix=f"konekt-agreement-blank-v{AGREEMENT_VERSION}-")[1])
    _generate_pdf(tmp, blank_data)
    return FileResponse(
        str(tmp),
        media_type="application/pdf",
        filename=f"konekt-vendor-agreement-template-v{AGREEMENT_VERSION}.pdf",
    )


class PrefilledTemplatePayload(BaseModel):
    vendor_legal_name: str
    vendor_address: str = ""
    vendor_phone: str = ""
    signatory_name: str = ""
    signatory_title: str = ""
    signatory_email: str = ""


@admin_router.post("/template/prefilled.pdf")
async def admin_prefilled_template_pdf(payload: PrefilledTemplatePayload):
    """Generate a Konekt Vendor Supply Agreement pre-filled with a prospective
    vendor's details. Signature block stays blank (to be signed on paper) — use
    the in-product sign flow for digital signatures."""
    import tempfile
    data = {
        "vendor_legal_name": payload.vendor_legal_name.strip() or "____________________________",
        "vendor_address": payload.vendor_address.strip() or "____________________________",
        "vendor_phone": payload.vendor_phone.strip() or "____________________________",
        "signatory_name": payload.signatory_name.strip() or "____________________________",
        "signatory_title": payload.signatory_title.strip() or "____________________________",
        "signatory_email": payload.signatory_email.strip() or "____________________________",
        "signature_text": "_________________________",
        "signed_at": "—  (sign on paper or via Konekt vendor portal)",
        "signed_ip": "—",
    }
    slug = "".join(c if c.isalnum() else "-" for c in payload.vendor_legal_name.lower())[:40].strip("-") or "vendor"
    tmp = Path(tempfile.mkstemp(suffix=".pdf", prefix=f"konekt-agreement-{slug}-v{AGREEMENT_VERSION}-")[1])
    _generate_pdf(tmp, data)
    return FileResponse(
        str(tmp),
        media_type="application/pdf",
        filename=f"konekt-vendor-agreement-{slug}-v{AGREEMENT_VERSION}.pdf",
    )


@admin_router.post("/nudge-unsigned")
async def nudge_unsigned_vendors():
    """Email every vendor that has not yet signed the current agreement version.
    Falls back gracefully if Resend is not configured.  Returns per-vendor send status.
    """
    import os
    import resend
    import asyncio
    api_key = os.getenv("RESEND_API_KEY")
    from_email = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")
    if not api_key:
        raise HTTPException(status_code=400, detail="RESEND_API_KEY is not set — configure Resend first")

    # Find all partners that do NOT have a signed current-version agreement
    signed_vendor_ids = set()
    async for d in db.vendor_agreements.find(
        {"version": AGREEMENT_VERSION, "status": "signed"}, {"_id": 0, "vendor_id": 1}
    ):
        signed_vendor_ids.add(d["vendor_id"])

    unsigned = []
    async for p in db.partners.find({"email": {"$exists": True, "$ne": ""}}, {"_id": 1, "email": 1, "name": 1, "company_name": 1}):
        if str(p["_id"]) in signed_vendor_ids:
            continue
        unsigned.append({
            "id": str(p["_id"]),
            "email": p["email"],
            "name": p.get("company_name") or p.get("name") or "—",
        })

    if not unsigned:
        return {"ok": True, "sent": 0, "unsigned_count": 0, "message": "All vendors have signed."}

    resend.api_key = api_key
    sent = 0
    failed = []
    for v in unsigned:
        html = f"""
        <div style='font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px'>
          <h2 style='color:#20364D;margin:0 0 8px'>Please sign your Konekt Supply Agreement</h2>
          <p style='color:#475569;font-size:14px'>Hi {v['name']},</p>
          <p style='color:#475569;font-size:14px;line-height:1.6'>Our records show that your vendor account does not yet have a signed <b>Konekt Vendor Supply Agreement (v{AGREEMENT_VERSION})</b> on file. Please sign in to your Konekt portal to complete this quick step — it takes about 2 minutes.</p>
          <p><a href='https://konekt.co.tz/partner/agreement' style='display:inline-block;background:#20364D;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700'>Sign the agreement</a></p>
          <p style='color:#94a3b8;font-size:11px;margin-top:20px'>If you have already signed this, you can ignore this message.</p>
        </div>
        """
        try:
            await asyncio.to_thread(
                resend.Emails.send,
                {"from": from_email, "to": [v["email"]],
                 "subject": f"Action required — sign your Konekt Supply Agreement (v{AGREEMENT_VERSION})",
                 "html": html},
            )
            sent += 1
        except Exception as e:
            failed.append({"vendor_id": v["id"], "email": v["email"], "error": str(e)[:200]})

    # Audit
    await db.admin_settings.update_one(
        {"key": "vendor_agreement_last_nudge"},
        {"$set": {"key": "vendor_agreement_last_nudge", "value": datetime.now(timezone.utc).isoformat(),
                   "sent": sent, "failed": len(failed), "version": AGREEMENT_VERSION}},
        upsert=True,
    )
    return {"ok": True, "sent": sent, "failed": failed, "unsigned_count": len(unsigned)}


@admin_router.get("/stats")
async def admin_agreement_stats():
    total_vendors = await db.partners.count_documents({})
    signed = await db.vendor_agreements.count_documents(
        {"version": AGREEMENT_VERSION, "status": "signed"}
    )
    return {
        "total_vendors": total_vendors,
        "signed_current_version": signed,
        "current_version": AGREEMENT_VERSION,
        "coverage_pct": round((signed / total_vendors) * 100, 1) if total_vendors else 0,
    }


class BumpVersionPayload(BaseModel):
    new_version: str
    reason: Optional[str] = ""


@admin_router.post("/bump-version")
async def bump_agreement_version(payload: BumpVersionPayload):
    """Bump the current agreement version, invalidating existing signatures and re-blocking all vendors."""
    global AGREEMENT_VERSION
    v = (payload.new_version or "").strip()
    if not v:
        raise HTTPException(status_code=400, detail="new_version required")
    if v == AGREEMENT_VERSION:
        raise HTTPException(status_code=400, detail=f"Version is already {v}")
    previous = AGREEMENT_VERSION
    AGREEMENT_VERSION = v
    AGREEMENT_TEMPLATE["version"] = v

    # Persist so restarts pick up the latest version
    await db.admin_settings.update_one(
        {"key": "vendor_agreement_version"},
        {"$set": {"key": "vendor_agreement_version", "value": v, "previous": previous,
                   "reason": payload.reason or "", "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"ok": True, "previous_version": previous, "current_version": v}
