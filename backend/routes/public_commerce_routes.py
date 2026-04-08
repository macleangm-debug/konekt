"""
Public Guest Commerce Routes
Handles: guest checkout, guest payment proof, account detection & order linking.
Uses the same `orders` + `payment_proof_submissions` collections as account orders.
"""
import os
import logging
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, File, UploadFile
from motor.motor_asyncio import AsyncIOMotorClient
from services.checkout_totals_service import get_vat_percent, calculate_totals
from services.product_promotion_enrichment import resolve_checkout_item_price
from attribution_capture_service import (
    extract_attribution_from_payload,
    hydrate_affiliate_from_code,
    build_attribution_block,
)

logger = logging.getLogger("public_commerce")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "konekt")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

router = APIRouter(prefix="/api/public", tags=["Public Commerce"])

# Lazy notification service
def _notif():
    from services.notification_service import NotificationService
    return NotificationService(db)


def _now():
    return datetime.now(timezone.utc).isoformat()


def _order_number():
    return f"ORD-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid4().hex[:6].upper()}"


# ─── Account Detection ────────────────────────────────────

async def _detect_account(email: str, phone: str = ""):
    """Check if an account already exists by email or phone."""
    if email:
        user = await db.users.find_one(
            {"email": email.strip().lower(), "account_status": "active"},
            {"_id": 0, "id": 1, "full_name": 1, "email": 1, "phone": 1},
        )
        if user:
            return user
    if phone:
        user = await db.users.find_one(
            {"phone": phone.strip(), "account_status": "active"},
            {"_id": 0, "id": 1, "full_name": 1, "email": 1, "phone": 1},
        )
        if user:
            return user
    return None


# ─── Guest Checkout ───────────────────────────────────────

@router.post("/checkout")
async def public_checkout(payload: dict):
    """
    Create a real order from a guest cart.
    Uses the same `orders` collection as account orders.
    """
    items = payload.get("items", [])
    if not items:
        raise HTTPException(400, "Cart is empty")

    customer_name = (payload.get("customer_name") or payload.get("full_name") or "").strip()
    customer_email = (payload.get("email") or payload.get("customer_email") or "").strip().lower()
    customer_phone = (payload.get("phone") or payload.get("customer_phone") or "").strip()
    company_name = (payload.get("company_name") or payload.get("company") or "").strip()

    if not customer_name or not customer_email or not customer_phone:
        raise HTTPException(400, "Name, email, and phone are required")

    # Calculate totals using canonical service (same logic as account checkout)
    vat_percent = await get_vat_percent(db)
    order_items = []
    total_promo_discount = 0
    for item in items:
        qty = int(item.get("quantity", 1))
        raw_price = float(item.get("unit_price") or item.get("price") or 0)

        # Resolve promotion pricing (same resolver for ALL flows)
        promo_info = await resolve_checkout_item_price({
            "product_id": item.get("product_id", ""),
            "unit_price": raw_price,
            "category_name": item.get("category_name", ""),
            "category": item.get("category", ""),
        }, db=db)

        price = promo_info["unit_price"]
        subtotal = qty * price
        item_promo_discount = promo_info["promo_discount"] * qty
        total_promo_discount += item_promo_discount

        order_items.append({
            "product_id": item.get("product_id", ""),
            "product_name": item.get("product_name") or item.get("name", ""),
            "quantity": qty,
            "unit_price": price,
            "original_price": promo_info["original_price"],
            "subtotal": subtotal,
            "size": item.get("size"),
            "color": item.get("color"),
            "variant": item.get("variant"),
            "listing_type": item.get("listing_type", "product"),
            "promo_applied": promo_info["promo_applied"],
            "promo_id": promo_info["promo_id"],
            "promo_label": promo_info["promo_label"],
            "promo_discount_per_unit": promo_info["promo_discount"],
        })

    totals = calculate_totals(order_items, vat_percent)

    now = _now()
    order_number = _order_number()
    order_id = str(uuid4())

    # Detect existing account
    existing_account = await _detect_account(customer_email, customer_phone)
    linked_user_id = None
    account_link_status = "unlinked"
    if existing_account:
        linked_user_id = existing_account.get("id")
        account_link_status = "linked"

    # Extract and hydrate affiliate attribution
    attribution = extract_attribution_from_payload(payload)
    attribution = await hydrate_affiliate_from_code(db, attribution)
    attribution_block = build_attribution_block(attribution)

    order_doc = {
        "id": order_id,
        "order_number": order_number,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "customer_phone": customer_phone,
        "company_name": company_name,
        "customer_id": linked_user_id,
        "payer_name": "",
        "items": order_items,
        "total_amount": totals["total"],
        "total": totals["total"],
        "subtotal": totals["subtotal"],
        "vat_percent": totals["vat_percent"],
        "vat_amount": totals["vat_amount"],
        "tax": totals["vat_amount"],
        "discount": total_promo_discount,
        "promo_discount_total": total_promo_discount,
        "delivery_address": payload.get("delivery_address", ""),
        "city": payload.get("city", ""),
        "country": payload.get("country", "Tanzania"),
        "notes": payload.get("notes", ""),
        "status": "pending",
        "current_status": "awaiting_payment_proof",
        "payment_status": "pending_submission",
        "order_status": "awaiting_payment_proof",
        "pipeline_stage": "payment_verification",
        "type": "product",
        "source_type": "public_checkout",
        "is_guest_order": not bool(linked_user_id),
        "linked_user_id": linked_user_id,
        "account_link_status": account_link_status,
        "assigned_sales_id": None,
        "assigned_vendor_id": None,
        "approved_by": None,
        **attribution_block,
        "status_history": [{
            "status": "awaiting_payment_proof",
            "note": "Guest order submitted via public checkout",
            "timestamp": now,
        }],
        "created_at": now,
        "updated_at": now,
    }

    await db.orders.insert_one(order_doc)
    logger.info("Guest order created: %s (%s) by %s", order_number, order_id, customer_email)

    # Create guest account invite if no existing account
    account_info = None
    if not linked_user_id:
        from services.guest_checkout_activation_service import create_guest_account_link
        invite = await create_guest_account_link(
            db,
            guest_email=customer_email,
            order_id=order_id,
            customer_name=customer_name,
            customer_phone=customer_phone,
        )
        if invite:
            account_info = {
                "type": "create_account",
                "message": "Create your Konekt account to track this order",
                "invite_url": invite.get("invite_url", ""),
                "invite_token": invite.get("invite_token", ""),
            }
    else:
        account_info = {
            "type": "login",
            "message": "Log in to your Konekt account to track this order",
            "user_email": existing_account.get("email", ""),
        }

    # Get bank details for payment
    settings = await db.business_settings.find_one({}, {"_id": 0})
    bank = {}
    if settings:
        bank = {
            "bank_name": settings.get("bank_name", "CRDB Bank PLC"),
            "account_name": settings.get("account_name", "Konekt Ltd"),
            "account_number": settings.get("bank_account_number", ""),
            "swift": settings.get("swift_code", "CORUTZTZ"),
            "branch": settings.get("bank_branch", "Dar es Salaam"),
        }
    if not bank.get("account_number"):
        bank = {
            "bank_name": "CRDB Bank PLC",
            "account_name": "KONEKT LIMITED",
            "account_number": "015C8841347002",
            "swift": "CORUTZTZ",
            "branch": "Dar es Salaam Main",
        }

    # ─── NOTIFICATION HOOK: Order Confirmation ─────────────
    items_summary = ", ".join(
        f"{it['product_name']} x{it['quantity']}" for it in order_items
    )
    base_url = os.environ.get("FRONTEND_URL", "")
    await _notif().fire("customer_order_received", customer_email, {
        "customer_name": customer_name,
        "order_number": order_number,
        "total": f"{totals['total']:,.0f}",
        "items_summary": items_summary,
        "bank_name": bank.get("bank_name", ""),
        "account_name": bank.get("account_name", ""),
        "account_number": bank.get("account_number", ""),
        "payment_proof_link": f"{base_url}/payment-proof?order={order_number}&email={customer_email}",
        "account_link": f"{base_url}/login",
    })

    return {
        "ok": True,
        "order_id": order_id,
        "order_number": order_number,
        "subtotal": totals["subtotal"],
        "vat_percent": totals["vat_percent"],
        "vat_amount": totals["vat_amount"],
        "total": totals["total"],
        "items_count": len(order_items),
        "payment_status": "pending_submission",
        "bank_details": bank,
        "account_info": account_info,
    }


# ─── Guest Payment Proof ─────────────────────────────────

@router.post("/payment-proof")
async def public_payment_proof(payload: dict):
    """
    Submit payment proof for a guest order.
    Creates the same kind of record as the account payment proof flow.
    """
    order_number = (payload.get("order_number") or "").strip()
    email = (payload.get("email") or payload.get("customer_email") or "").strip().lower()

    if not order_number:
        raise HTTPException(400, "Order number is required")
    if not email:
        raise HTTPException(400, "Email is required for verification")

    # Find the order
    order = await db.orders.find_one({"order_number": order_number})
    if not order:
        raise HTTPException(404, "Order not found")

    # Verify email matches
    order_email = (order.get("customer_email") or "").strip().lower()
    if order_email != email:
        raise HTTPException(403, "Email does not match the order")

    now = _now()
    proof_doc = {
        "id": str(uuid4()),
        "order_id": order.get("id"),
        "order_number": order_number,
        "invoice_id": None,
        "customer_email": email,
        "customer_name": order.get("customer_name", ""),
        "customer_user_id": order.get("linked_user_id"),
        "customer_id": order.get("linked_user_id") or order.get("customer_id"),
        "amount_paid": float(payload.get("amount_paid", 0) or 0),
        "currency": payload.get("currency", "TZS"),
        "payment_date": payload.get("payment_date", now),
        "bank_reference": payload.get("bank_reference", ""),
        "payment_method": payload.get("payment_method", "bank_transfer"),
        "proof_file_url": payload.get("proof_file_url", ""),
        "proof_file_name": payload.get("proof_file_name", ""),
        "notes": payload.get("notes", ""),
        "payer_name": payload.get("payer_name") or order.get("customer_name", ""),
        "is_guest_submission": True,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
    }

    await db.payment_proof_submissions.insert_one(proof_doc)

    # ─── Mirror into payment_proofs for admin approval compatibility ──────
    # LiveCommerceService.approve_payment_proof() looks in this collection
    payment_proofs_doc = {
        "id": proof_doc["id"],
        "payment_id": None,  # Will be linked after canonical payment is created
        "invoice_id": proof_doc.get("invoice_id"),
        "order_id": proof_doc.get("order_id"),
        "order_number": order_number,
        "customer_id": proof_doc.get("customer_id"),
        "amount_paid": proof_doc.get("amount_paid", 0),
        "currency": proof_doc.get("currency", "TZS"),
        "proof_file_url": proof_doc.get("proof_file_url", ""),
        "proof_file_name": proof_doc.get("proof_file_name", ""),
        "payer_name": proof_doc.get("payer_name", ""),
        "payment_method": proof_doc.get("payment_method", "bank_transfer"),
        "bank_reference": proof_doc.get("bank_reference", ""),
        "notes": proof_doc.get("notes", ""),
        "status": "pending",
        "source": "guest_payment_proof",
        "is_guest_submission": True,
        "created_at": now,
        "updated_at": now,
    }
    await db.payment_proofs.insert_one(payment_proofs_doc)

    # ─── Canonical payment queue record (admin visibility) ──────
    # Upsert into db.payments so admin payment verification queue can see guest proofs
    order_oid = order.get("_id")
    canonical_payment = {
        "target_type": "order",
        "target_id": str(order_oid) if order_oid else order.get("id", ""),
        "order_id": order.get("id", ""),
        "order_number": order_number,
        "payer_name": proof_doc["payer_name"],
        "payer_email": email,
        "payer_phone": payload.get("phone", ""),
        "customer_name": order.get("customer_name", ""),
        "amount": float(proof_doc.get("amount_paid", 0) or 0),
        "currency": proof_doc.get("currency", "TZS"),
        "provider": "bank_transfer",
        "payment_method": "bank_transfer",
        "bank_reference": proof_doc.get("bank_reference", ""),
        "proof_file_url": proof_doc.get("proof_file_url", ""),
        "proof_file_name": proof_doc.get("proof_file_name", ""),
        "proof_submission_id": proof_doc["id"],
        "status": "pending",
        "review_status": "under_review",
        "source": "guest_payment_proof",
        "is_guest_submission": True,
        "notes": proof_doc.get("notes", ""),
        "created_at": now,
        "updated_at": now,
    }
    existing_payment = await db.payments.find_one({
        "target_type": "order",
        "order_number": order_number,
    })
    if existing_payment:
        await db.payments.update_one(
            {"_id": existing_payment["_id"]},
            {"$set": {
                "payer_name": canonical_payment["payer_name"],
                "payer_email": canonical_payment["payer_email"],
                "amount": canonical_payment["amount"],
                "bank_reference": canonical_payment["bank_reference"],
                "proof_file_url": canonical_payment["proof_file_url"],
                "proof_file_name": canonical_payment["proof_file_name"],
                "proof_submission_id": canonical_payment["proof_submission_id"],
                "status": "pending",
                "review_status": "under_review",
                "updated_at": now,
            }},
        )
        # Link payment_proofs entry to this payment
        pay_id = existing_payment.get("id")
        if pay_id:
            await db.payment_proofs.update_one(
                {"id": proof_doc["id"]},
                {"$set": {"payment_id": pay_id}},
            )
        logger.info("Updated existing payment record for order %s", order_number)
    else:
        result = await db.payments.insert_one(canonical_payment)
        # Link payment_proofs entry to the new payment
        new_pay = await db.payments.find_one({"_id": result.inserted_id}, {"_id": 0, "id": 1})
        if new_pay and new_pay.get("id"):
            await db.payment_proofs.update_one(
                {"id": proof_doc["id"]},
                {"$set": {"payment_id": new_pay["id"]}},
            )
        logger.info("Created canonical payment record for guest order %s", order_number)

    # Update order status
    await db.orders.update_one(
        {"id": order.get("id")},
        {"$set": {
            "payment_status": "pending_review",
            "order_status": "awaiting_payment_verification",
            "current_status": "awaiting_payment_verification",
            "pipeline_stage": "payment_verification",
            "payer_name": proof_doc["payer_name"],
            "updated_at": now,
        },
        "$push": {
            "status_history": {
                "status": "awaiting_payment_verification",
                "note": f"Payment proof submitted (Ref: {proof_doc['bank_reference'] or 'N/A'})",
                "timestamp": now,
            }
        }},
    )

    logger.info("Guest payment proof submitted for order %s by %s", order_number, email)

    # ─── NOTIFICATION HOOKS: Payment Proof ─────────────────
    base_url = os.environ.get("FRONTEND_URL", "")
    # Customer notification
    await _notif().fire("customer_payment_proof_received", email, {
        "customer_name": order.get("customer_name", ""),
        "order_number": order_number,
        "account_link": f"{base_url}/login",
    })
    # Admin notification
    admin_settings = await db.business_settings.find_one({}, {"_id": 0})
    admin_email = (admin_settings or {}).get("admin_email", "admin@konekt.co.tz")
    await _notif().fire("admin_payment_proof_submitted", admin_email, {
        "order_number": order_number,
        "customer_name": order.get("customer_name", ""),
        "customer_email": email,
        "amount": f"{proof_doc.get('amount_paid', 0):,.0f}",
        "payer_name": proof_doc.get("payer_name", ""),
        "bank_reference": proof_doc.get("bank_reference", ""),
        "is_guest": "Yes" if order.get("is_guest_order") else "No",
        "admin_link": f"{base_url}/admin/payments",
    })

    # Re-detect account for CTA
    existing_account = await _detect_account(email)
    account_info = None
    if existing_account:
        account_info = {
            "type": "login",
            "message": "Log in to your Konekt account to track this order",
            "user_email": existing_account.get("email", ""),
        }
    else:
        account_info = {
            "type": "create_account",
            "message": "Create your Konekt account to track this order",
        }

    return {
        "ok": True,
        "order_number": order_number,
        "payment_status": "pending_review",
        "message": "Payment proof submitted. Our team will verify and process your order.",
        "account_info": account_info,
    }


# ─── Order Status (public tracking) ──────────────────────

@router.get("/order-status/{order_number}")
async def public_order_status(order_number: str, email: str = ""):
    """Allow guest to check order status by order number + email."""
    order = await db.orders.find_one(
        {"order_number": order_number},
        {"_id": 0, "id": 1, "order_number": 1, "status": 1, "current_status": 1,
         "payment_status": 1, "total": 1, "items": 1, "created_at": 1,
         "customer_name": 1, "customer_email": 1},
    )
    if not order:
        raise HTTPException(404, "Order not found")

    if email:
        order_email = (order.get("customer_email") or "").lower()
        if order_email != email.strip().lower():
            raise HTTPException(403, "Email does not match")

    # Strip sensitive fields
    order.pop("customer_email", None)
    return order


# ─── Payment Proof File Upload ────────────────────────────

PROOF_UPLOAD_DIR = "/app/backend/uploads/payment_proofs"
os.makedirs(PROOF_UPLOAD_DIR, exist_ok=True)
ALLOWED_PROOF_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
MAX_PROOF_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/upload-proof-file")
async def upload_proof_file(file: UploadFile = File(...)):
    """Upload a payment proof image or PDF. Returns the file URL."""
    if not file.filename:
        raise HTTPException(400, "No filename provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_PROOF_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type. Allowed: {', '.join(ALLOWED_PROOF_EXTENSIONS)}")

    content = await file.read()
    if len(content) > MAX_PROOF_SIZE:
        raise HTTPException(400, "File too large. Max size: 10MB")

    file_id = str(uuid4())
    safe_name = f"{file_id}{ext}"
    full_path = os.path.join(PROOF_UPLOAD_DIR, safe_name)

    with open(full_path, "wb") as f:
        f.write(content)

    return {
        "ok": True,
        "file_name": file.filename,
        "url": f"/uploads/payment_proofs/{safe_name}",
        "size": len(content),
        "content_type": file.content_type,
    }
