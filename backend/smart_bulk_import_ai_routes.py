"""
AI-assisted Smart Import — Session 3B.

Takes a PDF catalog, pasted text, or a product photo (one or many) and asks Gemini
to return a structured list of product rows in the same shape as the regular Smart
Import preview.  Output is stored under the SAME `smart_import_sessions` collection
so the existing Smart Import Wizard (Steps 2–4) can continue with review + commit
without any frontend fork.

Single endpoint: POST /api/smart-import/ai-parse

Accepts (multipart):
  - source: "pdf" | "image" | "photos" | "text"
  - text: str (for source=text)
  - file: UploadFile (for source=pdf or image)
  - files: UploadFile[] (for source=photos)
  - target: "partner_catalog" | "products"
  - country_code: optional
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header, Request
from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from uuid import uuid4
from pathlib import Path
import os
import io
import json
import logging
import tempfile

from partner_access_service import get_partner_user_from_header

from services.optional_integrations import get_llm_chat_classes
import importlib

def _file_content_cls():
    try:
        mod = importlib.import_module("emergentintegrations.llm.chat")
        return getattr(mod, "FileContentWithMimeType")
    except Exception:
        return None

_LLM_AVAILABLE = True

logger = logging.getLogger("smart_import_ai")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ.get("DB_NAME", "konekt")]

router = APIRouter(prefix="/api/smart-import", tags=["Smart Bulk Import — AI"])


EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
# Default model: user confirmed Gemini 3 (latest multimodal).
# "gemini-3-flash-preview" is the fastest multimodal option at time of writing.
# Falls back to gemini-2.5-pro (marked "recommended" in the playbook) if flash is unavailable.
MODEL_PRIMARY = os.environ.get("AI_IMPORT_MODEL") or "gemini-3-flash-preview"
MODEL_FALLBACK = "gemini-2.5-pro"

# Canonical column set expected back from the LLM (matches smart_bulk_import_routes.FIELD_SYNONYMS keys).
CANONICAL_COLUMNS = ["name", "vendor_sku", "category", "vendor_cost", "stock", "unit", "description", "brand"]

SYSTEM_PROMPT = """You are Konekt's catalog-extraction assistant.  You read vendor product
catalogs (PDFs, pages, photos, or raw text) and return a clean JSON array of products.

Return ONLY valid JSON.  No prose, no markdown, no code fences.

Schema for each row (include every field; leave blank string if unknown):
{{
  "name": "short product name",
  "vendor_sku": "vendor's SKU / item code / part number",
  "category": "vendor's category label, e.g. Stationery, PPE, Printing",
  "vendor_cost": "unit price as number (no currency)",
  "stock": "quantity on hand as number",
  "unit": "pcs | kg | box | ream | ...",
  "description": "longer description or specifications",
  "brand": "brand / manufacturer"
}}

Top-level format:
{{"rows": [ {{...}}, {{...}} ]}}

Rules:
- Skip header rows, totals, disclaimers, pricing footnotes.
- Normalise prices: strip currency and commas, keep the numeric value as a string, e.g. "12000".
- Never invent data.  If the source does not show a field, use "".
- Combine multi-line product names into one line.
- One row per product.  Do not duplicate rows from pricing tables.
"""


def _mime_for(filename: str, default: str = "application/octet-stream") -> str:
    ext = (filename or "").lower().rsplit(".", 1)[-1]
    return {
        "pdf": "application/pdf",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "webp": "image/webp",
        "heic": "image/heic",
    }.get(ext, default)


async def _require_auth(request: Request, authorization: Optional[str]) -> Dict:
    """Mirror of smart_bulk_import_routes._require_auth."""
    try:
        user = await get_partner_user_from_header(authorization)
        return {
            "type": "partner",
            "id": user.get("partner_id"),
            "partner_id": user.get("partner_id"),
            "partner_name": user.get("company_name") or user.get("name", ""),
            "country_code": user.get("country_code", "TZ"),
        }
    except Exception:
        pass
    token = (request.headers.get("authorization") or "").replace("Bearer ", "")
    if token:
        return {"type": "admin", "id": "admin", "country_code": "TZ"}
    raise HTTPException(status_code=401, detail="Not authenticated")


def _strip_fences(s: str) -> str:
    s = (s or "").strip()
    if s.startswith("```"):
        s = s.split("\n", 1)[1] if "\n" in s else s
        if s.endswith("```"):
            s = s.rsplit("```", 1)[0]
        if s.lower().startswith("json"):
            s = s[4:].lstrip()
    return s.strip()


def _parse_rows(text: str) -> List[Dict]:
    text = _strip_fences(text)
    # Try straight JSON first
    try:
        data = json.loads(text)
    except Exception:
        # Try to locate the outermost {...}
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            raise HTTPException(status_code=502, detail="AI did not return JSON")
        try:
            data = json.loads(text[start : end + 1])
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"AI JSON parse failed: {e}")

    rows = data.get("rows") if isinstance(data, dict) else data
    if not isinstance(rows, list):
        raise HTTPException(status_code=502, detail="AI response missing 'rows' array")

    cleaned = []
    for r in rows:
        if not isinstance(r, dict):
            continue
        row = {k: str(r.get(k, "") or "").strip() for k in CANONICAL_COLUMNS}
        # Drop rows that are entirely blank OR only have brand/category (marketing blurbs)
        if not row.get("name"):
            continue
        cleaned.append(row)
    return cleaned


async def _run_ai(system: str, user_text: str, file_paths_with_mime: List[tuple]) -> List[Dict]:
    """Run the LLM once with primary model, fallback to secondary on failure."""
    LlmChat, UserMessage = get_llm_chat_classes()
    FileContentWithMimeType = _file_content_cls()
    if not LlmChat or not UserMessage or not FileContentWithMimeType:
        raise HTTPException(status_code=503, detail="AI import unavailable outside Emergent (missing emergentintegrations)")
    if not EMERGENT_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")

    async def _call(model_name: str):
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f"smart-import-{uuid4()}",
            system_message=system,
        ).with_model("gemini", model_name)
        fc = [FileContentWithMimeType(file_path=p, mime_type=m) for p, m in file_paths_with_mime]
        msg = UserMessage(text=user_text, file_contents=fc) if fc else UserMessage(text=user_text)
        return await chat.send_message(msg)

    try:
        resp = await _call(MODEL_PRIMARY)
    except Exception as e:
        logger.warning("AI primary model failed: %s (falling back to %s)", e, MODEL_FALLBACK)
        try:
            resp = await _call(MODEL_FALLBACK)
        except Exception as e2:
            raise HTTPException(status_code=502, detail=f"AI call failed: {e2}")

    # Extract plain text regardless of SDK return shape
    if isinstance(resp, tuple):
        text = resp[0] if resp and resp[0] is not None else ""
    else:
        text = str(resp or "")
    if not text:
        raise HTTPException(status_code=502, detail="AI returned empty response")

    return _parse_rows(text)


def _cache_session(rows: List[Dict], *, target: str, partner_id: str, country_code: str,
                   created_by: str, filename: str) -> Dict:
    """Persist parsed rows in smart_import_sessions so the wizard can continue."""
    session_id = str(uuid4())
    headers = list(CANONICAL_COLUMNS)
    # Build auto_map — column name == canonical name (since AI normalised it)
    auto_map = {c: c for c in headers}

    # Compute vendor category groups (for Step "category mapping")
    groups: Dict[str, int] = {}
    for r in rows:
        k = (r.get("category") or "(uncategorised)").strip() or "(uncategorised)"
        groups[k] = groups.get(k, 0) + 1

    # Sample (first 8)
    sample = rows[:8]

    session_doc = {
        "id": session_id,
        "filename": filename,
        "target": target if target in ("partner_catalog", "products") else "partner_catalog",
        "partner_id": partner_id or "",
        "country_code": (country_code or "TZ").upper()[:2],
        "headers": headers,
        "auto_map": auto_map,
        "rows_json": json.dumps(rows),
        "total_rows": len(rows),
        "created_by": created_by,
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=30),
        "source": "ai",
    }
    return session_doc, session_id, headers, auto_map, sample, groups


@router.post("/ai-parse")
async def ai_parse(
    request: Request,
    source: str = Form(...),
    text: Optional[str] = Form(None),
    target: str = Form("partner_catalog"),
    country_code: Optional[str] = Form(None),
    partner_id_override: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    files: Optional[List[UploadFile]] = File(None),
    authorization: Optional[str] = Header(None),
):
    auth = await _require_auth(request, authorization)
    if source not in {"pdf", "image", "photos", "text"}:
        raise HTTPException(status_code=400, detail="source must be pdf | image | photos | text")

    # Collect file attachments on disk — FileContentWithMimeType reads from a path
    tmp_paths: List[tuple] = []
    filename_label = "ai-import"
    user_prompt = "Extract all products from the attached material."

    try:
        if source == "text":
            if not text or not text.strip():
                raise HTTPException(status_code=400, detail="text is required for source=text")
            if len(text) > 200_000:
                raise HTTPException(status_code=413, detail="Pasted text too large (200k chars max)")
            filename_label = "clipboard-paste.txt"
            user_prompt = f"Here is the raw vendor catalog text.  Extract products.\n\n---\n{text}\n---"

        elif source in {"pdf", "image"}:
            if not file:
                raise HTTPException(status_code=400, detail=f"file is required for source={source}")
            data = await file.read()
            if len(data) > 40 * 1024 * 1024:
                raise HTTPException(status_code=413, detail="File too large (40MB max)")
            mime = _mime_for(file.filename, "application/pdf" if source == "pdf" else "image/jpeg")
            if source == "pdf" and not mime.endswith("pdf"):
                raise HTTPException(status_code=400, detail="Expected a PDF file")
            if source == "image" and not mime.startswith("image/"):
                raise HTTPException(status_code=400, detail="Expected an image file")
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix="." + (file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin"))
            tmp.write(data); tmp.close()
            tmp_paths.append((tmp.name, mime))
            filename_label = file.filename or filename_label
            user_prompt = "Extract all products from the attached document."

        elif source == "photos":
            if not files or len(files) == 0:
                raise HTTPException(status_code=400, detail="At least one photo is required")
            if len(files) > 25:
                raise HTTPException(status_code=413, detail="Max 25 photos per batch")
            for f in files:
                data = await f.read()
                if len(data) > 20 * 1024 * 1024:
                    raise HTTPException(status_code=413, detail=f"Photo {f.filename} too large (20MB max)")
                mime = _mime_for(f.filename, "image/jpeg")
                if not mime.startswith("image/"):
                    raise HTTPException(status_code=400, detail=f"{f.filename} is not an image")
                tmp = tempfile.NamedTemporaryFile(delete=False, suffix="." + (f.filename.rsplit(".", 1)[-1] if "." in f.filename else "jpg"))
                tmp.write(data); tmp.close()
                tmp_paths.append((tmp.name, mime))
            filename_label = f"{len(files)} photos"
            user_prompt = f"Extract products from these {len(files)} catalog photos."

        rows = await _run_ai(SYSTEM_PROMPT, user_prompt, tmp_paths)
        if not rows:
            raise HTTPException(status_code=422, detail="AI could not extract any products from this source")

        session_doc, session_id, headers, auto_map, sample, groups = _cache_session(
            rows,
            target=target,
            partner_id=partner_id_override or auth.get("partner_id") or "",
            country_code=country_code or auth.get("country_code") or "TZ",
            created_by=auth.get("id") or "",
            filename=filename_label,
        )
        await db.smart_import_sessions.insert_one(session_doc)

        return {
            "session_id": session_id,
            "source": "ai",
            "ai_source_kind": source,
            "filename": filename_label,
            "headers": headers,
            "auto_map": auto_map,
            "total_rows": len(rows),
            "sample": sample,
            "vendor_category_groups": [{"label": k, "count": v} for k, v in sorted(groups.items(), key=lambda kv: -kv[1])],
        }

    finally:
        # Clean up tmp files
        for p, _ in tmp_paths:
            try:
                Path(p).unlink(missing_ok=True)
            except Exception:
                pass
