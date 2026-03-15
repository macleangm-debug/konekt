"""
Attribution Capture Service
Shared helpers for extracting, hydrating, and building attribution blocks
Used by signup, order, quote, invoice creation
"""
from datetime import datetime


def extract_attribution_from_payload(payload: dict):
    """Extract attribution fields from any payload"""
    return {
        "affiliate_code": payload.get("affiliate_code"),
        "affiliate_email": payload.get("affiliate_email"),
        "affiliate_name": payload.get("affiliate_name"),
        "campaign_id": payload.get("campaign_id"),
        "campaign_name": payload.get("campaign_name"),
        "campaign_discount": float(payload.get("campaign_discount", 0) or 0),
    }


async def hydrate_affiliate_from_code(db, attribution: dict):
    """Look up affiliate by code and populate email/name"""
    affiliate_code = attribution.get("affiliate_code")
    if not affiliate_code:
        return attribution

    affiliate = await db.affiliates.find_one(
        {"promo_code": affiliate_code, "status": "active"}
    )
    if not affiliate:
        return attribution

    attribution["affiliate_email"] = affiliate.get("email")
    attribution["affiliate_name"] = affiliate.get("name")
    return attribution


def build_attribution_block(attribution: dict):
    """Build a standard attribution block for document storage"""
    return {
        "affiliate_code": attribution.get("affiliate_code"),
        "affiliate_email": attribution.get("affiliate_email"),
        "affiliate_name": attribution.get("affiliate_name"),
        "campaign_id": attribution.get("campaign_id"),
        "campaign_name": attribution.get("campaign_name"),
        "campaign_discount": float(attribution.get("campaign_discount", 0) or 0),
        "attribution_captured_at": datetime.utcnow(),
    }


def inherit_attribution_from_document(source_doc: dict):
    """Inherit attribution from a source document (e.g., quote -> invoice)"""
    return {
        "affiliate_code": source_doc.get("affiliate_code"),
        "affiliate_email": source_doc.get("affiliate_email"),
        "affiliate_name": source_doc.get("affiliate_name"),
        "campaign_id": source_doc.get("campaign_id"),
        "campaign_name": source_doc.get("campaign_name"),
        "campaign_discount": float(source_doc.get("campaign_discount", 0) or 0),
        "attribution_captured_at": source_doc.get("attribution_captured_at") or datetime.utcnow(),
    }
