"""
Collection Mode Service
Canonical collection selection for quotes and invoices
"""


async def get_quote_collection(db):
    """Get the canonical quote collection — always quotes_v2"""
    return db.quotes_v2


async def get_invoice_collection(db):
    """Get the canonical invoice collection — always invoices"""
    return db.invoices
