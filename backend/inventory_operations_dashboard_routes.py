"""
Inventory Operations Dashboard Routes
Provides operational metrics for inventory team
"""
from datetime import datetime, timezone
from fastapi import APIRouter
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/inventory-ops-dashboard", tags=["Inventory Operations Dashboard"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


@router.get("")
async def inventory_ops_dashboard():
    """Get inventory operations dashboard metrics."""
    
    # Low stock items - where available_qty is at or below threshold
    low_stock = await db.inventory_items.count_documents({
        "$expr": {"$lte": [{"$ifNull": ["$available_qty", "$quantity"]}, {"$ifNull": ["$low_stock_threshold", 0]}]}
    })
    
    # Also check raw materials
    low_stock_raw = await db.raw_materials.count_documents({
        "$expr": {"$lte": [{"$ifNull": ["$available_qty", "$quantity"]}, {"$ifNull": ["$low_stock_threshold", 0]}]}
    })
    
    # Pending delivery notes
    pending_delivery_notes = await db.delivery_notes.count_documents({"status": {"$in": ["issued", "in_transit"]}})
    
    # Pending goods receipts
    pending_receipts = await db.goods_receipts.count_documents({"status": {"$in": ["received", "inspected"]}})
    
    # Open purchase orders
    open_purchase_orders = await db.purchase_orders.count_documents({"status": {"$in": ["draft", "ordered", "partially_received"]}})
    
    # Orders with reserved stock
    reserved_orders = await db.orders.count_documents({"stock_reserved": True, "status": {"$nin": ["fulfilled", "cancelled"]}})
    
    # Orders pending fulfillment
    pending_fulfillment = await db.orders.count_documents({"status": {"$in": ["pending", "confirmed", "in_production"]}})
    
    # Today's movements
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    movements_today = await db.stock_movements.count_documents({"created_at": {"$gte": today_start}})
    
    # Total inventory items
    total_items = await db.inventory_items.count_documents({})
    total_raw_materials = await db.raw_materials.count_documents({})
    
    # Suppliers count
    total_suppliers = await db.suppliers.count_documents({})

    return {
        "low_stock_items": low_stock + low_stock_raw,
        "low_stock_products": low_stock,
        "low_stock_raw_materials": low_stock_raw,
        "pending_delivery_notes": pending_delivery_notes,
        "pending_goods_receipts": pending_receipts,
        "open_purchase_orders": open_purchase_orders,
        "reserved_orders": reserved_orders,
        "pending_fulfillment": pending_fulfillment,
        "movements_today": movements_today,
        "total_items": total_items,
        "total_raw_materials": total_raw_materials,
        "total_suppliers": total_suppliers,
    }


@router.get("/low-stock")
async def get_low_stock_items():
    """Get list of items with low stock."""
    
    # Get low stock products
    products = await db.inventory_items.find({
        "$expr": {"$lte": [{"$ifNull": ["$available_qty", "$quantity"]}, {"$ifNull": ["$low_stock_threshold", 0]}]}
    }).to_list(length=100)
    
    # Get low stock raw materials
    raw_materials = await db.raw_materials.find({
        "$expr": {"$lte": [{"$ifNull": ["$available_qty", "$quantity"]}, {"$ifNull": ["$low_stock_threshold", 0]}]}
    }).to_list(length=100)
    
    items = []
    for p in products:
        items.append({
            "id": str(p["_id"]),
            "sku": p.get("sku"),
            "name": p.get("name"),
            "type": "product",
            "on_hand": p.get("on_hand_qty", p.get("quantity", 0)),
            "available": p.get("available_qty", p.get("quantity", 0)),
            "reserved": p.get("reserved_qty", 0),
            "threshold": p.get("low_stock_threshold", 0),
        })
    
    for r in raw_materials:
        items.append({
            "id": str(r["_id"]),
            "sku": r.get("sku"),
            "name": r.get("name"),
            "type": "raw_material",
            "on_hand": r.get("on_hand_qty", r.get("quantity", 0)),
            "available": r.get("available_qty", r.get("quantity", 0)),
            "reserved": r.get("reserved_qty", 0),
            "threshold": r.get("low_stock_threshold", 0),
        })
    
    return items
