def resolve_vendor_from_product(product: dict):
    """Resolve vendor ID from the product's uploader/owner."""
    return (
        product.get("vendor_id")
        or product.get("owner_vendor_id")
        or product.get("uploaded_by_vendor_id")
        or product.get("partner_id")
    )

def apply_vendor_assignment(order: dict, product: dict) -> dict:
    """Assign the product uploader/owner as the vendor for this order."""
    vid = resolve_vendor_from_product(product)
    if vid:
        order["assigned_vendor_id"] = vid
        if "vendor_ids" not in order:
            order["vendor_ids"] = []
        if vid not in order["vendor_ids"]:
            order["vendor_ids"].append(vid)
    return order
