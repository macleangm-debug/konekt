"""
Launch Readiness Report Routes
Generate JSON and PDF reports for go-live certification
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import jwt
from motor.motor_asyncio import AsyncIOMotorClient
from launch_readiness_pdf_service import build_launch_readiness_pdf

router = APIRouter(prefix="/api/admin/launch-report", tags=["Launch Report"])
security = HTTPBearer(auto_error=False)

# Database connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')


async def get_admin_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Verify admin user - supports both Bearer token and query param token"""
    token = None
    
    # Try Authorization header first
    if credentials:
        token = credentials.credentials
    else:
        # Try query param token (for PDF downloads via window.open)
        token = request.query_params.get("token")
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        role = user.get("role", "customer")
        if role not in ["admin", "super_admin"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def build_report_data():
    """Build comprehensive launch readiness report data"""
    counts = {
        "users": await db.users.count_documents({}),
        "products": await db.products.count_documents({}),
        "inventory_variants": await db.inventory_variants.count_documents({}),
        "orders": await db.orders.count_documents({}),
        "quotes": await db.quotes_v2.count_documents({}),
        "invoices": await db.invoices.count_documents({}),
        "payments": await db.central_payments.count_documents({}),
        "creative_services": await db.creative_services.count_documents({}),
        "creative_projects": await db.creative_service_orders.count_documents({}),
        "hero_banners": await db.hero_banners.count_documents({}),
        "affiliates": await db.affiliates.count_documents({}),
        "warehouses": await db.warehouses.count_documents({}),
    }

    # Check company settings
    company_settings = await db.company_settings.find_one({}) or {}
    
    checks = {
        "has_products": counts["products"] > 0,
        "has_variants": counts["inventory_variants"] > 0,
        "has_creative_services": counts["creative_services"] > 0,
        "has_banners": counts["hero_banners"] > 0,
        "has_warehouses": counts["warehouses"] > 0,
        "has_company_name": bool(company_settings.get("company_name")),
        "has_tax_config": bool(company_settings.get("tax_rate") or company_settings.get("vat_rate")),
        "has_currency": bool(company_settings.get("currency")),
    }

    ready_score = sum(1 for v in checks.values() if v)
    max_score = len(checks)

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "counts": counts,
        "checks": checks,
        "ready_score": ready_score,
        "max_score": max_score,
        "status": "ready" if ready_score == max_score else "needs_attention",
        "manual_checklist": [
            "Confirm live KwikPay credentials and webhook endpoint",
            "Confirm bank transfer details in settings",
            "Confirm company logo, TIN, BRN, address, and tax setup",
            "Confirm at least one product has stock-tracked variants",
            "Confirm hero banner and client banner content",
            "Confirm creative services and add-ons pricing",
            "Confirm referral settings and affiliate commission rules",
            "Test quote → order → invoice → payment → statement flow",
            "Test customer dashboard and creative project workflow",
            "Verify production deployment, SSL certificates, and backups",
            "Configure monitoring and alerting systems",
            "Document API keys and environment variables",
        ],
    }


@router.get("/json")
async def get_launch_report_json(user: dict = Depends(get_admin_user)):
    """Get launch readiness report as JSON"""
    return await build_report_data()


@router.get("/pdf")
async def get_launch_report_pdf(user: dict = Depends(get_admin_user)):
    """Get launch readiness report as PDF"""
    report = await build_report_data()
    pdf_buffer = build_launch_readiness_pdf(report)

    filename = f"konekt-launch-readiness-{datetime.utcnow().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )
