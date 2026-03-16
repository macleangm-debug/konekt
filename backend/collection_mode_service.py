"""
Collection Mode Service
Canonical collection selection for quotes and invoices
Removes the legacy/v2 split confusion
"""


async def get_quote_collection(db):
    """Get the active quote collection based on business settings"""
    settings = await db.business_settings.find_one({}) or {}
    mode = settings.get("quote_collection_mode", "v2")
    return db.quotes_v2 if mode == "v2" else db.quotes


async def get_invoice_collection(db):
    """Get the active invoice collection based on business settings"""
    settings = await db.business_settings.find_one({}) or {}
    mode = settings.get("invoice_collection_mode", "v2")
    return db.invoices_v2 if mode == "v2" else db.invoices
