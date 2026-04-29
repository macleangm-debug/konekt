"""
URL Import — scrape a partner's product catalog website and feed rows into the
existing Smart Import wizard.

Currently tuned for the Darcity-style catalog (ASP.NET WebForms `/shop-list.aspx`
pages with clean product cards).  The parser is defensive — it extracts what's
present and leaves the rest blank.

Flow:
  1. POST /api/admin/url-import/preview
       body: { url, vendor_id?, country_code?, max_pages?, download_images? }
     → crawls the URL across pages (follows "Next"/page-number links),
     → downloads each product image locally under /app/uploads/product_images/url_import/{session_id}/,
     → persists as a smart_import_sessions session (source=url),
     → returns the same {session_id, headers, auto_map, sample, vendor_category_groups}
       shape as the regular /preview, so the frontend wizard continues unchanged.

Auth: admin only.
"""
import asyncio
import logging
import os
import re
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse, urljoin, parse_qs, urlencode
from uuid import uuid4

import httpx
import jwt
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

try:
    from PIL import Image
    _PIL_AVAILABLE = True
except Exception:
    _PIL_AVAILABLE = False

logger = logging.getLogger("url_import")

router = APIRouter(prefix="/api/admin/url-import", tags=["URL Catalog Import"])

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ.get("DB_NAME", "konekt")]
JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-2024")

IMAGE_ROOT = Path("/app/uploads/product_images/url_import")
IMAGE_ROOT.mkdir(parents=True, exist_ok=True)

MAX_PAGES_DEFAULT = 60           # hard cap to prevent runaway crawls
MAX_PRODUCTS = 5000
PER_REQUEST_DELAY = 0.6          # ~1.5 req/s — polite
USER_AGENT = "Konekt Catalog Importer (+konekt.co.tz)"
IMAGE_MAX_DIM = 1200             # longest-side px
IMAGE_QUALITY = 85               # JPEG quality

CANONICAL_COLUMNS = [
    "name", "vendor_sku", "category", "vendor_cost", "stock", "unit",
    "description", "brand", "image_url", "source_url",
]


async def _assert_admin(request: Request) -> dict:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    try:
        payload = jwt.decode(auth.split(" ", 1)[1], JWT_SECRET, algorithms=["HS256"])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") not in ("admin", "vendor_ops", "ops"):
        raise HTTPException(status_code=403, detail="Admin/Ops only")
    return payload


def _money_to_number(text: str) -> str:
    """Extract digits from a price string like 'TSh 10,000' → '10000'."""
    if not text:
        return ""
    t = re.sub(r"[^\d.]", "", text.replace(",", ""))
    if not t:
        return ""
    # strip trailing dot
    return t.rstrip(".")


def _stock_to_number(text: str) -> str:
    if not text:
        return ""
    m = re.search(r"([\d,]+)", text.replace("Available Quantity", "").strip())
    return m.group(1).replace(",", "") if m else ""


def _clean_product_name(name: str) -> str:
    """Normalise vendor product names: strip leading 4-digit Darcity-style codes,
    and wrap trailing model codes in parens so they still differentiate SKUs."""
    if not name:
        return name
    n = name.strip()
    # Strip leading 4-digit SKU like "2406 - " or "2406G - "
    n = re.sub(r"^\d{4}[A-Z]?\s*-\s*", "", n)
    # Wrap trailing short model codes: " BXP14" → " (BXP14)"
    n = re.sub(r"[\s\-]+([A-Z]{2,6}\s?\d{1,5}[A-Z]?)\s*$", r" (\1)", n)
    # Wrap trailing bare model numbers: " - 1501" → " (#1501)"
    n = re.sub(r"\s+-\s+(\d{3,5}[A-Z]?)\s*$", r" (#\1)", n)
    # Strip trailing lowercase-letter noise codes: " hdp 5000"
    n = re.sub(r"\s+[a-z]{2,4}\s+\d{2,5}\s*$", "", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n


def _parse_product_card(card: BeautifulSoup, base_url: str) -> Optional[dict]:
    """Extract one product from a product card.  Handles Darcity-style markup and
    falls back to a generic parser for other sites."""
    # 1. NAME — try specific classes first, then fall back to <b>/<strong>/<h6>
    name_el = (
        card.find(class_=re.compile(r"product-name", re.I))
        or card.find("h6")
        or card.find("h5")
        or card.find("b")
        or card.find("strong")
    )
    if not name_el:
        return None
    name = name_el.get_text(strip=True)
    if not name:
        return None
    name = _clean_product_name(name)

    # 2. IMAGE
    img = card.find("img")
    image_url = urljoin(base_url, img.get("src") or img.get("data-src") or "") if img else ""

    # 3. CATEGORY — specific class first (note Darcity's "catergory" typo)
    cat_el = card.find(class_=re.compile(r"product-cat|catergory|category|catagory|card-category", re.I))
    category = cat_el.get_text(strip=True) if cat_el else ""
    if not category:
        # Fallback: previous sibling text
        prev = name_el.previous_sibling
        for _ in range(4):
            if prev is None:
                break
            if hasattr(prev, "get_text"):
                t = prev.get_text(strip=True)
            else:
                t = str(prev).strip()
            if t and 2 < len(t) < 80:
                category = t
                break
            prev = prev.previous_sibling if prev else None
        category = re.sub(r"^[\s\-\*\u00a0]+", "", category).strip()

    full_text = card.get_text(" ", strip=True)

    # 4. STOCK — "Available Quantity N"
    m = re.search(r"Available Quantity\s+([\d,]+)", full_text, re.I)
    stock = m.group(1).replace(",", "") if m else ""

    # 5. PRICE — Darcity embeds the numeric value in a hidden input; use that when available
    vendor_cost = ""
    hidden_cost = card.find("input", id=re.compile(r"hdnendclientcostVar", re.I))
    if hidden_cost and hidden_cost.get("value"):
        vendor_cost = _money_to_number(hidden_cost["value"])
    if not vendor_cost:
        m = re.search(r"(?:TSh|Tsh|TZS)\s*([\d,]+(?:\.\d+)?)", full_text)
        vendor_cost = m.group(1).replace(",", "") if m else ""

    # 6. DETAIL URL + vendor_sku (GUID)
    detail_link = None
    for a in card.find_all("a", href=True):
        if "product-details" in a["href"]:
            detail_link = urljoin(base_url, a["href"])
            break
    vendor_sku = ""
    if detail_link:
        q = parse_qs(urlparse(detail_link).query)
        if q.get("Product"):
            vendor_sku = q["Product"][0]

    return {
        "name": name,
        "vendor_sku": vendor_sku,
        "category": category,
        "vendor_cost": vendor_cost,
        "stock": stock,
        "unit": "pcs",
        "description": "",
        "brand": "",
        "image_url": image_url,
        "source_url": detail_link or "",
    }


async def _download_image(http: httpx.AsyncClient, url: str, dest_dir: Path, key: str) -> Optional[str]:
    """Download + optionally resize an image.  Returns the relative /uploads path or None."""
    if not url:
        return None
    try:
        r = await http.get(url, timeout=30)
        if r.status_code != 200 or not r.content:
            return None
        raw_path = dest_dir / f"{key}.bin"
        raw_path.write_bytes(r.content)
        # Convert to JPG, capped at IMAGE_MAX_DIM on longest side
        final_path = dest_dir / f"{key}.jpg"
        if _PIL_AVAILABLE:
            try:
                with Image.open(raw_path) as im:
                    im = im.convert("RGB")
                    w, h = im.size
                    if max(w, h) > IMAGE_MAX_DIM:
                        scale = IMAGE_MAX_DIM / max(w, h)
                        im = im.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
                    im.save(final_path, "JPEG", quality=IMAGE_QUALITY, optimize=True)
                raw_path.unlink(missing_ok=True)
            except Exception as e:
                logger.warning("Image resize failed for %s: %s", url, e)
                # keep raw bytes as fallback
                raw_path.rename(final_path)
        else:
            raw_path.rename(final_path)
        rel = final_path.relative_to(Path("/app/uploads"))
        return f"/api/uploads/{rel.as_posix()}"
    except Exception as e:
        logger.warning("Image download failed for %s: %s", url, e)
        return None


def _build_next_page_url(current_url: str, page_number: int) -> str:
    """Inject/replace a ?page=N param.  Works for Darcity-style pagination."""
    u = urlparse(current_url)
    qs = parse_qs(u.query)
    qs["page"] = [str(page_number)]
    new_q = urlencode(qs, doseq=True)
    return f"{u.scheme}://{u.netloc}{u.path}?{new_q}"


class UrlPreviewPayload(BaseModel):
    url: str
    vendor_id: str = ""            # partner_id the imported products will be attached to
    country_code: str = "TZ"
    max_pages: int = MAX_PAGES_DEFAULT
    download_images: bool = True
    target: str = "partner_catalog"  # "partner_catalog" | "products" (marketplace-live)
    # Site-wide crawl: when true, we treat `url` as the site root and auto-discover
    # every /shop-list?Category=... link from the homepage nav, then scrape each one.
    crawl_all_categories: bool = False
    branch: str = ""               # force Konekt branch label (e.g. "Promotional Materials")


async def _discover_category_urls(http: httpx.AsyncClient, root_url: str) -> list[str]:
    """Fetch the site root and extract every `/shop-list?Category=<name>` URL from the nav."""
    try:
        r = await http.get(root_url)
    except Exception as e:
        logger.warning("Root fetch failed %s: %s", root_url, e)
        return []
    if r.status_code != 200:
        return []
    soup = BeautifulSoup(r.text, "html.parser")
    seen: set[str] = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if "shop-list" in href and "Category=" in href:
            full = urljoin(root_url, href)
            # Normalise trailing whitespace
            seen.add(full.split("#")[0])
    return sorted(seen)


async def _scrape_page(http: httpx.AsyncClient, page_url: str, seen_skus: set, rows: list) -> int:
    """Scrape a single listing page; append products to `rows` and return the count added."""
    try:
        r = await http.get(page_url)
    except Exception as e:
        logger.warning("Page fetch failed: %s — %s", page_url, e)
        return 0
    if r.status_code != 200:
        return 0

    soup = BeautifulSoup(r.text, "html.parser")
    cards = []
    for sel in ("div.product-card", "div.product-item", "article.product", "li.product", ".product-cell"):
        found = soup.select(sel)
        if found:
            cards = found
            break
    if not cards:
        # Strategy B — walk up from anchors, skipping navbar entries
        anchors = soup.select('a[href*="product-details"]')
        if not anchors:
            return 0
        seen_cards = set()
        for a in anchors:
            parents = list(a.parents)
            if any(
                p.name == "nav"
                or "navbar" in (p.get("class") or [])
                or "dropdown-menu" in (p.get("class") or [])
                or "submenu" in (p.get("class") or [])
                for p in parents[:8]
            ):
                continue
            node = a
            for _ in range(6):
                node = node.parent
                if node is None:
                    break
                text = node.get_text(" ", strip=True) if node else ""
                if node.find("img") and re.search(r"(?:TSh|Tsh|TZS)", text) and 20 < len(text) < 600:
                    if id(node) in seen_cards:
                        break
                    seen_cards.add(id(node))
                    cards.append(node)
                    break

    added = 0
    for c in cards:
        parsed = _parse_product_card(c, page_url)
        if not parsed or not parsed["name"]:
            continue
        sku_key = parsed["vendor_sku"] or f"{parsed['name']}|{parsed.get('vendor_cost','')}"
        if sku_key in seen_skus:
            continue
        seen_skus.add(sku_key)
        rows.append(parsed)
        added += 1
        if len(rows) >= MAX_PRODUCTS:
            break
    return added


@router.post("/preview")
async def url_preview(payload: UrlPreviewPayload, request: Request):
    admin = await _assert_admin(request)

    if not payload.url or not payload.url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Provide a full https:// URL")
    if not payload.vendor_id:
        raise HTTPException(status_code=400, detail="vendor_id is required — create or pick a vendor first")

    session_id = str(uuid4())
    dest_dir = IMAGE_ROOT / session_id
    dest_dir.mkdir(parents=True, exist_ok=True)

    seen_skus: set[str] = set()
    rows: list[dict] = []
    pages_crawled = 0

    async with httpx.AsyncClient(headers={"User-Agent": USER_AGENT}, follow_redirects=True, timeout=45) as http:
        # Build the list of URLs to scrape
        if payload.crawl_all_categories:
            # Site-wide mode: discover every category page from the root, plus the root itself
            category_urls = await _discover_category_urls(http, payload.url)
            if not category_urls:
                raise HTTPException(status_code=422, detail="No category links found on the root URL.  Use a direct category/shop URL instead.")
            urls_to_crawl = category_urls
        else:
            # Single-URL mode: also try paginated variants
            urls_to_crawl = [payload.url]
            for p in range(2, max(2, min(payload.max_pages, MAX_PAGES_DEFAULT)) + 1):
                urls_to_crawl.append(_build_next_page_url(payload.url, p))

        for url in urls_to_crawl:
            added = await _scrape_page(http, url, seen_skus, rows)
            pages_crawled += 1
            if len(rows) >= MAX_PRODUCTS:
                break
            if not payload.crawl_all_categories and added == 0:
                # Pagination mode: stop when a page returns no new products
                break
            await asyncio.sleep(PER_REQUEST_DELAY)

        if not rows:
            raise HTTPException(status_code=422, detail="No products found at that URL. Check the URL or try a category page.")

        # Download images
        if payload.download_images:
            sem = asyncio.Semaphore(5)

            async def _dl(row, idx):
                async with sem:
                    key = (row["vendor_sku"] or f"p{idx}").replace("/", "_")[:80]
                    local = await _download_image(http, row["image_url"], dest_dir, key)
                    row["image_local"] = local or ""
                    await asyncio.sleep(0.1)

            await asyncio.gather(*[_dl(r, i) for i, r in enumerate(rows)])

    # Persist smart-import session so commit reuses the regular pipeline
    groups: dict[str, int] = {}
    for r in rows:
        k = (r.get("category") or "(uncategorised)").strip() or "(uncategorised)"
        groups[k] = groups.get(k, 0) + 1

    headers = list(CANONICAL_COLUMNS)
    auto_map = {c: c for c in headers}
    session_doc = {
        "id": session_id,
        "filename": urlparse(payload.url).netloc,
        "target": payload.target if payload.target in ("partner_catalog", "products") else "partner_catalog",
        "partner_id": payload.vendor_id,
        "country_code": (payload.country_code or "TZ").upper()[:2],
        "branch": (payload.branch or "").strip() or None,
        "headers": headers,
        "auto_map": auto_map,
        "rows_json": json.dumps(rows),
        "total_rows": len(rows),
        "created_by": admin.get("email") or admin.get("user_id") or "admin",
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=2),
        "source": "url",
        "source_url": payload.url,
        "pages_crawled": pages_crawled,
        "crawl_all_categories": payload.crawl_all_categories,
    }
    await db.smart_import_sessions.insert_one(session_doc)

    return {
        "session_id": session_id,
        "source": "url",
        "source_url": payload.url,
        "filename": urlparse(payload.url).netloc,
        "pages_crawled": pages_crawled,
        "headers": headers,
        "auto_map": auto_map,
        "total_rows": len(rows),
        "sample": rows[:10],
        "vendor_category_groups": [{"label": k, "count": v} for k, v in sorted(groups.items(), key=lambda kv: -kv[1])],
    }
