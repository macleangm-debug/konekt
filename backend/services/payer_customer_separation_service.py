"""
Pack 5 — Payer/Customer Separation Service (Hardened)
Deep architectural separation of registered business identity vs. payment submitter identity.
Used by: order_ops_routes.py, live_commerce_service.py finance_queue, payment_queue enrichment.

Rules:
- customer_name: ONLY from users record / account / business record. NEVER from payer/payment fields.
- payer_name: ONLY from payment_proofs / payment_proof_submissions payer_name. NEVER from customer record.
"""
import logging

logger = logging.getLogger("payer_customer_separation")


def resolve_customer_name(order_or_invoice: dict) -> str:
    """Customer name comes ONLY from customer/account/business record — never from payer."""
    return (
        order_or_invoice.get("customer_name")
        or (order_or_invoice.get("customer") or {}).get("name")
        or (order_or_invoice.get("account") or {}).get("business_name")
        or order_or_invoice.get("customer_email")
        or "-"
    )


async def resolve_customer_name_from_db(db, customer_id: str = None, customer_email: str = None, fallback_doc: dict = None) -> str:
    """
    Resolve customer name from users collection.
    Priority: users.full_name -> users.email -> fallback_doc fields -> "-"
    """
    if customer_id or customer_email:
        query_parts = []
        if customer_id:
            query_parts.append({"id": customer_id})
        if customer_email:
            query_parts.append({"email": customer_email})
        user = await db.users.find_one(
            {"$or": query_parts} if len(query_parts) > 1 else query_parts[0],
            {"_id": 0, "full_name": 1, "email": 1}
        )
        if user:
            name = user.get("full_name") or user.get("email") or ""
            if name:
                return name
    # Fallback to document fields
    if fallback_doc:
        return resolve_customer_name(fallback_doc)
    return "-"


def resolve_payer_name(invoice: dict, proof=None, submission=None) -> str:
    """Payer name comes ONLY from payment proof/submission — never from customer record."""
    return (
        (proof or {}).get("payer_name")
        or (submission or {}).get("payer_name")
        or invoice.get("payer_name")
        or "-"
    )


async def resolve_payer_name_from_db(db, invoice_id: str = None, proof: dict = None) -> str:
    """
    Resolve payer name from payment_proofs or payment_proof_submissions.
    NEVER falls back to customer_name.
    """
    if proof and proof.get("payer_name"):
        return proof["payer_name"]
    if invoice_id:
        pp = await db.payment_proofs.find_one(
            {"invoice_id": invoice_id},
            {"_id": 0, "payer_name": 1},
            sort=[("created_at", -1)]
        )
        if pp and pp.get("payer_name"):
            return pp["payer_name"]
        sub = await db.payment_proof_submissions.find_one(
            {"invoice_id": invoice_id},
            {"_id": 0, "payer_name": 1},
            sort=[("created_at", -1)]
        )
        if sub and sub.get("payer_name"):
            return sub["payer_name"]
    return "-"


def apply_invoice_party_fields(invoice: dict, proof=None, submission=None) -> dict:
    """Apply SEPARATED customer_name and payer_name to an invoice dict."""
    invoice["customer_name"] = resolve_customer_name(invoice)
    invoice["payer_name"] = resolve_payer_name(invoice, proof=proof, submission=submission)
    return invoice


async def apply_order_party_fields(db, order: dict) -> dict:
    """
    Full DB-backed party field resolution for an order.
    Sets customer_name (from users) and payer_name (from proofs).
    """
    cid = order.get("customer_id") or order.get("user_id")
    cemail = order.get("customer_email")
    order["customer_name"] = await resolve_customer_name_from_db(
        db, customer_id=cid, customer_email=cemail, fallback_doc=order
    )
    inv_id = order.get("invoice_id")
    order["payer_name"] = await resolve_payer_name_from_db(db, invoice_id=inv_id)
    return order
