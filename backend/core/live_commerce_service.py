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
        wallet_apply_amount = float(payload.get("wallet_apply_amount", 0) or 0)

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

        # --- Wallet application logic ---
        wallet_applied = 0.0
        if wallet_apply_amount > 0 and customer_id:
            user_doc = await self.db.users.find_one(
                {"$or": [{"id": customer_id}, {"email": customer_id}]},
                {"_id": 0, "id": 1, "credit_balance": 1}
            )
            if user_doc:
                balance = float(user_doc.get("credit_balance", 0))
                # Get max wallet usage % from settings
                hub = await self.db.admin_settings.find_one({"key": "settings_hub"}, {"_id": 0})
                max_pct = 30.0
                if hub and hub.get("value"):
                    max_pct = float(hub["value"].get("commercial", {}).get("max_wallet_usage_pct", 30))
                max_usable = self._money(total_amount * max_pct / 100.0)
                wallet_applied = min(wallet_apply_amount, balance, max_usable)
                wallet_applied = self._money(wallet_applied)
                if wallet_applied > 0:
                    # Deduct from user balance
                    await self.db.users.update_one(
                        {"id": user_doc["id"]},
                        {"$inc": {"credit_balance": -wallet_applied}}
                    )
                    # Record wallet transaction
                    await self.db.wallet_transactions.insert_one({
                        "user_id": user_doc["id"],
                        "type": "debit",
                        "amount": -wallet_applied,
                        "description": f"Wallet applied to checkout",
                        "reference_type": "checkout",
                        "created_at": self._now(),
                    })

        final_payable = self._money(total_amount - wallet_applied)
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
            "wallet_applied": wallet_applied,
            "final_payable": final_payable,
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
            "amount_due": final_payable,
            "wallet_applied": wallet_applied,
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
            "bank_details": self.bank_details(final_payable),
            "wallet_applied": wallet_applied,
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

    async def finance_queue(self, customer_query: Optional[str] = None, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if status_filter:
            query["status"] = status_filter
        rows = await self.db.payment_proofs.find(query).sort("created_at", -1).to_list(length=500)
        out: List[Dict[str, Any]] = []
        for proof in rows:
            payment = await self.db.payments.find_one({"id": proof.get("payment_id")}) if proof.get("payment_id") else None
            invoice = await self.db.invoices.find_one({"id": proof["invoice_id"]}) if proof.get("invoice_id") else None

            # --- Strict party separation (same logic as orders) ---
            customer_name = ""
            cust_id = proof.get("customer_id") or (invoice or {}).get("customer_id") or (invoice or {}).get("user_id")
            cust_user = None
            if cust_id:
                cust_user = await self.db.users.find_one(
                    {"$or": [{"id": cust_id}, {"email": proof.get("customer_email")}]},
                    {"_id": 0, "full_name": 1, "email": 1, "phone": 1, "company_name": 1}
                )
                if cust_user:
                    customer_name = cust_user.get("full_name") or cust_user.get("email") or ""
            if not customer_name:
                customer_name = (invoice or {}).get("customer_name") or ""
            if not customer_name:
                customer_name = proof.get("customer_email") or (invoice or {}).get("customer_email") or "-"

            # payer_name = proof submitter name (NEVER customer_name)
            payer_name = proof.get("payer_name") or ""
            if not payer_name:
                submission = await self.db.payment_proof_submissions.find_one(
                    {"id": proof.get("id")}, {"_id": 0, "payer_name": 1}
                )
                payer_name = (submission or {}).get("payer_name") or "-"

            # Contact details
            contact_phone = (cust_user or {}).get("phone", "") or (invoice or {}).get("phone", "")
            contact_email = proof.get("customer_email") or (cust_user or {}).get("email", "") or (invoice or {}).get("customer_email", "")
            company_name = (cust_user or {}).get("company_name", "") or (invoice or {}).get("company_name", "")

            # Payment reference
            payment_reference = proof.get("payment_reference") or proof.get("reference") or (payment or {}).get("reference") or ""

            # Approval history
            approved_by = proof.get("approved_by") or ""
            approved_at = proof.get("approved_at") or ""
            rejection_reason = proof.get("rejection_reason") or ""

            # For guest proofs: load order data when invoice is missing
            guest_order = None
            if not invoice and proof.get("order_number"):
                guest_order = await self.db.orders.find_one(
                    {"order_number": proof["order_number"]},
                    {"_id": 0, "id": 1, "order_number": 1, "items": 1, "total_amount": 1, "total": 1, "customer_name": 1, "customer_email": 1, "customer_id": 1, "customer_phone": 1, "company_name": 1}
                )
                # For guest orders, use customer_name from order if not resolved from user/invoice
                if guest_order and (not customer_name or customer_name == "-"):
                    customer_name = guest_order.get("customer_name") or guest_order.get("customer_email") or "-"
                if guest_order and not contact_phone:
                    contact_phone = guest_order.get("customer_phone") or ""
                if guest_order and not company_name:
                    company_name = guest_order.get("company_name") or ""
                if guest_order and not contact_email:
                    contact_email = guest_order.get("customer_email") or ""

            item = {
                "payment_proof_id": proof.get("id"),
                "payment_id": proof.get("payment_id"),
                "invoice_id": proof.get("invoice_id"),
                "order_id": proof.get("order_id") or (guest_order or {}).get("id"),
                "order_number": proof.get("order_number") or "",
                "invoice_number": (invoice or {}).get("invoice_number", ""),
                "customer_id": proof.get("customer_id") or (guest_order or {}).get("customer_id"),
                "customer_name": customer_name,
                "customer_email": contact_email,
                "payer_name": payer_name,
                "contact_phone": contact_phone,
                "company_name": company_name,
                "payment_reference": payment_reference,
                "amount_paid": proof.get("amount_paid", 0),
                "amount_due": (payment or {}).get("amount_due", 0),
                "total_invoice_amount": (payment or {}).get("total_invoice_amount", 0) or (invoice or {}).get("total_amount", 0) or (invoice or {}).get("total", 0) or (guest_order or {}).get("total_amount", 0) or (guest_order or {}).get("total", 0),
                "payment_mode": (payment or {}).get("payment_mode", "full"),
                "file_url": proof.get("file_url") or proof.get("proof_file_url") or "",
                "status": proof.get("status", "uploaded"),
                "items": (invoice or {}).get("items", []) or (guest_order or {}).get("items", []),
                "created_at": str(proof.get("created_at", "")),
                "approved_by": approved_by,
                "approved_at": str(approved_at) if approved_at else "",
                "rejection_reason": rejection_reason,
                "is_guest": bool(proof.get("is_guest_submission") or proof.get("source") == "guest_payment_proof"),
            }
            if customer_query:
                haystack = f"{item['customer_name']} {item['customer_email']} {item['invoice_number']} {item['payer_name']}".lower()
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
        """Approve a payment proof. approver_role can be a role string or the admin's full name."""

        proof = await self.db.payment_proofs.find_one({"id": payment_proof_id})
        if not proof:
            raise HTTPException(status_code=404, detail="Payment proof not found")

        # Find related payment — check by id first, then by order linkage
        payment = None
        if proof.get("payment_id"):
            payment = await self.db.payments.find_one({"id": proof["payment_id"]})
        if not payment and proof.get("order_number"):
            payment = await self.db.payments.find_one({"order_number": proof["order_number"]})
        if not payment and proof.get("order_id"):
            payment = await self.db.payments.find_one({"order_id": proof["order_id"]})

        # Find related invoice — may not exist for guest orders
        invoice = None
        if proof.get("invoice_id"):
            invoice = await self.db.invoices.find_one({"id": proof["invoice_id"]})

        # For guest proofs: payment may be in 'payments' without an 'id' field
        # Find the order directly if no payment found
        order = None
        is_guest_flow = proof.get("is_guest_submission", False) or proof.get("source") == "guest_payment_proof"

        if is_guest_flow:
            # Guest flow: find order by order_number or order_id
            order_number = proof.get("order_number", "")
            if order_number:
                order = await self.db.orders.find_one({"order_number": order_number})
            if not order and proof.get("order_id"):
                order = await self.db.orders.find_one({"id": proof["order_id"]})
            if not order:
                raise HTTPException(status_code=404, detail="Related order not found")
        else:
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
        # Update payment if it exists
        if payment:
            pay_query = {"id": payment.get("id")} if payment.get("id") else {"_id": payment.get("_id")}
            await self.db.payments.update_one(
                pay_query,
                {"$set": {"status": "approved", "review_status": "approved", "approved_at": now, "updated_at": now}},
            )
        elif proof.get("order_number"):
            # Update by order_number for guest proofs
            await self.db.payments.update_many(
                {"order_number": proof["order_number"]},
                {"$set": {"status": "approved", "review_status": "approved", "approved_at": now, "updated_at": now}},
            )

        # Handle invoice or order based on flow type
        if invoice:
            invoice_total = self._money(invoice.get("total_amount", invoice.get("total", 0)))
            approved_paid = self._money(proof.get("amount_paid", 0))
            fully_paid = approved_paid >= invoice_total
            invoice_status = "paid" if fully_paid else "partially_paid"
            await self.db.invoices.update_one(
                {"id": invoice.get("id")},
                {"$set": {
                    "status": invoice_status,
                    "payment_status": "approved",
                    "approved_by": approver_role,
                    "approved_at": now,
                    "updated_at": now,
                }},
            )
        elif is_guest_flow and order:
            order_total = self._money(order.get("total_amount", order.get("total", 0)))
            approved_paid = self._money(proof.get("amount_paid", 0))
            fully_paid = approved_paid >= order_total
            invoice_status = "n/a"
        else:
            fully_paid = True
            invoice_status = "paid"

        order_doc = None
        if fully_paid and is_guest_flow and order:
            order_doc = await self._handle_guest_approval(
                order, proof, approver_role, assigned_sales_id, assigned_sales_name, now
            )
        elif fully_paid and invoice:
            existing_order = await self.db.orders.find_one({"invoice_id": invoice.get("id")})

            # Resolve customer_name from user record if missing on invoice
            customer_name = invoice.get("customer_name") or ""
            if not customer_name:
                cust_user = await self.db.users.find_one(
                    {"$or": [{"id": invoice.get("customer_id")}, {"email": invoice.get("customer_email")}]},
                    {"_id": 0, "full_name": 1, "email": 1}
                )
                if cust_user:
                    customer_name = cust_user.get("full_name") or cust_user.get("email") or ""
            if not customer_name:
                customer_name = invoice.get("customer_email") or "-"

            # Resolve customer_email from user record if missing
            customer_email = invoice.get("customer_email") or ""
            if not customer_email:
                ce_user = await self.db.users.find_one({"id": invoice.get("customer_id")}, {"_id": 0, "email": 1})
                if ce_user:
                    customer_email = ce_user.get("email") or ""

            # Resolve payer_name — STRICT: only from proof/submission payer_name, NEVER customer_name
            payer_name = proof.get("payer_name") or invoice.get("payer_name") or "-"

            # ── Type-aware vendor assignment via Stock-First engine ──
            order_type = (invoice.get("type") or "product").lower()
            temp_order_id = str(uuid4())  # pre-generate for stock reservation

            try:
                from services.assignment_policy_service import resolve_vendor_assignment
                assigned_vendor_id, assigned_vendor_name_resolved, vendor_ids, _decision = (
                    await resolve_vendor_assignment(
                        self.db,
                        items=invoice.get("items", []),
                        order_type=order_type,
                        order_id=temp_order_id,
                    )
                )
                assigned_vendor_id = assigned_vendor_id or ""
            except Exception:
                # Fallback: resolve vendor_ids from product catalog (legacy path)
                import logging as _lg
                _lg.getLogger("live_commerce").warning("Stock-first engine failed, using legacy vendor resolution")
                resolved_vendor_ids = set()
                for item in invoice.get("items", []):
                    vid = None
                    product_id = item.get("product_id") or item.get("sku")
                    if product_id:
                        product = await self.db.products.find_one(
                            {"$or": [{"id": product_id}, {"sku": product_id}]},
                            {"_id": 0, "vendor_id": 1, "owner_vendor_id": 1, "uploaded_by_vendor_id": 1, "partner_id": 1}
                        )
                        if product:
                            vid = product.get("vendor_id") or product.get("owner_vendor_id") or product.get("uploaded_by_vendor_id") or product.get("partner_id")
                    if not vid:
                        vid = item.get("vendor_id")
                    if vid:
                        partner = await self.db.partner_users.find_one(
                            {"$or": [{"partner_id": vid}, {"id": vid}]},
                            {"_id": 0, "partner_id": 1}
                        )
                        if partner:
                            resolved_vendor_ids.add(partner["partner_id"])
                        else:
                            resolved_vendor_ids.add(vid)
                vendor_ids = list(resolved_vendor_ids)
                assigned_vendor_id = vendor_ids[0] if vendor_ids else ""

            if existing_order:
                order_id = existing_order.get("id")
                # Update assignment decision to reference real order_id
                await self.db.assignment_decisions.update_many(
                    {"order_id": temp_order_id}, {"$set": {"order_id": order_id}}
                )
                # Update existing order with assignment/approval fields
                await self.db.orders.update_one(
                    {"id": order_id},
                    {"$set": {
                        "assigned_sales_id": assigned_sales_id or existing_order.get("assigned_sales_id") or "",
                        "assigned_sales_name": assigned_sales_name or existing_order.get("assigned_sales_name") or "",
                        "assigned_vendor_id": assigned_vendor_id or existing_order.get("assigned_vendor_id") or "",
                        "approved_by": approver_role,
                        "approved_at": now,
                        "payer_name": payer_name,
                        "customer_name": customer_name,
                        "customer_email": customer_email,
                        "payment_status": "paid",
                        "updated_at": now,
                    }}
                )
                order_doc = self._clean(await self.db.orders.find_one({"id": order_id}))

                # Create vendor_orders if not already created
                for idx, vid in enumerate(vendor_ids):
                    existing_vo = await self.db.vendor_orders.find_one({"order_id": order_id, "vendor_id": vid})
                    if not existing_vo:
                        vitems = [x for x in invoice.get("items", []) if x.get("vendor_id") == vid]
                        base_price = sum(self._money(x.get("vendor_price") or x.get("unit_price") or x.get("price") or 0) * int(x.get("quantity") or 1) for x in vitems)
                        await self.db.vendor_orders.insert_one({
                            "id": str(uuid4()),
                            "vendor_id": vid,
                            "order_id": order_id,
                            "vendor_order_no": f"VO-{existing_order.get('order_number','ORD')}-{idx+1}",
                            "customer_id": invoice.get("customer_id"),
                            "assigned_sales_id": assigned_sales_id or "",
                            "sales_owner_name": assigned_sales_name or "",
                            "order_number": existing_order.get("order_number", ""),
                            "base_price": base_price,
                            "status": "assigned",
                            "items": vitems,
                            "created_at": now,
                            "updated_at": now,
                        })

                # Create sales_assignment if not already created
                existing_sa = await self.db.sales_assignments.find_one({"order_id": order_id})
                if not existing_sa and assigned_sales_id:
                    await self.db.sales_assignments.insert_one({
                        "id": str(uuid4()),
                        "customer_id": invoice.get("customer_id"),
                        "invoice_id": invoice.get("id"),
                        "order_id": order_id,
                        "sales_owner_id": assigned_sales_id,
                        "sales_owner_name": assigned_sales_name or "",
                        "status": "active_followup",
                        "created_at": now,
                        "updated_at": now,
                    })
            else:
                order_id = temp_order_id  # reuse pre-generated ID so stock reservations reference correct order
                order_doc = {
                    "id": order_id,
                    "order_number": f"KON-ORD-{self._stamp()}",
                    "invoice_id": invoice.get("id"),
                    "checkout_id": invoice.get("checkout_id"),
                    "quote_id": invoice.get("quote_id"),
                    "customer_id": invoice.get("customer_id"),
                    "customer_email": customer_email,
                    "customer_name": customer_name,
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
                    "vendor_ids": vendor_ids,
                    "assigned_sales_id": assigned_sales_id,
                    "assigned_sales_name": assigned_sales_name,
                    "assigned_vendor_id": assigned_vendor_id,
                    "payer_name": payer_name,
                    "approved_by": approver_role,
                    "approved_at": now,
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
                for idx, vid in enumerate(vendor_ids):
                    vendor_items = [item for item in invoice.get("items", []) if item.get("vendor_id") == vid]
                    base_price = sum(self._money(x.get("vendor_price") or x.get("unit_price") or x.get("price") or 0) * int(x.get("quantity") or 1) for x in vendor_items)
                    await self.db.vendor_orders.insert_one(
                        {
                            "id": str(uuid4()),
                            "vendor_id": vid,
                            "order_id": order_id,
                            "vendor_order_no": f"VO-{order_doc['order_number']}-{idx+1}",
                            "customer_id": invoice.get("customer_id"),
                            "assigned_sales_id": assigned_sales_id,
                            "sales_owner_name": assigned_sales_name or "",
                            "order_number": order_doc.get("order_number", ""),
                            "base_price": base_price,
                            "status": "assigned",
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

            # Create notifications via the in-app notification service
            customer_id = invoice.get("customer_id")
            order_number = (order_doc or {}).get("order_number", "")
            oid = (order_doc or {}).get("id", "")

            try:
                from services.in_app_notification_service import create_in_app_notification

                # Customer: Payment verified
                if customer_id:
                    actual_user = await self.db.users.find_one(
                        {"$or": [{"id": customer_id}, {"email": invoice.get("customer_email")}]},
                        {"_id": 0, "id": 1}
                    )
                    notif_user_id = (actual_user or {}).get("id") or customer_id
                    await create_in_app_notification(
                        db=self.db,
                        event_key="payment_verified",
                        recipient_user_id=notif_user_id,
                        recipient_role="customer",
                        entity_type="order",
                        entity_id=oid,
                        order_id=oid,
                        context={"order_number": order_number},
                    )

                # Sales: New order assigned
                if assigned_sales_id:
                    await create_in_app_notification(
                        db=self.db,
                        event_key="sales_order_assigned",
                        recipient_user_id=assigned_sales_id,
                        recipient_role="sales",
                        entity_type="order",
                        entity_id=oid,
                        order_id=oid,
                        context={"order_number": order_number},
                    )

                # Vendor: Order assigned
                for vid in vendor_ids:
                    vo = await self.db.vendor_orders.find_one({"order_id": oid, "vendor_id": vid}, {"_id": 0, "vendor_order_no": 1})
                    vno = (vo or {}).get("vendor_order_no", order_number)
                    # Find the partner_user_id for this vendor
                    partner = await self.db.partner_users.find_one(
                        {"$or": [{"partner_id": vid}, {"id": vid}]},
                        {"_id": 0, "id": 1, "partner_id": 1}
                    )
                    vid_for_notif = (partner or {}).get("id") or vid
                    await create_in_app_notification(
                        db=self.db,
                        event_key="vendor_order_assigned",
                        recipient_user_id=vid_for_notif,
                        recipient_role="vendor",
                        entity_type="vendor_order",
                        entity_id=oid,
                        order_id=oid,
                        context={"order_number": order_number, "vendor_order_no": vno},
                    )
            except Exception:
                pass

            # Trigger referral reward for the referrer (purchase-based, tier-aware)
            try:
                from referral_hooks import process_referral_reward_on_payment
                if order_doc and fully_paid:
                    await process_referral_reward_on_payment(self.db, order_doc)
            except Exception as ref_err:
                import logging as _rl
                _rl.getLogger("live_commerce").warning(f"Referral reward hook error: {ref_err}")

        return {
            "fully_paid": fully_paid,
            "order": order_doc,
            "invoice_status": invoice_status,
        }

    async def _handle_guest_approval(
        self,
        order: Dict[str, Any],
        proof: Dict[str, Any],
        approver_role: str,
        assigned_sales_id: Optional[str],
        assigned_sales_name: Optional[str],
        now: str,
    ) -> Optional[Dict[str, Any]]:
        """Handle approval for guest orders where no invoice exists."""
        order_id = order.get("id")
        order_number = order.get("order_number", "")
        source_items = order.get("items", [])
        source_customer_id = order.get("customer_id") or order.get("linked_user_id")

        # Resolve customer_name
        customer_name = order.get("customer_name") or ""
        customer_email = order.get("customer_email") or ""
        if not customer_name and source_customer_id:
            cust_user = await self.db.users.find_one(
                {"$or": [{"id": source_customer_id}, {"email": customer_email}]},
                {"_id": 0, "full_name": 1, "email": 1}
            )
            if cust_user:
                customer_name = cust_user.get("full_name") or cust_user.get("email") or ""
        if not customer_name:
            customer_name = customer_email or "-"

        payer_name = proof.get("payer_name") or "-"

        # Vendor assignment
        order_type = (order.get("type") or "product").lower()
        vendor_ids = []
        assigned_vendor_id = ""
        try:
            from services.assignment_policy_service import resolve_vendor_assignment
            assigned_vendor_id, _, vendor_ids, _ = await resolve_vendor_assignment(
                self.db, items=source_items, order_type=order_type, order_id=order_id
            )
            assigned_vendor_id = assigned_vendor_id or ""
        except Exception:
            import logging as _lg
            _lg.getLogger("live_commerce").warning("Stock-first engine failed for guest order, using legacy vendor resolution")
            resolved_vendor_ids = set()
            for item in source_items:
                vid = None
                product_id = item.get("product_id") or item.get("sku")
                if product_id:
                    product = await self.db.products.find_one(
                        {"$or": [{"id": product_id}, {"sku": product_id}]},
                        {"_id": 0, "vendor_id": 1, "owner_vendor_id": 1, "uploaded_by_vendor_id": 1, "partner_id": 1}
                    )
                    if product:
                        vid = (product.get("vendor_id") or product.get("owner_vendor_id")
                               or product.get("uploaded_by_vendor_id") or product.get("partner_id"))
                if not vid:
                    vid = item.get("vendor_id")
                if vid:
                    partner = await self.db.partner_users.find_one(
                        {"$or": [{"partner_id": vid}, {"id": vid}]},
                        {"_id": 0, "partner_id": 1}
                    )
                    if partner:
                        resolved_vendor_ids.add(partner["partner_id"])
                    else:
                        resolved_vendor_ids.add(vid)
            vendor_ids = list(resolved_vendor_ids)
            assigned_vendor_id = vendor_ids[0] if vendor_ids else ""

        # Update the existing guest order
        await self.db.orders.update_one(
            {"id": order_id},
            {"$set": {
                "status": "created",
                "current_status": "created",
                "payment_status": "paid",
                "order_status": "processing",
                "pipeline_stage": "fulfillment",
                "assigned_sales_id": assigned_sales_id or "",
                "assigned_sales_name": assigned_sales_name or "",
                "assigned_vendor_id": assigned_vendor_id,
                "vendor_ids": vendor_ids,
                "approved_by": approver_role,
                "approved_at": now,
                "payer_name": payer_name,
                "customer_name": customer_name,
                "customer_email": customer_email,
                "updated_at": now,
            }, "$push": {
                "status_history": {
                    "status": "created",
                    "note": f"Payment approved by {approver_role}",
                    "timestamp": now,
                }
            }}
        )
        order_doc = self._clean(await self.db.orders.find_one({"id": order_id}))

        # Create vendor_orders
        for idx, vid in enumerate(vendor_ids):
            existing_vo = await self.db.vendor_orders.find_one({"order_id": order_id, "vendor_id": vid})
            if not existing_vo:
                vitems = [x for x in source_items if x.get("vendor_id") == vid]
                base_price = sum(
                    self._money(x.get("vendor_price") or x.get("unit_price") or x.get("price") or 0)
                    * int(x.get("quantity") or 1) for x in vitems
                )
                await self.db.vendor_orders.insert_one({
                    "id": str(uuid4()), "vendor_id": vid, "order_id": order_id,
                    "vendor_order_no": f"VO-{order_number}-{idx+1}",
                    "customer_id": source_customer_id,
                    "assigned_sales_id": assigned_sales_id or "",
                    "sales_owner_name": assigned_sales_name or "",
                    "order_number": order_number, "base_price": base_price,
                    "status": "assigned", "items": vitems,
                    "created_at": now, "updated_at": now,
                })

        # Sales assignment
        existing_sa = await self.db.sales_assignments.find_one({"order_id": order_id})
        if not existing_sa and assigned_sales_id:
            await self.db.sales_assignments.insert_one({
                "id": str(uuid4()), "customer_id": source_customer_id,
                "order_id": order_id, "sales_owner_id": assigned_sales_id,
                "sales_owner_name": assigned_sales_name or "",
                "status": "active_followup",
                "created_at": now, "updated_at": now,
            })

        # Order event
        await self.db.order_events.insert_one({
            "id": str(uuid4()), "order_id": order_id,
            "customer_id": source_customer_id,
            "event": "guest_payment_approved", "created_at": now,
        })

        # Commissions
        try:
            from referral_commission_governance_routes import create_commissions_for_order
            await create_commissions_for_order(
                self.db, order_id=order_id, customer_id=source_customer_id,
                commissionable_base=float(order.get("total_amount") or order.get("total") or 0),
                affiliate_id=order.get("affiliate_id"),
                promo_code=order.get("affiliate_code"),
                sales_owner_id=assigned_sales_id,
            )
        except Exception:
            pass

        # Customer notification
        if source_customer_id:
            actual_user = await self.db.users.find_one(
                {"$or": [{"id": source_customer_id}, {"email": customer_email}]},
                {"_id": 0, "id": 1}
            )
            notif_user_id = (actual_user or {}).get("id") or source_customer_id
            await self.db.notifications.insert_one({
                "id": str(uuid4()),
                "user_id": notif_user_id,
                "role": "customer",
                "event_type": "payment_approved",
                "title": "Payment Approved",
                "message": f"Your payment for order {order_number} has been approved. You can now track your order progress.",
                "target_url": "/account/orders",
                "target_ref": order_number,
                "cta_label": "Track Order",
                "read": False,
                "created_at": now,
            })

        return order_doc

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
        if proof.get("payment_id"):
            await self.db.payments.update_one(
                {"id": proof["payment_id"]},
                {"$set": {"status": "proof_rejected", "review_status": "rejected", "updated_at": now}},
            )
        elif proof.get("order_number"):
            await self.db.payments.update_many(
                {"order_number": proof["order_number"]},
                {"$set": {"status": "proof_rejected", "review_status": "rejected", "updated_at": now}},
            )

        if proof.get("invoice_id"):
            invoice = await self.db.invoices.find_one({"id": proof["invoice_id"]})
        else:
            invoice = None
        if invoice:
            await self.db.invoices.update_one(
                {"id": invoice["id"]},
                {"$set": {"status": "pending_payment", "payment_status": "pending", "updated_at": now}},
            )

        # For guest orders: reset order status
        is_guest = proof.get("is_guest_submission", False) or proof.get("source") == "guest_payment_proof"
        if is_guest and proof.get("order_number"):
            await self.db.orders.update_one(
                {"order_number": proof["order_number"]},
                {"$set": {
                    "payment_status": "rejected",
                    "current_status": "awaiting_payment_proof",
                    "order_status": "awaiting_payment_proof",
                    "updated_at": now,
                }, "$push": {
                    "status_history": {
                        "status": "payment_rejected",
                        "note": f"Payment rejected: {reason or 'Not specified'}",
                        "timestamp": now,
                    }
                }}
            )

        # Customer notification
        customer_id = proof.get("customer_id") or (invoice or {}).get("customer_id")
        ref_label = (invoice or {}).get("invoice_number", "") or proof.get("order_number", "")
        target_url = "/account/invoices" if invoice else "/account/orders"
        cta_label = "Open Invoice" if invoice else "View Order"
        if customer_id:
            actual_user = await self.db.users.find_one(
                {"$or": [{"id": customer_id}, {"email": proof.get("customer_email")}]},
                {"_id": 0, "id": 1}
            )
            notif_user_id = (actual_user or {}).get("id") or customer_id
            await self.db.notifications.insert_one({
                "id": str(uuid4()),
                "user_id": notif_user_id,
                "role": "customer",
                "event_type": "payment_rejected",
                "title": "Payment Rejected",
                "message": f"Your payment submission for {ref_label} was rejected. Reason: {reason or 'Not specified'}. Please review and resubmit.",
                "target_url": target_url,
                "target_ref": ref_label,
                "cta_label": cta_label,
                "read": False,
                "created_at": now,
            })

        return {"ok": True}

    async def customer_workspace(self, customer_id: str) -> Dict[str, Any]:
        invoices = [self._clean(doc) for doc in await self.db.invoices.find({"customer_id": customer_id}).sort("created_at", -1).to_list(length=200)]
        payments = [self._clean(doc) for doc in await self.db.payments.find({"customer_id": customer_id}).sort("created_at", -1).to_list(length=200)]
        orders = [self._clean(doc) for doc in await self.db.orders.find({"customer_id": customer_id}).sort("created_at", -1).to_list(length=200)]
        return {"invoices": invoices, "payments": payments, "orders": orders}
