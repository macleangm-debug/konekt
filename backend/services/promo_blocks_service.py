"""
Promo Blocks Service — Feb 27, 2026
─────────────────────────────────────────────────────────────────────────────
When admin approves an engine promotion, they can sacrifice incentive pools
(referral / sales / affiliate / reserve) to fund a deeper customer discount.
The product gets stamped with `promo_blocks.<channel>=true` to BLOCK that
incentive on the product during the promo window.

This module is the single consumer of `promo_blocks` for downstream incentive
flows. It exposes:

  await is_blocked(db, product_id, channel)
      → True if the product currently has the channel blocked.

  await compute_eligible_amount(db, items, channel)
      → Sum of line-amounts (qty × unit_price) for items whose product is NOT
        blocked on `channel`. Items missing product_id always count as
        eligible (sales-quote items, freight, etc.).

Channels: 'affiliate' | 'referral' | 'sales'.
"""
from typing import Iterable

VALID_CHANNELS = {"affiliate", "referral", "sales"}


def _line_amount(item: dict) -> float:
    qty = float(item.get("quantity") or item.get("qty") or 1)
    unit = float(
        item.get("unit_price")
        or item.get("price")
        or item.get("amount")
        or 0
    )
    if not unit:
        # Fallback: total may already be on the line
        return float(item.get("total") or item.get("subtotal") or 0)
    return qty * unit


async def get_blocks_map(db, product_ids: Iterable[str]) -> dict:
    """Return {product_id: promo_blocks_dict} for the given products."""
    pids = [p for p in (product_ids or []) if p]
    if not pids:
        return {}
    blocks: dict[str, dict] = {}
    async for p in db.products.find(
        {"id": {"$in": pids}},
        {"_id": 0, "id": 1, "promo_blocks": 1},
    ):
        blocks[p["id"]] = p.get("promo_blocks") or {}
    return blocks


async def is_blocked(db, product_id: str, channel: str) -> bool:
    if not product_id or channel not in VALID_CHANNELS:
        return False
    p = await db.products.find_one(
        {"id": product_id}, {"_id": 0, "promo_blocks": 1}
    )
    return bool((p or {}).get("promo_blocks", {}).get(channel))


async def compute_eligible_amount(
    db, items: list[dict], channel: str
) -> tuple[float, list[str]]:
    """Sum line amounts for items whose product is NOT blocked on `channel`.

    Returns (eligible_amount, blocked_product_ids).
    Items without a resolvable product_id count as eligible (no block can apply).
    """
    if channel not in VALID_CHANNELS or not items:
        return (sum(_line_amount(it) for it in items or []), [])

    pids = [
        (it.get("product_id") or it.get("sku") or "")
        for it in items
        if (it.get("product_id") or it.get("sku"))
    ]
    blocks = await get_blocks_map(db, pids)

    eligible = 0.0
    blocked_pids: list[str] = []
    for it in items:
        pid = it.get("product_id") or it.get("sku")
        if pid and (blocks.get(pid) or {}).get(channel):
            blocked_pids.append(pid)
            continue
        eligible += _line_amount(it)
    return (round(eligible, 2), blocked_pids)


async def filter_eligible_items(
    db, items: list[dict], channel: str
) -> tuple[list[dict], list[str]]:
    """Return (eligible_items, blocked_pids) — items whose product is NOT
    blocked on `channel`. Items without a product id are always eligible."""
    if channel not in VALID_CHANNELS or not items:
        return (list(items or []), [])
    pids = [
        (it.get("product_id") or it.get("sku") or "")
        for it in items
        if (it.get("product_id") or it.get("sku"))
    ]
    blocks = await get_blocks_map(db, pids)
    eligible: list[dict] = []
    blocked_pids: list[str] = []
    for it in items:
        pid = it.get("product_id") or it.get("sku")
        if pid and (blocks.get(pid) or {}).get(channel):
            blocked_pids.append(pid)
            continue
        eligible.append(it)
    return (eligible, blocked_pids)


async def resolve_order_items(db, *, order_id=None, invoice_id=None) -> list[dict]:
    """Best-effort load of line items from an order or its parent invoice.
    Returns [] when nothing can be located."""
    from bson import ObjectId

    def _items(doc: dict | None) -> list[dict]:
        if not doc:
            return []
        return list(doc.get("items") or doc.get("line_items") or [])

    if order_id:
        try:
            o = await db.orders.find_one({"_id": ObjectId(order_id)})
        except Exception:
            o = None
        if not o:
            o = await db.orders.find_one({"id": str(order_id)})
        items = _items(o)
        if items:
            return items

    if invoice_id:
        try:
            inv = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
        except Exception:
            inv = None
        if not inv:
            inv = await db.invoices.find_one({"invoice_number": str(invoice_id)})
        items = _items(inv)
        if items:
            return items
        # Fallback to the invoice's order
        if inv and inv.get("order_id"):
            try:
                o = await db.orders.find_one({"_id": ObjectId(inv["order_id"])})
            except Exception:
                o = None
            if o:
                return _items(o)

    return []
