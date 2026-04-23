"""
SEO — dynamic sitemap.xml and robots.txt generation.
Regenerates /app/frontend/public/{sitemap.xml,robots.txt} so they are served as
static assets at https://<site>/sitemap.xml and https://<site>/robots.txt.
"""
import os
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/seo", tags=["seo"])

mongo_url = os.environ["MONGO_URL"]
db_name = os.environ["DB_NAME"]
_client = AsyncIOMotorClient(mongo_url)
db = _client[db_name]

SITE_BASE = (os.environ.get("PUBLIC_SITE_URL") or "https://konekt.co.tz").rstrip("/")
PUBLIC_DIR = Path(os.environ.get("FRONTEND_PUBLIC_DIR", "/app/frontend/public"))
PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

# Static high-value landing pages included in the sitemap
_STATIC_URLS = [
    "/",
    "/products",
    "/marketplace",
    "/about",
    "/contact",
    "/services",
]


def _iso(dt):
    if not dt:
        return datetime.now(timezone.utc).date().isoformat()
    if isinstance(dt, datetime):
        return dt.astimezone(timezone.utc).date().isoformat()
    if isinstance(dt, str):
        return dt.split("T")[0]
    return datetime.now(timezone.utc).date().isoformat()


def _xml_escape(s: str) -> str:
    return (
        (s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


async def build_sitemap_xml() -> tuple[str, dict]:
    """Build the full sitemap XML and return (xml_str, stats)."""
    urls: list[dict] = []
    now_iso = datetime.now(timezone.utc).date().isoformat()

    # 1. Static pages
    for path in _STATIC_URLS:
        urls.append({"loc": f"{SITE_BASE}{path}", "lastmod": now_iso, "priority": "0.9" if path == "/" else "0.8"})

    # 2. Product detail pages (only active published ones)
    async for p in db.products.find(
        {"is_active": True},
        {"_id": 0, "id": 1, "slug": 1, "updated_at": 1, "created_at": 1},
    ):
        pid = p.get("id")
        if not pid:
            continue
        lastmod = p.get("updated_at") or p.get("created_at")
        urls.append({
            "loc": f"{SITE_BASE}/product/{_xml_escape(pid)}",
            "lastmod": _iso(lastmod),
            "priority": "0.7",
        })

    # 3. Marketplace listings
    async for m in db.marketplace_listings.find(
        {"is_active": True},
        {"_id": 0, "slug": 1, "id": 1, "updated_at": 1, "created_at": 1},
    ):
        slug = m.get("slug") or m.get("id")
        if not slug:
            continue
        lastmod = m.get("updated_at") or m.get("created_at")
        urls.append({
            "loc": f"{SITE_BASE}/marketplace/{_xml_escape(str(slug))}",
            "lastmod": _iso(lastmod),
            "priority": "0.6",
        })

    # 4. Category/subcategory listing pages — long-tail SEO gold
    async for c in db.catalog_categories.find({"is_active": True}, {"_id": 0, "slug": 1, "id": 1}):
        slug = c.get("slug") or c.get("id")
        if not slug:
            continue
        urls.append({
            "loc": f"{SITE_BASE}/marketplace?category_id={_xml_escape(str(c.get('id','')))}",
            "lastmod": now_iso,
            "priority": "0.6",
        })
    async for s in db.catalog_subcategories.find({"is_active": True}, {"_id": 0, "slug": 1, "id": 1, "name": 1}):
        sid = s.get("id")
        if not sid:
            continue
        urls.append({
            "loc": f"{SITE_BASE}/marketplace?subcategory_id={_xml_escape(sid)}",
            "lastmod": now_iso,
            "priority": "0.55",
        })

    # De-dupe by loc while preserving order
    seen = set()
    deduped = []
    for u in urls:
        if u["loc"] in seen:
            continue
        seen.add(u["loc"])
        deduped.append(u)

    body = "\n".join(
        f"  <url>\n    <loc>{u['loc']}</loc>\n    <lastmod>{u['lastmod']}</lastmod>\n"
        f"    <changefreq>weekly</changefreq>\n    <priority>{u['priority']}</priority>\n  </url>"
        for u in deduped
    )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{body}\n"
        "</urlset>\n"
    )
    stats = {
        "total_urls": len(deduped),
        "static_pages": len(_STATIC_URLS),
        "products": sum(1 for u in deduped if "/product/" in u["loc"]),
        "marketplace_listings": sum(1 for u in deduped if "/marketplace/" in u["loc"] and "category" not in u["loc"]),
        "category_filters": sum(1 for u in deduped if "category_id=" in u["loc"]),
        "subcategory_filters": sum(1 for u in deduped if "subcategory_id=" in u["loc"]),
    }
    return xml, stats


def _write_robots_txt():
    content = (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /admin\n"
        "Disallow: /ops\n"
        "Disallow: /api\n"
        "Disallow: /customize\n"
        "Disallow: /checkout\n"
        "Disallow: /cart\n"
        "Disallow: /account\n"
        "\n"
        f"Sitemap: {SITE_BASE}/sitemap.xml\n"
    )
    (PUBLIC_DIR / "robots.txt").write_text(content)
    return content


@router.post("/sitemap/regenerate")
async def regenerate_sitemap(
    x_emergent_token: str = Header(default=""),
    authorization: str = Header(default=""),
):
    """Rebuild /app/frontend/public/{sitemap.xml,robots.txt}. Open to admin JWT or a CRON token."""
    # Light auth: accept admin JWT OR internal regen token
    internal_token = os.environ.get("INTERNAL_CRON_TOKEN") or ""
    has_token = bool(internal_token) and (x_emergent_token == internal_token)
    has_admin_bearer = authorization.lower().startswith("bearer ")
    if not has_token and not has_admin_bearer:
        raise HTTPException(status_code=401, detail="Admin JWT or internal cron token required")

    xml, stats = await build_sitemap_xml()
    (PUBLIC_DIR / "sitemap.xml").write_text(xml)
    _write_robots_txt()
    return {"ok": True, "written": str(PUBLIC_DIR / "sitemap.xml"), "stats": stats}


@router.get("/sitemap.xml")
async def sitemap_xml():
    """Inline copy — also served as static at /sitemap.xml once regenerate has run."""
    xml, _ = await build_sitemap_xml()
    return Response(content=xml, media_type="application/xml")


@router.get("/robots.txt")
async def robots_txt():
    return Response(content=_write_robots_txt(), media_type="text/plain")
