"""
Product Image Processing Pipeline
Handles: crop, WebP conversion, generate size variants (thumbnail, card, detail).
"""
import os
import io
import logging
from uuid import uuid4
from PIL import Image

logger = logging.getLogger("image_pipeline")

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = str(BASE_DIR / "uploads" / "product_images")
os.makedirs(UPLOAD_DIR, exist_ok=True)

VARIANTS = {
    "thumbnail": {"size": (200, 200), "quality": 75},
    "card": {"size": (600, 600), "quality": 80},
    "detail": {"size": (1200, 1200), "quality": 85},
}


def process_product_image(file_bytes: bytes, filename: str, crop_data: dict = None) -> dict:
    """
    Process a product image: optional crop, WebP conversion, generate variants.
    
    Args:
        file_bytes: Raw image bytes
        filename: Original filename
        crop_data: Optional {x, y, width, height} for cropping (percentages 0-1 or pixels)
    
    Returns:
        dict with paths for each variant + original
    """
    try:
        img = Image.open(io.BytesIO(file_bytes))
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGB")
    except Exception as e:
        raise ValueError(f"Invalid image file: {e}")

    if crop_data:
        w, h = img.size
        cx = int(crop_data.get("x", 0))
        cy = int(crop_data.get("y", 0))
        cw = int(crop_data.get("width", w))
        ch = int(crop_data.get("height", h))
        if cx >= 0 and cy >= 0 and cw > 0 and ch > 0:
            img = img.crop((cx, cy, cx + cw, cy + ch))

    image_id = str(uuid4())[:12]
    results = {"image_id": image_id, "variants": {}}

    original_path = os.path.join(UPLOAD_DIR, f"{image_id}_original.webp")
    img.save(original_path, "WEBP", quality=90)
    results["original"] = f"/uploads/product_images/{image_id}_original.webp"

    for variant_name, config in VARIANTS.items():
        target_size = config["size"]
        quality = config["quality"]

        variant_img = img.copy()
        variant_img.thumbnail(target_size, Image.LANCZOS)

        canvas = Image.new("RGB", target_size, (255, 255, 255))
        offset = ((target_size[0] - variant_img.width) // 2, (target_size[1] - variant_img.height) // 2)
        canvas.paste(variant_img, offset)

        variant_path = os.path.join(UPLOAD_DIR, f"{image_id}_{variant_name}.webp")
        canvas.save(variant_path, "WEBP", quality=quality)
        results["variants"][variant_name] = f"/uploads/product_images/{image_id}_{variant_name}.webp"

    return results


def validate_image_file(file_bytes: bytes, max_size_mb: int = 10) -> tuple:
    """Validate image file. Returns (is_valid, error_message)."""
    if len(file_bytes) > max_size_mb * 1024 * 1024:
        return False, f"Image exceeds {max_size_mb}MB limit"
    try:
        img = Image.open(io.BytesIO(file_bytes))
        img.verify()
        return True, ""
    except Exception as e:
        return False, f"Invalid image: {e}"
