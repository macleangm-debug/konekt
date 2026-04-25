"""One-shot sanitiser to strip vendor affiliations from public-facing
product descriptions. Idempotent; safe to re-run.

Run from /app/backend:
    python -m scripts.sanitise_public_descriptions
"""
import asyncio
import json
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

# Phrases that leak vendor identity from public-facing fields
VENDOR_LEAK_PATTERNS = [
    re.compile(r"\s*sourced from [^.]+\.\s*", re.I),
    re.compile(r"\s*Source\s*:\s*[^\n.]+\.?\s*", re.I),
    re.compile(r"\s*Vendor\s*:\s*[^\n.]+\.?\s*", re.I),
    re.compile(r"\s*Supplied by [^.]+\.\s*", re.I),
    re.compile(r"\s*from\s+Darcity[^.]*\.\s*", re.I),
    re.compile(r"Darcity Promotion(?:\s+Ltd\.?)?", re.I),
    re.compile(r"\bDarcity\b", re.I),
    re.compile(r"\bDar\s*City\b", re.I),
]

# Public-facing product fields to scrub
PUBLIC_FIELDS = [
    "description", "short_description", "long_description",
    "seo_description", "meta_description", "meta_title",
    "tagline", "subtitle",
]


def sanitise_text(value: str) -> str:
    if not value or not isinstance(value, str):
        return value
    out = value
    for rx in VENDOR_LEAK_PATTERNS:
        out = rx.sub(" ", out)
    # Tidy whitespace + stray punctuation left behind
    out = re.sub(r"\s+", " ", out).strip()
    out = re.sub(r"\s+([,.])", r"\1", out)
    out = re.sub(r"^[\s,.;:-]+", "", out)
    return out


def sanitise_doc(doc: dict) -> tuple[dict, bool]:
    """Returns (new_doc, changed)."""
    changed = False
    for f in PUBLIC_FIELDS:
        v = doc.get(f)
        if isinstance(v, str):
            cleaned = sanitise_text(v)
            if cleaned != v:
                doc[f] = cleaned
                changed = True
    # Tags / keywords might be lists of strings
    for f in ("tags", "keywords", "search_tags"):
        v = doc.get(f)
        if isinstance(v, list):
            new = [sanitise_text(x) if isinstance(x, str) else x for x in v]
            if new != v:
                doc[f] = new
                changed = True
    return doc, changed


async def sanitise_db():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    total = 0
    changed = 0
    async for p in db.products.find(
        {}, {"_id": 1, **{f: 1 for f in PUBLIC_FIELDS + ["tags", "keywords", "search_tags"]}}
    ):
        total += 1
        _id = p.pop("_id")
        new, did_change = sanitise_doc(p)
        if did_change:
            await db.products.update_one({"_id": _id}, {"$set": {k: new[k] for k in new}})
            changed += 1
    print(f"DB scrub: scanned {total} products · cleaned {changed}")


def sanitise_seed_json():
    seed = Path("/app/backend/data/production_seed/products.json")
    if not seed.exists():
        print(f"No seed at {seed}")
        return
    data = json.loads(seed.read_text())
    changed = 0
    for d in data:
        _, did_change = sanitise_doc(d)
        if did_change:
            changed += 1
    seed.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    print(f"Seed scrub: scanned {len(data)} · cleaned {changed}")


async def main():
    if "--seed-only" in sys.argv:
        sanitise_seed_json()
        return
    sanitise_seed_json()
    await sanitise_db()


if __name__ == "__main__":
    asyncio.run(main())
