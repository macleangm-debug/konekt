"""
Canonical variant grouping for marketplace products.

Many Darcity-imported products are individual SKUs that really represent
*variants* of a single canonical product:

    "Crystal Trophy - Small" / "- Medium" / "- Large"
    "Hoodie - Navy Blue - Medium" / "- Large"
    "Black Laminated Gift Bags Landscape (L)" / "(M)" / "(S)"
    "Timeless Polo Tshirt - Grey - 3X Large"

This module groups those SKUs so the marketplace can render ONE card per
canonical product with a `variants: [...]` array, instead of 3-18 near-duplicates.

We DON'T mutate the DB — grouping happens at query time. Each variant remains
its own SKU row; cart/checkout still reference the exact product_id.
"""
from __future__ import annotations
import re
from typing import List, Dict, Any, Tuple, Optional

# Known size tokens — ordered so longer matches win first
SIZE_TOKENS = [
    "5x large", "5xl", "5x-large",
    "4x large", "4xl", "4x-large",
    "3x large", "3xl", "3x-large",
    "xx-large", "xxl", "x-large", "xl",
    "large", "l",
    "medium", "m",
    "small", "s",
    "extra large", "extra small",
]

# Common colour tokens (case-insensitive). Keep a compact, high-coverage list.
COLOUR_TOKENS = {
    "black", "white", "red", "blue", "navy", "navy blue", "dark blue",
    "royal blue", "royal bue", "light blue", "sky blue", "turquoise",
    "green", "dark green", "light green", "lime", "olive",
    "yellow", "golden yellow", "mustard", "orange",
    "grey", "gray", "light grey", "dark grey", "silver", "charcoal",
    "brown", "beige", "cream", "tan",
    "pink", "hot pink", "light pink", "fuchsia", "magenta",
    "purple", "lavender", "violet",
    "maroon", "burgundy", "wine",
    "gold", "rose gold",
}

# (L) / (M) / (S) / (XL) parenthetical size markers
_PAREN_SIZE_RE = re.compile(r"\s*\(\s*(xxxl|xxl|xl|l|m|s|large|medium|small|landscape|portrait)\s*\)\s*$", re.IGNORECASE)
# Trailing measurement like "45cm", "50 cm"
_MEASUREMENT_RE = re.compile(r"\s*-?\s*(\d{1,4})\s*(cm|mm|ml|l|g|kg|oz|inch|in|\"|')\s*$", re.IGNORECASE)


def _strip_trailing_variant_token(name: str) -> Tuple[str, Optional[str], str]:
    """Strip ONE trailing variant token from the name.

    Returns (stripped_name, variant_token_found, variant_type).
    variant_type ∈ {"size","color","measurement","paren","unknown"}.

    Returns (name, None, "") if nothing matched.
    """
    s = name.strip()

    # 1. Parenthetical markers: (L), (M), (Landscape)
    m = _PAREN_SIZE_RE.search(s)
    if m:
        token = m.group(1)
        return s[: m.start()].strip().rstrip("-").strip(), token, "paren"

    # 2. Trailing " - <variant>"
    if " - " in s:
        base, tail = s.rsplit(" - ", 1)
        tail_lower = tail.strip().lower()

        # Measurement like "45cm"
        mm = _MEASUREMENT_RE.match(" " + tail)
        if mm:
            return base.strip(), tail.strip(), "measurement"

        # Size token
        for st in SIZE_TOKENS:
            if tail_lower == st:
                return base.strip(), tail.strip(), "size"

        # Colour token
        if tail_lower in COLOUR_TOKENS:
            return base.strip(), tail.strip(), "color"

        # Fallback: if tail is a short (≤3 words, ≤20 chars) alphanumeric token, treat as unknown variant
        if len(tail.split()) <= 3 and len(tail) <= 24:
            return base.strip(), tail.strip(), "unknown"

    # 3. Nothing to strip
    return s, None, ""


def canonicalize_name(name: str) -> Tuple[str, Dict[str, str]]:
    """Extract canonical base name + variant axes (size/color/measurement).

    Recursively strips up to 2 trailing variant tokens.
    Returns (canonical_name, {"size":"Large", "color":"Navy Blue", ...}).
    """
    axes: Dict[str, str] = {}
    current = name.strip()
    for _ in range(2):  # support 2-axis variants (e.g. Hoodie - Navy - Large)
        stripped, token, vtype = _strip_trailing_variant_token(current)
        if token is None:
            break
        if vtype in ("size", "paren", "measurement") and "size" not in axes:
            axes["size"] = token
        elif vtype == "color" and "color" not in axes:
            axes["color"] = token
        elif "variant" not in axes and vtype == "unknown":
            axes["variant"] = token
        else:
            # Axis already taken — stop here, don't over-strip
            break
        current = stripped
    return current, axes


def _variant_sort_key(v: Dict[str, Any]) -> Tuple:
    """Sort variants: by size (S<M<L<XL…), then color, then name."""
    size_order = {
        "small": 1, "s": 1,
        "medium": 2, "m": 2,
        "large": 3, "l": 3,
        "x-large": 4, "xl": 4, "x large": 4, "extra large": 4,
        "xx-large": 5, "xxl": 5,
        "3xl": 6, "3x large": 6, "3x-large": 6,
        "4xl": 7, "4x large": 7, "4x-large": 7,
        "5xl": 8, "5x large": 8, "5x-large": 8,
    }
    size = str(v.get("_axis_size", "")).lower().strip()
    color = str(v.get("_axis_color", "")).lower().strip()
    return (size_order.get(size, 99), color, v.get("name", ""))


def group_products_by_canonical(products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Collapse SKU-level products into canonical products with a variants array.

    Only groups products that share the SAME canonical name AND the same
    category_id / group_id / vendor_id (so unrelated products with coincidentally
    similar names aren't merged).
    """
    buckets: Dict[str, List[Dict[str, Any]]] = {}
    bucket_order: List[str] = []  # preserve first-seen order

    for p in products:
        canonical, axes = canonicalize_name(p.get("name", ""))
        key = "||".join([
            canonical.lower(),
            str(p.get("category_id", "") or p.get("category", "")),
            str(p.get("group_id", "") or ""),
            str(p.get("vendor_id", "") or p.get("partner_id", "") or ""),
        ])
        # Attach axes to the product for later sorting / selector rendering
        enriched = {**p, "_axis_size": axes.get("size", ""), "_axis_color": axes.get("color", "")}
        if key not in buckets:
            buckets[key] = []
            bucket_order.append(key)
        buckets[key].append(enriched)

    out: List[Dict[str, Any]] = []
    for key in bucket_order:
        group = buckets[key]
        if len(group) == 1:
            # Single product — no variants
            p = group[0]
            p.pop("_axis_size", None)
            p.pop("_axis_color", None)
            out.append(p)
            continue

        # Multiple SKUs → canonical card with variants array
        group.sort(key=_variant_sort_key)
        # Use lowest-priced variant as the "representative" (for price display)
        rep = min(
            group,
            key=lambda v: float(v.get("customer_price") or v.get("base_price") or v.get("price") or 0) or 1e18,
        )
        canonical_name, _ = canonicalize_name(rep.get("name", ""))
        # Build variants array (lean payload — only what the UI needs)
        variants = []
        colors_seen: Dict[str, Dict[str, Any]] = {}
        sizes_seen: Dict[str, Dict[str, Any]] = {}
        for v in group:
            size = v.get("_axis_size") or ""
            color = v.get("_axis_color") or ""
            variants.append({
                "id": v.get("id"),
                "name": v.get("name"),
                "size": size,
                "color": color,
                "image_url": v.get("image_url") or "",
                "customer_price": v.get("customer_price") or v.get("price") or v.get("base_price") or 0,
                "base_price": v.get("base_price") or 0,
                "stock": v.get("stock", 0),
                "sku": v.get("sku") or "",
            })
            if color and color.lower() not in colors_seen:
                colors_seen[color.lower()] = {"value": color, "image_url": v.get("image_url") or ""}
            if size and size.lower() not in sizes_seen:
                sizes_seen[size.lower()] = {"value": size}

        canonical = {
            **rep,
            "name": canonical_name,
            "variant_count": len(variants),
            "variants": variants,
            "variant_colors": list(colors_seen.values()),
            "variant_sizes": list(sizes_seen.values()),
            "price_from": min((v["customer_price"] or 0) for v in variants),
            "price_to": max((v["customer_price"] or 0) for v in variants),
        }
        canonical.pop("_axis_size", None)
        canonical.pop("_axis_color", None)
        out.append(canonical)

    return out
