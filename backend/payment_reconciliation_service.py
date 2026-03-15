from datetime import datetime
from bson import ObjectId


async def reconcile_invoice_payment(db, invoice_id: str, amount: float, payment_method: str, reference: str | None = None):
    invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    if not invoice:
        return None

    total = float(invoice.get("total", 0) or 0)
    paid_amount = float(invoice.get("paid_amount", 0) or 0)
    balance_due = float(invoice.get("balance_due", total) or 0)

    amount = max(0, float(amount or 0))
    new_paid_amount = paid_amount + amount
    new_balance_due = max(0, balance_due - amount)

    if new_balance_due <= 0:
        status = "paid"
    elif new_paid_amount > 0:
        status = "partially_paid"
    else:
        status = invoice.get("status", "sent")

    payment_row = {
        "type": payment_method,
        "amount": amount,
        "reference": reference,
        "created_at": datetime.utcnow(),
    }

    await db.invoices.update_one(
        {"_id": ObjectId(invoice_id)},
        {
            "$set": {
                "paid_amount": new_paid_amount,
                "balance_due": new_balance_due,
                "status": status,
                "updated_at": datetime.utcnow(),
            },
            "$push": {"payments": payment_row},
        },
    )

    return await db.invoices.find_one({"_id": ObjectId(invoice_id)})
