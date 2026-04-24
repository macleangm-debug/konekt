"""One-off: move the 7 ID Printer SKUs from Promotional Materials → Office Equipment category."""
import asyncio
import os
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ.get("DB_NAME", "konekt")]

    oe = await db.catalog_categories.find_one({"slug": "office-equipment"})
    if not oe:
        print("Office Equipment category not found — aborting.")
        return

    query = {"category": "ID Printers and Accessories"}
    products = await db.products.find(query, {"_id": 0, "name": 1, "category_id": 1}).to_list(length=100)
    print(f"Found {len(products)} ID Printer products")
    for p in products:
        print(f"  {p['name']}  — was category_id={p.get('category_id')}")

    result = await db.products.update_many(
        query,
        {"$set": {
            "category_id": oe["id"],
            "category_name": "Office Equipment",
            "branch": "Office Equipment",
        }},
    )
    print(f"Updated {result.modified_count} products → Office Equipment ({oe['id']})")


if __name__ == "__main__":
    asyncio.run(main())
