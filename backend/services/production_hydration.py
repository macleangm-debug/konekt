"""
Production Hydration Service
─────────────────────────────
On backend startup, ensure the deployed production DB contains the real
Darcity catalog — not the legacy demo data (A5 Notebook, Branded Cap, etc.)
and not TEST_* artefacts.

Behaviour is strictly idempotent and SAFE:

  1.  Always prune demo-name products (A5 Notebook, Branded Cap, Ceramic Coffee
      Mug, KonektSeries*, Roll-Up Banner, Classic Cotton T-Shirt, Premium Polo
      Shirt, Trucker Cap) and any TEST_* products + related orphaned group
      deals. This runs on every boot so a bot hitting the legacy
      /api/seed endpoint (now removed anyway) cannot re-contaminate prod.

  2.  If the products collection has **no Darcity products** (fresh deploy
      or wiped DB), load the 610-record JSON seed + extract the bundled
      image tarball into /app/uploads/product_images/url_import/.  After
      loading, the homepage, marketplace, and group-deal widgets light up
      with real data without any manual steps.

  3.  Never touches existing Darcity data on subsequent boots — only
      replaces test contamination.
"""
from __future__ import annotations

import json
import logging
import os
import tarfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

logger = logging.getLogger("production_hydration")

SEED_DIR = Path(__file__).resolve().parent.parent / "data" / "production_seed"
DARCITY_PARTNER_ID = "69e9e91b7ef848b59a2f8172"

DEMO_NAMES = [
    "A5 Notebook", "A4 Notebook", "Classic Cotton T-Shirt", "Premium Polo Shirt",
    "Branded Cap", "Trucker Cap", "Ceramic Coffee Mug", "Roll-Up Banner",
    "KonektSeries Classic Cap", "KonektSeries Snapback Hat",
    "KonektSeries Premium Bucket Hat", "KonektSeries Urban Shorts",
]
TEST_RX = {"$regex": "^TEST_", "$options": "i"}

# Field names whose ISO-string values should be re-inflated to datetime objects
# when loading the JSON seed back into MongoDB. Consumers (e.g. group-deal
# routes) depend on these being real datetimes for `.tzinfo`/arithmetic.
_DATETIME_FIELDS = {
    "created_at", "updated_at", "deleted_at", "deadline", "start_date",
    "end_date", "starts_at", "ends_at", "activated_at", "completed_at",
    "expired_at", "expires_at", "auto_suggest_expires_at", "closed_at",
    "cancelled_at", "approved_at", "published_at", "last_seen_at",
    "pricing_last_realigned",
}


def _revive_datetimes(doc):
    """Walk a loaded JSON doc and convert known datetime-string fields back
    to aware `datetime` objects so MongoDB stores them natively."""
    if isinstance(doc, list):
        return [_revive_datetimes(x) for x in doc]
    if not isinstance(doc, dict):
        return doc
    out = {}
    for k, v in doc.items():
        if isinstance(v, str) and k in _DATETIME_FIELDS:
            try:
                dt = datetime.fromisoformat(v.replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                out[k] = dt
            except Exception:
                out[k] = v
        elif isinstance(v, (dict, list)):
            out[k] = _revive_datetimes(v)
        else:
            out[k] = v
    return out


def _read_seed(name: str) -> list:
    path = SEED_DIR / f"{name}.json"
    if not path.exists():
        return []
    try:
        raw = json.loads(path.read_text())
        return _revive_datetimes(raw)
    except Exception as exc:
        logger.warning("production_hydration: cannot parse %s (%s)", name, exc)
        return []


async def _prune_contamination(db) -> dict:
    """Remove demo + TEST_* rows; return deletion counts."""
    counts = {}

    r = await db.products.delete_many({
        "$or": [{"name": {"$in": DEMO_NAMES}}, {"name": TEST_RX}]
    })
    counts["products"] = r.deleted_count

    # Group deal campaigns referencing TEST_* or orphaned product ids
    live_pids = set(await db.products.distinct("id"))
    kill_ids: list[str] = []
    async for d in db.group_deal_campaigns.find(
        {}, {"_id": 0, "id": 1, "product_name": 1, "product_id": 1}
    ):
        pn = (d.get("product_name") or "").upper()
        if pn.startswith("TEST_") or (
            d.get("product_id") and d["product_id"] not in live_pids
        ):
            kill_ids.append(d["id"])
    if kill_ids:
        r = await db.group_deal_campaigns.delete_many({"id": {"$in": kill_ids}})
        counts["group_deals"] = r.deleted_count
        r = await db.group_deal_commitments.delete_many(
            {"campaign_id": {"$in": kill_ids}}
        )
        counts["group_deal_commitments"] = r.deleted_count
    else:
        counts["group_deals"] = 0
        counts["group_deal_commitments"] = 0

    r = await db.price_requests.delete_many({
        "$or": [
            {"product_or_service": TEST_RX},
            {"product_or_service": ""},
            {"requested_by": {"$regex": "test", "$options": "i"}},
            {"requested_by_name": {"$regex": "test", "$options": "i"}},
        ]
    })
    counts["price_requests"] = r.deleted_count

    return counts


async def _extract_image_tarball() -> int:
    """Unpack the bundled product images if they're not yet on disk."""
    tar_path = SEED_DIR / "darcity_images.tar.gz"
    if not tar_path.exists():
        return 0
    target_root = Path("/app/uploads")
    target_root.mkdir(parents=True, exist_ok=True)
    try:
        with tarfile.open(tar_path, "r:gz") as tf:
            tf.extractall(path=target_root)
        # Count extracted files for the log line
        count = 0
        for _r, _d, files in os.walk(target_root / "product_images" / "url_import"):
            count += len(files)
        return count
    except Exception as exc:
        logger.error("production_hydration: failed to extract image tarball: %s",
                     exc, exc_info=True)
        return 0


async def _bulk_upsert(db, collection: str, docs: Iterable[dict],
                      key: str = "id") -> int:
    """Insert any doc whose `key` isn't already in the collection."""
    docs = list(docs)
    if not docs:
        return 0
    existing = set(await db[collection].distinct(key))
    to_insert = [d for d in docs if d.get(key) and d[key] not in existing]
    if not to_insert:
        return 0
    await db[collection].insert_many(to_insert)
    return len(to_insert)


async def _hydrate_darcity(db) -> dict:
    """If Darcity has zero products, load seed + extract images."""
    darcity_product_count = await db.products.count_documents(
        {"partner_id": DARCITY_PARTNER_ID, "is_active": True}
    )
    if darcity_product_count > 0:
        return {"skipped": True, "reason": f"{darcity_product_count} Darcity products already present"}

    report: dict = {"skipped": False}

    # 1) Images first so image_url paths work the moment products go live
    report["images_extracted"] = await _extract_image_tarball()

    # 2) Reference data — categories, subcategories, taxonomy, settings
    report["admin_settings"] = await _bulk_upsert(
        db, "admin_settings", _read_seed("admin_settings"), key="key"
    )
    report["catalog_categories"] = await _bulk_upsert(
        db, "catalog_categories", _read_seed("catalog_categories")
    )
    report["catalog_subcategories"] = await _bulk_upsert(
        db, "catalog_subcategories", _read_seed("catalog_subcategories")
    )
    report["taxonomy"] = await _bulk_upsert(db, "taxonomy", _read_seed("taxonomy"))
    report["margin_rules"] = await _bulk_upsert(
        db, "margin_rules", _read_seed("margin_rules")
    )
    report["margin_config"] = await _bulk_upsert(
        db, "margin_config", _read_seed("margin_config")
    )
    report["hero_banners"] = await _bulk_upsert(
        db, "hero_banners", _read_seed("hero_banners")
    )
    report["platform_promotions"] = await _bulk_upsert(
        db, "platform_promotions", _read_seed("platform_promotions")
    )

    # 3) Partner + vendor user (users keyed by email to avoid duplicates)
    partners = _read_seed("partners")
    if partners:
        from bson import ObjectId  # local import
        for p in partners:
            pd = dict(p)
            obj_id = pd.pop("_id_hex", None)
            if obj_id:
                try:
                    pd["_id"] = ObjectId(obj_id)
                except Exception:
                    pass
            # Only insert if not already there
            existing = None
            if pd.get("_id"):
                existing = await db.partners.find_one({"_id": pd["_id"]})
            if not existing and pd.get("name"):
                existing = await db.partners.find_one({"name": pd["name"]})
            if not existing:
                try:
                    await db.partners.insert_one(pd)
                except Exception as exc:
                    logger.warning("partner insert failed: %s", exc)
    report["partners_loaded"] = len(partners)

    darcity_users = _read_seed("users_darcity")
    for u in darcity_users:
        exists = await db.users.find_one({"email": u.get("email")})
        if not exists:
            await db.users.insert_one(u)
    report["darcity_users"] = len(darcity_users)

    # 4) Products (the main payload)
    report["products_loaded"] = await _bulk_upsert(
        db, "products", _read_seed("products")
    )

    # 5) Group deals (keyed by campaign_id, not id)
    report["group_deals_loaded"] = await _bulk_upsert(
        db, "group_deal_campaigns", _read_seed("group_deal_campaigns"),
        key="campaign_id",
    )

    return report


async def run_production_hydration(db) -> dict:
    """Entry point invoked from FastAPI `startup` event."""
    if os.environ.get("SKIP_PRODUCTION_HYDRATION", "").lower() in ("1", "true", "yes"):
        logger.info("production_hydration: SKIP_PRODUCTION_HYDRATION set — skipping")
        return {"skipped_by_env": True}
    try:
        report = {}
        report["pruned"] = await _prune_contamination(db)
        report["hydrated"] = await _hydrate_darcity(db)

        # Log a crisp one-line summary so prod supervisor logs tell the story
        pruned = report["pruned"]
        hyd = report["hydrated"]
        if hyd.get("skipped"):
            logger.info(
                "production_hydration: pruned %s · hydrate skipped (%s)",
                pruned, hyd.get("reason"),
            )
        else:
            logger.info(
                "production_hydration: pruned %s · hydrated products=%s "
                "group_deals=%s images=%s",
                pruned,
                hyd.get("products_loaded"),
                hyd.get("group_deals_loaded"),
                hyd.get("images_extracted"),
            )
        return report
    except Exception as exc:
        logger.error("production_hydration failed: %s", exc, exc_info=True)
        return {"error": str(exc)}
