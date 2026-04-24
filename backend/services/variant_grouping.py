"""
Canonical variant grouping for marketplace products.

Groups SKU-level rows that share a canonical base name into a single card with
a `variants: [...]` array. Handles:

    "Crystal Trophy - Small" / "- Medium" / "- Large"
    "Hoodie - Navy Blue - Medium"
    "Black Laminated Gift Bags Landscape (L)"
    "Cooltex Polo - Maroon - XXLarge" / "- X Large"
    "T.Blue 2XL" / "T.Blue Small"         (no " - " separator)
    "Indigo Blue 1 XL" / "Yellow Medium"   (space-separated size)
    "Reflective Jackets Green Black- XXL"  (dash with no spaces)

Grouping happens at query time — the DB isn't mutated. Cart/checkout still
reference the exact variant product_id.
"""
from __future__ import annotations
import re
from typing import List, Dict, Any, Tuple, Optional

# ---- Variant-token vocabulary (all lowercase, longer forms first) ----

# Sizes — normalised lowercase forms. Matched in order so longer forms win first.
_SIZE_TOKENS: List[str] = [
    # Numbered XL variants
    "5x-large", "5x large", "5xlarge", "5xl", "5 xl",
    "4x-large", "4x large", "4xlarge", "4xl", "4 xl",
    "3x-large", "3x large", "3xlarge", "3xl", "3 xl",
    "2x-large", "2x large", "2xlarge", "2xl", "2 xl",
    "1x-large", "1x large", "1xlarge", "1xl", "1 xl",
    # XXX / XX
    "xxx-large", "xxx large", "xxxlarge",
    "xx-large", "xx large", "xxlarge", "xxl",
    "x-large", "x large", "xlarge", "xl",
    "x-small", "x small", "xsmall", "xs",
    # Standard sizes
    "extra large", "extra small",
    "large", "medium", "small",
    "lg", "md", "sm",
    "l", "m", "s",
]

# Colour vocabulary (lowercase, longest forms first for correct stripping).
_COLOUR_TOKENS: List[str] = sorted([
    "t.blue", "t blue",
    "navy blue", "navy", "dark blue", "royal blue", "royal bue", "light blue", "sky blue",
    "indigo blue", "indigo",
    "light green", "dark green", "forest green", "olive green", "lime",
    "light grey", "dark grey", "light gray", "dark gray", "charcoal", "silver",
    "golden yellow", "mustard yellow",
    "rose gold", "hot pink", "light pink", "baby pink",
    "bordeaux", "burgundy", "maroon", "wine",
    "turquoise", "cyan", "teal", "aqua",
    "fuchsia", "magenta", "lavender", "violet", "purple",
    "beige", "cream", "tan", "ivory",
    "gold", "bronze", "copper",
    "black", "white", "grey", "gray", "brown", "blue", "green", "yellow",
    "red", "pink", "orange",
], key=len, reverse=True)

# Parenthetical markers: (L), (M), (S), (XL), (Large)
_PAREN_SIZE_RE = re.compile(
    r"\s*\(\s*(xxxl|xxl|xl|xs|l|m|s|large|medium|small|xlarge|xxlarge|"
    r"landscape|portrait|[1-5]xl|[1-5]\s*xl)\s*\)\s*$",
    re.IGNORECASE,
)
# Trailing measurement like "45cm", "500 ml", etc.
_MEASUREMENT_RE = re.compile(r"\s*-?\s*(\d{1,4})\s*(cm|mm|ml|g|kg|oz|inch|in|\"|')\s*$", re.IGNORECASE)

# Any trailing `-` or ` - ` or just ` ` separator (captures dash-no-space cases)
_TAIL_SPLIT_RE = re.compile(r"(.+?)\s*[-]?\s*$")


def _ends_with_token(s: str, token: str) -> bool:
    """True iff `s` ends with `token` (case-insensitive, word-bounded)."""
    pat = re.compile(r"(?:^|[\s\-])" + re.escape(token) + r"$", re.IGNORECASE)
    return bool(pat.search(s))


def _strip_suffix_token(s: str, token: str) -> str:
    """Strip trailing `token` (with any preceding separator) from `s`."""
    pat = re.compile(r"\s*[-]?\s*" + re.escape(token) + r"\s*$", re.IGNORECASE)
    return pat.sub("", s).strip(" -")


def _strip_one_variant_axis(name: str) -> Tuple[str, Optional[str], str]:
    """Strip ONE trailing variant axis.

    Returns (stripped_name, token_string, axis_type) where axis_type is one of:
        "size", "color", "measurement", "paren", or "" (nothing found).
    """
    s = name.strip()
    if not s:
        return s, None, ""

    # 1. Parenthetical marker — highest confidence
    m = _PAREN_SIZE_RE.search(s)
    if m:
        token = m.group(1)
        return s[: m.start()].strip().rstrip("-").strip(), token, "paren"

    # 2. Measurement (e.g. "45cm")
    m2 = _MEASUREMENT_RE.search(s)
    if m2:
        return s[: m2.start()].strip().rstrip("-").strip(), m2.group(0).strip(" -"), "measurement"

    # 3. Size token at end (preceded by space or dash)
    for size_tok in _SIZE_TOKENS:
        if _ends_with_token(s, size_tok):
            # Keep the original case in the token string
            pat = re.compile(r"(?:^|([\s\-])+)(" + re.escape(size_tok) + r")$", re.IGNORECASE)
            m3 = pat.search(s)
            if m3:
                original = m3.group(2)
                stripped = _strip_suffix_token(s, size_tok)
                if stripped:  # never return empty canonical
                    return stripped, original, "size"

    # 4. Colour token at end
    for col in _COLOUR_TOKENS:
        if _ends_with_token(s, col):
            pat = re.compile(r"(?:^|([\s\-])+)(" + re.escape(col) + r")$", re.IGNORECASE)
            m4 = pat.search(s)
            if m4:
                original = m4.group(2)
                stripped = _strip_suffix_token(s, col)
                if stripped:
                    return stripped, original, "color"

    return s, None, ""


def canonicalize_name(name: str) -> Tuple[str, Dict[str, str]]:
    """Extract canonical base name + variant axes.

    Rules (in priority order):
      1. If the name ends in a SIZE token, strip it. Keep everything else
         (including any colour) as part of the canonical base name.
         → "Cooltex Polo - Maroon - Large"   →  base="Cooltex Polo - Maroon", size="Large"
         → "Crystal Trophy - Small"          →  base="Crystal Trophy",        size="Small"
         → "T.Blue 2XL"                      →  base="T.Blue",                size="2XL"
      2. Otherwise, if it ends in a COLOUR token, strip the colour
         (these are colour-only variant families).
         → "2026 Diary - Brown"              →  base="2026 Diary",            color="Brown"
      3. Otherwise return the name unchanged.

    Crucially we NEVER strip both axes in a single name — colour survives when
    size is present so "Cooltex Polo - Maroon" and "Cooltex Polo - Yellow"
    remain distinct cards (each with size variants).
    """
    axes: Dict[str, str] = {}
    current = name.strip()

    # Pass 1: try to strip a SIZE axis (including parenthetical / measurement markers)
    stripped, token, vtype = _strip_one_variant_axis(current)
    if token is not None and vtype in ("size", "paren", "measurement"):
        axes["size"] = token
        return stripped, axes

    # Pass 2: no size found → try to strip a COLOUR axis
    if token is not None and vtype == "color":
        axes["color"] = token
        return stripped, axes

    return current, axes


# ---- Grouping ----

_SIZE_ORDER: Dict[str, int] = {
    "xs": 1, "x small": 1, "x-small": 1, "xsmall": 1, "extra small": 1,
    "s": 2, "sm": 2, "small": 2,
    "m": 3, "md": 3, "medium": 3,
    "l": 4, "lg": 4, "large": 4,
    "xl": 5, "xlarge": 5, "x large": 5, "x-large": 5, "extra large": 5,
    "xxl": 6, "xxlarge": 6, "xx large": 6, "xx-large": 6,
    "xxxl": 7, "xxxlarge": 7, "xxx large": 7, "xxx-large": 7,
    "1xl": 5, "1 xl": 5,
    "2xl": 6, "2 xl": 6,
    "3xl": 7, "3 xl": 7,
    "4xl": 8, "4 xl": 8,
    "5xl": 9, "5 xl": 9,
}


def _variant_sort_key(v: Dict[str, Any]) -> Tuple:
    size = str(v.get("_axis_size", "")).lower().strip()
    colour = str(v.get("_axis_color", "")).lower().strip()
    return (_SIZE_ORDER.get(size, 99), colour, v.get("name", ""))


def group_products_by_canonical(products: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Collapse SKU-level products into canonical products with a variants array."""
    buckets: Dict[str, List[Dict[str, Any]]] = {}
    bucket_order: List[str] = []

    for p in products:
        canonical, axes = canonicalize_name(p.get("name", ""))
        # Group by canonical name + category_id + vendor_id so coincidental
        # name matches across categories/vendors don't merge.
        key = "||".join([
            canonical.lower(),
            str(p.get("category_id", "") or p.get("category", "")),
            str(p.get("group_id", "") or ""),
            str(p.get("vendor_id", "") or p.get("partner_id", "") or ""),
        ])
        enriched = {**p, "_axis_size": axes.get("size", ""), "_axis_color": axes.get("color", "")}
        if key not in buckets:
            buckets[key] = []
            bucket_order.append(key)
        buckets[key].append(enriched)

    out: List[Dict[str, Any]] = []
    for key in bucket_order:
        group = buckets[key]
        if len(group) == 1:
            p = group[0]
            p.pop("_axis_size", None)
            p.pop("_axis_color", None)
            out.append(p)
            continue

        group.sort(key=_variant_sort_key)
        rep = min(
            group,
            key=lambda v: float(v.get("customer_price") or v.get("base_price") or v.get("price") or 0) or 1e18,
        )
        canonical_name, _ = canonicalize_name(rep.get("name", ""))

        variants: List[Dict[str, Any]] = []
        colours_seen: Dict[str, Dict[str, Any]] = {}
        sizes_seen: Dict[str, Dict[str, Any]] = {}
        for v in group:
            size = v.get("_axis_size") or ""
            colour = v.get("_axis_color") or ""
            variants.append({
                "id": v.get("id"),
                "name": v.get("name"),
                "size": size,
                "color": colour,
                "image_url": v.get("image_url") or "",
                "customer_price": v.get("customer_price") or v.get("price") or v.get("base_price") or 0,
                "base_price": v.get("base_price") or 0,
                "stock": v.get("stock", 0),
                "sku": v.get("sku") or "",
            })
            if colour and colour.lower() not in colours_seen:
                colours_seen[colour.lower()] = {"value": colour, "image_url": v.get("image_url") or ""}
            if size and size.lower() not in sizes_seen:
                sizes_seen[size.lower()] = {"value": size}

        canonical = {
            **rep,
            "name": canonical_name,
            "variant_count": len(variants),
            "variants": variants,
            "variant_colors": list(colours_seen.values()),
            "variant_sizes": list(sizes_seen.values()),
            "price_from": min((v["customer_price"] or 0) for v in variants),
            "price_to": max((v["customer_price"] or 0) for v in variants),
        }
        canonical.pop("_axis_size", None)
        canonical.pop("_axis_color", None)
        out.append(canonical)

    return out
