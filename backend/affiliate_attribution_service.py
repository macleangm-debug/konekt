"""
Affiliate Attribution Service
Attach affiliate code to documents for tracking
"""
from datetime import datetime


async def get_affiliate_by_code(db, code: str):
    """Get active affiliate by promo code"""
    if not code:
        return None
    return await db.affiliates.find_one({"promo_code": code, "status": "active"})


async def attach_affiliate_to_document(db, *, collection_name: str, document_id, promo_code: str):
    """
    Attach affiliate attribution to a document (quote, invoice, order, etc.)
    Call this when creating documents if an affiliate code is present.
    """
    affiliate = await get_affiliate_by_code(db, promo_code)
    if not affiliate:
        return None

    await db[collection_name].update_one(
        {"_id": document_id},
        {
            "$set": {
                "affiliate_code": promo_code,
                "affiliate_email": affiliate.get("email"),
                "affiliate_name": affiliate.get("name"),
                "affiliate_attached_at": datetime.utcnow(),
            }
        },
    )
    return affiliate


async def get_affiliate_from_document(db, *, collection_name: str, document_id):
    """Get affiliate info from an existing document"""
    from bson import ObjectId
    doc = await db[collection_name].find_one({"_id": ObjectId(document_id)})
    if not doc:
        return None
    
    return {
        "affiliate_code": doc.get("affiliate_code"),
        "affiliate_email": doc.get("affiliate_email"),
        "affiliate_name": doc.get("affiliate_name"),
    }
