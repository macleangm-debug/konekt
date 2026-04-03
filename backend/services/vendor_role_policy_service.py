"""
Vendor Role Policy Service — Determines vendor_role from capabilities and enforces
marketplace permission rules.

Roles:
  - product_vendor: Can publish products to marketplace
  - promo_vendor: Can publish promotional materials to marketplace
  - service_vendor: Task-only, cannot publish marketplace items
  - hybrid_vendor: Can publish products + promo + receive service tasks
"""


def classify_vendor_role(capability_type: str) -> str:
    """Derive vendor_role from capability_type selection."""
    cap = (capability_type or "").lower()
    if cap in ("products", "product"):
        return "product_vendor"
    if cap in ("promotional_materials", "promo", "promotional"):
        return "promo_vendor"
    if cap in ("services", "service"):
        return "service_vendor"
    if cap in ("multi", "hybrid", "both", "product_and_promo"):
        return "hybrid_vendor"
    return "service_vendor"


def can_publish_marketplace_items(vendor_role: str) -> bool:
    """Only product/promo/hybrid vendors can publish to the marketplace."""
    return vendor_role in ("product_vendor", "promo_vendor", "hybrid_vendor")


def get_vendor_permissions(vendor_role: str) -> dict:
    """Return full permission set for a vendor role."""
    role = vendor_role or "service_vendor"
    return {
        "vendor_role": role,
        "can_publish_products": role in ("product_vendor", "hybrid_vendor"),
        "can_publish_promo": role in ("promo_vendor", "hybrid_vendor"),
        "can_publish_services": role in ("service_vendor", "hybrid_vendor"),
        "can_receive_service_tasks": role in ("service_vendor", "hybrid_vendor"),
        "can_access_marketplace_upload": can_publish_marketplace_items(role),
        "marketplace_label": _get_marketplace_label(role),
    }


def _get_marketplace_label(vendor_role: str) -> str:
    labels = {
        "product_vendor": "Product Marketplace Vendor",
        "promo_vendor": "Promotional Materials Vendor",
        "service_vendor": "Service Provider (task-only)",
        "hybrid_vendor": "Full Capability Vendor",
    }
    return labels.get(vendor_role, "Vendor")
