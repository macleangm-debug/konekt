"""
Performance Governance Service — Centralized CRUD for performance thresholds,
weights, sample sizes, and zone definitions.

Admin configures once; sales_performance_service and vendor_performance_service
read from this single source of truth.
"""
from datetime import datetime, timezone

# Default settings (used when no DB record exists yet)
DEFAULT_SETTINGS = {
    "sales": {
        "weights": {
            "customer_rating": 0.30,
            "conversion_rate": 0.25,
            "revenue_contribution": 0.20,
            "response_speed": 0.15,
            "follow_up_compliance": 0.10,
        },
        "thresholds": {"excellent": 85, "safe": 70, "risk": 50},
        "min_sample_size": 5,
    },
    "vendor": {
        "weights": {
            "timeliness": 0.25,
            "quality": 0.25,
            "responsiveness": 0.20,
            "rating": 0.20,
            "compliance": 0.10,
        },
        "thresholds": {"excellent": 85, "safe": 70, "risk": 50},
        "min_sample_size": 3,
    },
}


async def get_performance_settings(db):
    """Get current performance governance settings. Falls back to defaults."""
    doc = await db.performance_governance.find_one(
        {"key": "settings"},
        {"_id": 0}
    )
    if doc:
        return doc
    # Return defaults if no configuration exists
    return {
        "key": "settings",
        "sales": DEFAULT_SETTINGS["sales"],
        "vendor": DEFAULT_SETTINGS["vendor"],
        "updated_at": None,
        "updated_by": None,
    }


async def update_performance_settings(db, data: dict, admin_name: str = ""):
    """Update performance governance settings. Validates and persists."""
    now = datetime.now(timezone.utc).isoformat()

    existing = await db.performance_governance.find_one({"key": "settings"})

    update_payload = {"updated_at": now, "updated_by": admin_name}

    # Merge sales settings if provided
    if "sales" in data:
        sales = data["sales"]
        update_payload["sales"] = _validate_role_settings(sales, DEFAULT_SETTINGS["sales"])

    # Merge vendor settings if provided
    if "vendor" in data:
        vendor = data["vendor"]
        update_payload["vendor"] = _validate_role_settings(vendor, DEFAULT_SETTINGS["vendor"])

    if existing:
        # Preserve fields not being updated
        if "sales" not in update_payload:
            update_payload["sales"] = existing.get("sales", DEFAULT_SETTINGS["sales"])
        if "vendor" not in update_payload:
            update_payload["vendor"] = existing.get("vendor", DEFAULT_SETTINGS["vendor"])
        await db.performance_governance.update_one(
            {"key": "settings"},
            {"$set": update_payload}
        )
    else:
        update_payload["key"] = "settings"
        if "sales" not in update_payload:
            update_payload["sales"] = DEFAULT_SETTINGS["sales"]
        if "vendor" not in update_payload:
            update_payload["vendor"] = DEFAULT_SETTINGS["vendor"]
        await db.performance_governance.insert_one(update_payload)

    # Log the change
    await db.performance_governance_audit.insert_one({
        "action": "settings_updated",
        "changed_by": admin_name,
        "changes": data,
        "created_at": now,
    })

    return await get_performance_settings(db)


def _validate_role_settings(incoming: dict, defaults: dict) -> dict:
    """Validate and normalize role-specific settings."""
    result = {}

    # Weights: must sum to ~1.0, each 0-1
    if "weights" in incoming:
        weights = incoming["weights"]
        validated_weights = {}
        for key, default_val in defaults["weights"].items():
            val = weights.get(key, default_val)
            validated_weights[key] = max(0, min(1, float(val)))
        # Normalize to sum=1.0
        total = sum(validated_weights.values())
        if total > 0:
            validated_weights = {k: round(v / total, 2) for k, v in validated_weights.items()}
        result["weights"] = validated_weights
    else:
        result["weights"] = defaults["weights"]

    # Thresholds: excellent > safe > risk, each 0-100
    if "thresholds" in incoming:
        t = incoming["thresholds"]
        excellent = max(0, min(100, int(t.get("excellent", defaults["thresholds"]["excellent"]))))
        safe = max(0, min(100, int(t.get("safe", defaults["thresholds"]["safe"]))))
        risk = max(0, min(100, int(t.get("risk", defaults["thresholds"]["risk"]))))
        # Enforce ordering
        if safe >= excellent:
            safe = excellent - 1
        if risk >= safe:
            risk = safe - 1
        result["thresholds"] = {"excellent": excellent, "safe": safe, "risk": risk}
    else:
        result["thresholds"] = defaults["thresholds"]

    # Min sample size: 1-100
    if "min_sample_size" in incoming:
        result["min_sample_size"] = max(1, min(100, int(incoming["min_sample_size"])))
    else:
        result["min_sample_size"] = defaults["min_sample_size"]

    return result
