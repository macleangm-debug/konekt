from fastapi import APIRouter, Request, HTTPException

router = APIRouter(prefix="/api/instant-quote", tags=["Instant Quote Engine"])

DEFAULT_SETTINGS = {
    "minimum_company_margin_percent": 20,
    "distribution_buffer_percent": 10,
    "vat_percent": 18,
}

async def _settings(db):
    row = await db.platform_settings.find_one({"key": "commercial_rules"})
    if row and row.get("value"):
        return {
            "minimum_company_margin_percent": float(row["value"].get("minimum_company_margin_percent", 20) or 20),
            "distribution_buffer_percent": float(row["value"].get("distribution_buffer_percent", 10) or 10),
            "vat_percent": float(row["value"].get("vat_percent", 18) or 18),
        }
    return DEFAULT_SETTINGS

def _safe_quote_from_base(base_amount: float, minimum_margin_percent: float, distribution_buffer_percent: float, vat_percent: float):
    company_margin = base_amount * (minimum_margin_percent / 100.0)
    distribution_buffer = base_amount * (distribution_buffer_percent / 100.0)
    subtotal = base_amount + company_margin + distribution_buffer
    vat_amount = subtotal * (vat_percent / 100.0)
    total = subtotal + vat_amount
    return {
        "base_amount": round(base_amount, 2),
        "company_margin_amount": round(company_margin, 2),
        "distribution_buffer_amount": round(distribution_buffer, 2),
        "subtotal_amount": round(subtotal, 2),
        "vat_amount": round(vat_amount, 2),
        "total_amount": round(total, 2),
    }

@router.post("/preview")
async def instant_quote_preview(payload: dict, request: Request):
    db = request.app.mongodb
    settings = await _settings(db)
    base_amount = float(payload.get("base_amount", 0) or 0)
    if base_amount <= 0:
        raise HTTPException(status_code=400, detail="base_amount must be greater than zero")
    result = _safe_quote_from_base(
        base_amount=base_amount,
        minimum_margin_percent=settings["minimum_company_margin_percent"],
        distribution_buffer_percent=settings["distribution_buffer_percent"],
        vat_percent=settings["vat_percent"],
    )
    return {
        "ok": True,
        "estimate": result,
        "rules": settings,
        "explanation": {
            "margin_rule": f'Company minimum margin: {settings["minimum_company_margin_percent"]}%',
            "distribution_rule": f'Distribution buffer: {settings["distribution_buffer_percent"]}%',
            "vat_rule": f'VAT: {settings["vat_percent"]}%',
        }
    }

@router.get("/product/{product_id}")
async def product_quote_preview(product_id: str, request: Request):
    db = request.app.mongodb
    product = await db.products.find_one({"id": product_id}) or await db.products.find_one({"slug": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    settings = await _settings(db)
    base_amount = float(product.get("base_price", product.get("price", 0)) or 0)
    result = _safe_quote_from_base(
        base_amount=base_amount,
        minimum_margin_percent=settings["minimum_company_margin_percent"],
        distribution_buffer_percent=settings["distribution_buffer_percent"],
        vat_percent=settings["vat_percent"],
    )
    return {"ok": True, "product_name": product.get("name", "Product"), "estimate": result, "rules": settings}

@router.post("/service-preview")
async def service_quote_preview(payload: dict, request: Request):
    db = request.app.mongodb
    settings = await _settings(db)
    requirement_score = float(payload.get("requirement_score", 1) or 1)
    base_amount = float(payload.get("base_amount", 0) or 0)
    if base_amount <= 0:
        raise HTTPException(status_code=400, detail="base_amount must be greater than zero")
    adjusted_base = base_amount * max(requirement_score, 1)
    result = _safe_quote_from_base(
        base_amount=adjusted_base,
        minimum_margin_percent=settings["minimum_company_margin_percent"],
        distribution_buffer_percent=settings["distribution_buffer_percent"],
        vat_percent=settings["vat_percent"],
    )
    return {"ok": True, "estimate": result, "rules": settings}
