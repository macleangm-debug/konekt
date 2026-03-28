from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import HTTPException

from payment_config import (
    BANK_ACCOUNT_NAME,
    BANK_ACCOUNT_NUMBER,
    BANK_BRANCH,
    BANK_CURRENCY,
    BANK_NAME,
    BANK_SWIFT_CODE,
)


class LiveCommerceService:
    """Go-live facade for the product -> invoice -> payment -> approval -> order flow.

    This layer does not remove any existing route packs. It simply provides a single,
    predictable interface for the production-critical journey while reusing the same
    MongoDB collections already used elsewhere in the codebase.
    """

    def __init__(self, db):
        self.db = db

    @staticmethod
    def _money(value: Any) -> float:
        return round(float(value or 0), 2)

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _stamp() -> str:
        return datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")

    @staticmethod
    def _clean(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not doc:
            return doc
        doc = dict(doc)
        doc.pop("_id", None)
        return doc

    def bank_details(self, amount: float) -> Dict[str, Any]:
        return {
            "bank_name": BANK_NAME or "CRDB BANK",
            "account_name": BANK_ACCOUNT_NAME or "KONEKT LIMITED",
            "account_number": BANK_ACCOUNT_NUMBER or "015C8841347002",
            "branch": BANK_BRANCH or "Main Branch",
            "swift_code": BANK_SWIFT_CODE or "CORUTZTZ",
            "currency": BANK_CURRENCY or "TZS",
            "amount": self._money(amount),
        }

    async def create_product_checkout(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        customer_id = payload.get("customer_id") or payload.get("customer_email") or str(uuid4())
        items = payload.get("items") or []
        delivery = payload.get("delivery") or {}
        customer = payload.get("customer") or {}
        quote_details = payload.get("quote_details") or {}

        if not items:
            raise HTTPException(status_code=400, detail="items are required")

        normalized: List[Dict[str, Any]] = []
        vendor_ids = set()
        subtotal = 0.0

        for item in items:
            qty = max(1, int(item.get("quantity", 1) or 1))
            unit_price = self._money(item.get("price") or item.get("unit_price") or 0)
            line_total = self._money(qty * unit_price)
            subtotal += line_total
            normalized_item = {
                "product_id": item.get("product_id") or item.get("id"),
                "sku": item.get("sku"),
                "name": item.get("name") or item.get("title") or "Product",
                "quantity": qty,
                "unit_price": unit_price,
                "line_total": line_total,
                "vendor_id": item.get("vendor_id"),
                "attributes": item.get("attributes") or {},
                "customization_summary": item.get("customization_summary"),
            }
            normalized.append(normalized_item)
            if normalized_item.get("vendor_id"):
                vendor_ids.add(normalized_item["vendor_id"])

        vat_percent = float(payload.get("vat_percent", 18) or 18)
        vat_amount = self._money(subtotal * vat_percent / 100.0)
        total_amount = self._money(subtotal + vat_amount)
        now = self._now()

        checkout_id = str(uuid4())
        invoice_id = str(uuid4())

        checkout_doc = {
            "id": checkout_id,
            "customer_id": customer_id,
            "customer_email": customer.get("email") or payload.get("customer_email"),
            "customer_name": customer.get("full_name") or payload.get("customer_name"),
            "customer_phone": customer.get("phone") or payload.get("customer_phone"),
            "type": "product",
            "status": "awaiting_payment",
            "items": normalized,
            "subtotal_amount": self._money(subtotal),
            "vat_amount": vat_amount,
            "total_amount": total_amount,
            "delivery": delivery,
            "customer": customer,
            "quote_details": quote_details,
            "vendor_ids": list(vendor_ids),
            "created_at": now,
            "updated_at": now,
        }

        invoice_doc = {
            "id": invoice_id,
            "invoice_number": f"KON-INV-{self._stamp()}",
            "customer_id": customer_id,
            "customer_email": customer.get("email") or payload.get("customer_email"),
            "customer_name": customer.get("full_name") or payload.get("customer_name"),
            "customer_phone": customer.get("phone") or payload.get("customer_phone"),
            "user_id": customer_id,
            "checkout_id": checkout_id,
            "status": "pending_payment",
            "payment_status": "pending",
            "type": "product",
            "items": normalized,
            "subtotal_amount": self._money(subtotal),
            "vat_amount": vat_amount,
            "total_amount": total_amount,
            "total": total_amount,
            "amount_due": total_amount,
            "delivery": delivery,
            "customer": customer,
            "quote_details": quote_details,
            "vendor_ids": list(vendor_ids),
            "created_at": now,
            "updated_at": now,
        }

        await self.db.product_checkouts.insert_one(checkout_doc)
        await self.db.invoices.insert_one(invoice_doc)

        return {
            "checkout": self._clean(checkout_doc),
            "invoice": self._clean(invoice_doc),
            "bank_details": self.bank_details(total_amount),
        }

    async def accept_quote(self, quote_id: str, accepted_by_role: str = "customer") -> Dict[str, Any]:
        quote = await self.db.quotes.find_one({"id": quote_id})
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        if accepted_by_role not in {"customer", "sales"}:
            raise HTTPException(status_code=400, detail="accepted_by_role must be customer or sales")

        now = self._now()
        invoice_id = str(uuid4())
        total_amount = self._money(quote.get("total_amount", 0))

        invoice_doc = {
            "id": invoice_id,
            "invoice_number": f"KON-INV-{self._stamp()}",
            "customer_id": quote.get("customer_id"),
            "customer_email": quote.get("customer_email"),
            "customer_name": quote.get("customer_name"),
            "user_id": quote.get("customer_id"),
            "quote_id": quote_id,
            "status": "pending_payment",
            "payment_status": "pending",
            "type": quote.get("type", "service"),
            "items": quote.get("items", []),
            "subtotal_amount": self._money(quote.get("subtotal_amount", total_amount)),
            "vat_amount": self._money(quote.get("vat_amount", 0)),
            "total_amount": total_amount,
            "total": total_amount,
            "amount_due": total_amount,
            "quote_details": quote.get("quote_details", {}),
            "delivery": quote.get("delivery", {}),
            "created_at": now,
            "updated_at": now,
        }

        await self.db.invoices.insert_one(invoice_doc)
        await self.db.quotes.update_one(
            {"id": quote_id},
            {"$set": {"status": "approved", "invoice_id": invoice_id, "approved_at": now, "accepted_by_role": accepted_by_role}},
        )

        return {
            "invoice": self._clean(invoice_doc),
            "bank_details": self.bank_details(total_amount),
        }

    async def create_payment_intent(self, invoice_id: str, payment_mode: str = "full", deposit_percent: float = 0) -> Dict[str, Any]:
        invoice = await self.db.invoices.find_one({"id": invoice_id})
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")

        total = self._money(invoice.get("total_amount", invoice.get("total", 0)))
        if payment_mode == "deposit":
            if deposit_percent <= 0 or deposit_percent >= 100:
                raise HTTPException(status_code=400, detail="deposit_percent must be between 0 and 100")
            amount_due = self._money(total * deposit_percent / 100.0)
        else:
            amount_due = total
            deposit_percent = None

        now = self._now()
        payment_id = str(uuid4())
        payment_doc = {
            "id": payment_id,
            "invoice_id": invoice_id,
            "customer_id": invoice.get("customer_id"),
            "customer_email": invoice.get("customer_email"),
            "customer_name": invoice.get("customer_name"),
            "status": "awaiting_payment_proof",
            "review_status": "pending",
            "payment_mode": payment_mode,
            "deposit_percent": deposit_percent,
            "amount_due": amount_due,
            "total_invoice_amount": total,
            "created_at": now,
            "updated_at": now,
        }
        await self.db.payments.insert_one(payment_doc)
        await self.db.invoices.update_one(
            {"id": invoice_id},
            {"$set": {"payment_status": "awaiting_payment_proof", "current_payment_id": payment_id, "updated_at": now}},
        )

        return {
            "payment": self._clean(payment_doc),
            "invoice": self._clean(invoice),
            "bank_details": self.bank_details(amount_due),
        }

    async def submit_payment_proof(self, payment_id: str, amount_paid: float, file_url: str, payer_name: str = "", customer_email: str = "") -> Dict[str, Any]:
        if amount_paid <= 0:
            raise HTTPException(status_code=400, detail="amount_paid must be greater than zero")
        payment = await self.db.payments.find_one({"id": payment_id})
        if not payment:
            raise HTTPException(status_code=404, detail="Payment intent not found")

        now = self._now()
        proof_id = str(uuid4())
        proof_doc = {
            "id": proof_id,
            "payment_id": payment_id,
            "invoice_id": payment.get("invoice_id"),
            "customer_id": payment.get("customer_id"),
            "customer_email": customer_email or payment.get("customer_email", ""),
            "payer_name": payer_name or payment.get("customer_name", ""),
            "amount_paid": self._money(amount_paid),
            "file_url": file_url,
            "status": "uploaded",
            "visible_roles": ["sales", "finance", "admin"],
            "approvable_roles": ["finance", "admin"],
            "created_at": now,
            "updated_at": now,
        }
        await self.db.payment_proofs.insert_one(proof_doc)

        invoice = await self.db.invoices.find_one({"id": payment.get("invoice_id")})
        submission_doc = {
            **proof_doc,
            "payment_method": "bank_transfer",
            "payment_date": now,
            "invoice_number": (invoice or {}).get("invoice_number", ""),
        }
        await self.db.payment_proof_submissions.insert_one(submission_doc)
        await self.db.payments.update_one(
            {"id": payment_id},
            {"$set": {"status": "proof_uploaded", "review_status": "under_review", "payment_proof_id": proof_id, "updated_at": now}},
        )
        await self.db.invoices.update_one(
            {"id": payment.get("invoice_id")},
            {"$set": {"payment_status": "under_review", "status": "under_review", "updated_at": now}},
        )

        return {
            "payment_proof": self._clean(proof_doc),
            "status": "under_review",
        }

    async def finance_queue(self, customer_query: Optional[str] = None) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"status": "uploaded"}
        rows = await self.db.payment_proofs.find(query).sort("created_at", -1).to_list(length=300)
        out: List[Dict[str, Any]] = []
        for proof in rows:
            payment = await self.db.payments.find_one({"id": proof.get("payment_id")})
            invoice = await self.db.invoices.find_one({"id": proof.get("invoice_id")})
            profile = await self.db.customer_profiles.find_one({"customer_id": proof.get("customer_id")})
            item = {
                "payment_proof_id": proof.get("id"),
                "payment_id": proof.get("payment_id"),
                "invoice_id": proof.get("invoice_id"),
                "invoice_number": (invoice or {}).get("invoice_number", ""),
                "customer_id": proof.get("customer_id"),
                "customer_name": proof.get("payer_name") or (profile or {}).get("contact_name") or (invoice or {}).get("customer_name", ""),
                "customer_email": proof.get("customer_email") or (invoice or {}).get("customer_email", ""),
                "payer_name": proof.get("payer_name", ""),
                "amount_paid": proof.get("amount_paid", 0),
                "amount_due": (payment or {}).get("amount_due", 0),
                "total_invoice_amount": (payment or {}).get("total_invoice_amount", 0),
                "payment_mode": (payment or {}).get("payment_mode", "full"),
                "file_url": proof.get("file_url", ""),
                "status": proof.get("status", "uploaded"),
                "items": (invoice or {}).get("items", []),
                "created_at": str(proof.get("created_at", "")),
            }
            if customer_query:
                haystack = f"{item['customer_name']} {item['customer_email']} {item['invoice_number']}".lower()
                if customer_query.lower() not in haystack:
                    continue
            out.append(item)
        return out

    async def approve_payment_proof(
        self,
        payment_proof_id: str,
        approver_role: str,
        assigned_sales_id: Optional[str] = None,
        assigned_sales_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        if approver_role not in {"finance", "admin"}:
            raise HTTPException(status_code=403, detail="Only finance/admin can approve")

        proof = await self.db.payment_proofs.find_one({"id": payment_proof_id})
        if not proof:
            raise HTTPException(status_code=404, detail="Payment proof not found")
        payment = await self.db.payments.find_one({"id": proof.get("payment_id")})
        invoice = await self.db.invoices.find_one({"id": proof.get("invoice_id")})
        if not payment or not invoice:
            raise HTTPException(status_code=404, detail="Related payment or invoice not found")

        now = self._now()

        # Auto-resolve sales if not provided
        if not assigned_sales_id:
            sales_users = await self.db.users.find(
                {"role": {"$in": ["sales", "staff", "admin"]}, "is_active": {"$ne": False}},
                {"_id": 0, "id": 1, "full_name": 1, "email": 1, "phone": 1, "role": 1}
            ).to_list(50)
            for preferred_role in ["sales", "staff", "admin"]:
                candidates = [u for u in sales_users if u.get("role") == preferred_role]
                if candidates:
                    best = candidates[0]
                    assigned_sales_id = best["id"]
                    assigned_sales_name = best.get("full_name", "Sales")
                    break

        await self.db.payment_proofs.update_one(
            {"id": payment_proof_id},
            {"$set": {"status": "approved", "approved_by_role": approver_role, "approved_at": now, "updated_at": now}},
        )
        await self.db.payment_proof_submissions.update_one(
            {"id": payment_proof_id},
            {"$set": {"status": "approved", "approved_by": approver_role, "approved_at": now, "updated_at": now}},
        )
        await self.db.payments.update_one(
            {"id": payment.get("id")},
            {"$set": {"status": "approved", "review_status": "approved", "approved_at": now, "updated_at": now}},
        )

        invoice_total = self._money(invoice.get("total_amount", invoice.get("total", 0)))
        approved_paid = self._money(proof.get("amount_paid", 0))
        fully_paid = approved_paid >= invoice_total
        invoice_status = "paid" if fully_paid else "partially_paid"
        await self.db.invoices.update_one(
            {"id": invoice.get("id")},
            {"$set": {"status": invoice_status, "payment_status": "approved", "updated_at": now}},
        )

        order_doc = None
        if fully_paid:
            existing_order = await self.db.orders.find_one({"invoice_id": invoice.get("id")})
            if existing_order:
                order_doc = self._clean(existing_order)
            else:
                order_id = str(uuid4())
                order_doc = {
                    "id": order_id,
                    "order_number": f"KON-ORD-{self._stamp()}",
                    "invoice_id": invoice.get("id"),
                    "checkout_id": invoice.get("checkout_id"),
                    "quote_id": invoice.get("quote_id"),
                    "customer_id": invoice.get("customer_id"),
                    "customer_email": invoice.get("customer_email"),
                    "customer_name": invoice.get("customer_name"),
                    "user_id": invoice.get("customer_id"),
                    "type": invoice.get("type", "product"),
                    "status": "created",
                    "current_status": "created",
                    "payment_status": "paid",
                    "items": invoice.get("items", []),
                    "subtotal_amount": invoice.get("subtotal_amount", 0),
                    "vat_amount": invoice.get("vat_amount", 0),
                    "total_amount": invoice_total,
                    "total": invoice_total,
                    "delivery": invoice.get("delivery", {}),
                    "vendor_ids": invoice.get("vendor_ids", []),
                    "assigned_sales_id": assigned_sales_id,
                    "assigned_sales_name": assigned_sales_name,
                    "assigned_vendor_id": (invoice.get("vendor_ids") or [None])[0],
                    "invoice_id": invoice.get("id"),
                    "payer_name": invoice.get("payer_name") or (invoice.get("billing") or {}).get("invoice_client_name") or invoice.get("customer_name") or "-",
                    "created_at": now,
                    "updated_at": now,
                }
                await self.db.orders.insert_one(order_doc)
                await self.db.sales_assignments.insert_one(
                    {
                        "id": str(uuid4()),
                        "customer_id": invoice.get("customer_id"),
                        "invoice_id": invoice.get("id"),
                        "order_id": order_id,
                        "sales_owner_id": assigned_sales_id or "",
                        "sales_owner_name": assigned_sales_name or "",
                        "status": "active_followup",
                        "created_at": now,
                        "updated_at": now,
                    }
                )
                vendor_ids = {item.get("vendor_id") for item in invoice.get("items", []) if item.get("vendor_id")}
                for vendor_id in vendor_ids:
                    vendor_items = [item for item in invoice.get("items", []) if item.get("vendor_id") == vendor_id]
                    await self.db.vendor_orders.insert_one(
                        {
                            "id": str(uuid4()),
                            "vendor_id": vendor_id,
                            "order_id": order_id,
                            "customer_id": invoice.get("customer_id"),
                            "assigned_sales_id": assigned_sales_id,
                            "sales_owner_name": assigned_sales_name or "",
                            "order_number": order_doc.get("order_number", ""),
                            "status": "ready_to_fulfill",
                            "items": vendor_items,
                            "created_at": now,
                            "updated_at": now,
                        }
                    )
                await self.db.order_events.insert_one(
                    {
                        "id": str(uuid4()),
                        "order_id": order_id,
                        "customer_id": invoice.get("customer_id"),
                        "event": "payment_approved_order_created",
                        "created_at": now,
                    }
                )
                order_doc = self._clean(order_doc)

                # Trigger commissions after order creation
                try:
                    from referral_commission_governance_routes import create_commissions_for_order
                    await create_commissions_for_order(
                        self.db, order_id=order_id, invoice_id=invoice.get("id"),
                        customer_id=invoice.get("customer_id"),
                        commissionable_base=float(invoice_total),
                        affiliate_id=invoice.get("affiliate_id"),
                        promo_code=(invoice.get("quote_details") or {}).get("affiliate_code"),
                        sales_owner_id=assigned_sales_id,
                    )
                except Exception:
                    pass

        return {
            "fully_paid": fully_paid,
            "order": order_doc,
            "invoice_status": invoice_status,
        }

    async def reject_payment_proof(self, payment_proof_id: str, approver_role: str, reason: str = "") -> Dict[str, Any]:
        if approver_role not in {"finance", "admin"}:
            raise HTTPException(status_code=403, detail="Only finance/admin can reject")
        proof = await self.db.payment_proofs.find_one({"id": payment_proof_id})
        if not proof:
            raise HTTPException(status_code=404, detail="Payment proof not found")
        now = self._now()
        await self.db.payment_proofs.update_one(
            {"id": payment_proof_id},
            {"$set": {"status": "rejected", "rejected_by_role": approver_role, "rejection_reason": reason, "rejected_at": now, "updated_at": now}},
        )
        await self.db.payment_proof_submissions.update_one(
            {"id": payment_proof_id},
            {"$set": {"status": "rejected", "rejection_reason": reason, "updated_at": now}},
        )
        await self.db.payments.update_one(
            {"id": proof.get("payment_id")},
            {"$set": {"status": "proof_rejected", "review_status": "rejected", "updated_at": now}},
        )
        await self.db.invoices.update_one(
            {"id": proof.get("invoice_id")},
            {"$set": {"status": "pending_payment", "payment_status": "pending", "updated_at": now}},
        )
        return {"ok": True}

    async def customer_workspace(self, customer_id: str) -> Dict[str, Any]:
        invoices = [self._clean(doc) for doc in await self.db.invoices.find({"customer_id": customer_id}).sort("created_at", -1).to_list(length=200)]
        payments = [self._clean(doc) for doc in await self.db.payments.find({"customer_id": customer_id}).sort("created_at", -1).to_list(length=200)]
        orders = [self._clean(doc) for doc in await self.db.orders.find({"customer_id": customer_id}).sort("created_at", -1).to_list(length=200)]
        return {"invoices": invoices, "payments": payments, "orders": orders}
