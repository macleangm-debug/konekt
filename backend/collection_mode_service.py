"""
Collection Mode Service
Canonical collection selection for quotes and invoices
Always returns the v2 (canonical) collections
"""


async def get_quote_collection(db):
    """Get the canonical quote collection — always quotes_v2"""
    return db.quotes_v2


async def get_invoice_collection(db):
    """Get the canonical invoice collection — always invoices_v2"""
    return db.invoices_v2
