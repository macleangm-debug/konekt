"""
Commission Trigger Service
Triggers commission creation when payments are approved.
Links Payment → Commission → Payout chain.
"""

from datetime import datetime, timezone
from bson import ObjectId

async def trigger_commission_on_payment_approval(db, invoice_id: str, proof: dict):
    """
    Trigger commission creation when payment is approved.
    This ensures the Payment → Commission → Payout chain works correctly.

    Honours `products.promo_blocks.{affiliate,sales}=true` — line totals for
    products whose pool was already given away as a customer discount during
    an active promo are excluded from the per-channel base before commission
    is computed.
    """
    try:
        from services.promo_blocks_service import compute_eligible_amount, resolve_order_items

        # Get the invoice/order to find attribution
        invoice = None
        order = None
        
        if invoice_id:
            try:
                invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
            except:
                invoice = await db.invoices.find_one({"invoice_number": invoice_id})
        
        order_id = proof.get("order_id") or (invoice.get("order_id") if invoice else None)
        if order_id:
            try:
                order = await db.orders.find_one({"_id": ObjectId(order_id)})
            except:
                pass
        
        # Determine the amount for commission calculation
        amount_paid = float(proof.get("amount_paid", 0) or 0)
        if amount_paid <= 0:
            return None
        
        # Check for attribution records (affiliate/sales)
        attribution = None
        customer_email = proof.get("customer_email") or (invoice.get("customer_email") if invoice else None)
        
        if customer_email:
            attribution = await db.attribution_records.find_one({
                "customer_email": customer_email
            }, sort=[("created_at", -1)])
        
        # Get commission settings
        settings = await db.commission_settings.find_one({"is_active": True})
        if not settings:
            settings = {
                "company_markup_percent": 20,
                "extra_sell_percent": 10,
                "affiliate_percent": 10,
                "sales_self_lead_percent": 15,
                "sales_affiliate_lead_percent": 10,
            }
        
        # Calculate distributable amount
        base_protected = amount_paid * (settings.get("company_markup_percent", 20) / 100)
        distributable = amount_paid * (settings.get("extra_sell_percent", 10) / 100)

        # Compute per-channel eligible distributable — exclude blocked lines.
        items = await resolve_order_items(
            db,
            order_id=str(order_id) if order_id else None,
            invoice_id=str(invoice_id) if invoice_id else None,
        )
        affiliate_eligible_amount = amount_paid
        sales_eligible_amount = amount_paid
        affiliate_blocked: list[str] = []
        sales_blocked: list[str] = []
        if items:
            aff_amt, aff_blk = await compute_eligible_amount(db, items, "affiliate")
            sal_amt, sal_blk = await compute_eligible_amount(db, items, "sales")
            if aff_amt > 0 or aff_blk:
                affiliate_eligible_amount = aff_amt
                affiliate_blocked = aff_blk
            if sal_amt > 0 or sal_blk:
                sales_eligible_amount = sal_amt
                sales_blocked = sal_blk

        def _scaled(base: float, eligible: float) -> float:
            if base <= 0:
                return 0.0
            return distributable * (eligible / base)

        affiliate_distributable = _scaled(amount_paid, affiliate_eligible_amount)
        sales_distributable = _scaled(amount_paid, sales_eligible_amount)

        commissions_created = []
        now = datetime.now(timezone.utc)
        
        # Determine lead source
        is_affiliate_lead = attribution and attribution.get("source_type") == "affiliate"
        affiliate_user_id = attribution.get("affiliate_user_id") if attribution else None
        sales_user_id = attribution.get("sales_user_id") if attribution else None
        
        # If no sales attribution, try to find from order/opportunity
        if not sales_user_id and order:
            sales_user_id = order.get("assigned_sales_id")
        
        # Create affiliate commission if applicable
        if is_affiliate_lead and affiliate_user_id and affiliate_distributable > 0:
            affiliate_percent = settings.get("affiliate_percent", 10)
            affiliate_amount = affiliate_distributable * (affiliate_percent / 100)

            affiliate_commission = {
                "beneficiary_type": "affiliate",
                "beneficiary_user_id": affiliate_user_id,
                "beneficiary_name": attribution.get("affiliate_name", ""),
                "order_id": str(order_id) if order_id else None,
                "invoice_id": str(invoice_id) if invoice_id else None,
                "payment_proof_id": str(proof.get("_id", "")),
                "base_amount": amount_paid,
                "eligible_amount": round(affiliate_eligible_amount, 2),
                "blocked_product_ids": affiliate_blocked,
                "distributable_amount": round(affiliate_distributable, 2),
                "commission_percent": affiliate_percent,
                "amount": affiliate_amount,
                "currency": proof.get("currency", "TZS"),
                "status": "pending",  # pending → approved → paid
                "lead_source": "affiliate",
                "created_at": now,
                "updated_at": now,
            }
            result = await db.commission_records.insert_one(affiliate_commission)
            commissions_created.append({
                "type": "affiliate",
                "id": str(result.inserted_id),
                "amount": affiliate_amount
            })
            
            # Trigger "You just earned" notification for affiliate
            await trigger_earned_notification(
                db, 
                user_id=affiliate_user_id, 
                amount=affiliate_amount,
                currency=proof.get("currency", "TZS"),
                commission_type="affiliate"
            )
        
        # Create sales commission
        if sales_user_id and sales_distributable > 0:
            # Reduced commission if affiliate lead, full if self-generated
            if is_affiliate_lead:
                sales_percent = settings.get("sales_affiliate_lead_percent", 10)
            else:
                sales_percent = settings.get("sales_self_lead_percent", 15)

            sales_amount = sales_distributable * (sales_percent / 100)

            sales_commission = {
                "beneficiary_type": "sales",
                "beneficiary_user_id": sales_user_id,
                "beneficiary_name": "",  # Will be populated from user lookup if needed
                "order_id": str(order_id) if order_id else None,
                "invoice_id": str(invoice_id) if invoice_id else None,
                "payment_proof_id": str(proof.get("_id", "")),
                "base_amount": amount_paid,
                "eligible_amount": round(sales_eligible_amount, 2),
                "blocked_product_ids": sales_blocked,
                "distributable_amount": round(sales_distributable, 2),
                "commission_percent": sales_percent,
                "amount": sales_amount,
                "currency": proof.get("currency", "TZS"),
                "status": "pending",
                "lead_source": "affiliate" if is_affiliate_lead else "self",
                "created_at": now,
                "updated_at": now,
            }
            result = await db.commission_records.insert_one(sales_commission)
            commissions_created.append({
                "type": "sales",
                "id": str(result.inserted_id),
                "amount": sales_amount
            })
            
            # Trigger "You just earned" notification for sales
            await trigger_earned_notification(
                db, 
                user_id=sales_user_id, 
                amount=sales_amount,
                currency=proof.get("currency", "TZS"),
                commission_type="sales"
            )
        
        return {
            "commissions_created": commissions_created,
            "total_commission": sum(c["amount"] for c in commissions_created)
        }
        
    except Exception as e:
        print(f"Error triggering commission: {e}")
        return None


async def trigger_earned_notification(db, user_id: str, amount: float, currency: str, commission_type: str):
    """
    Send 'You just earned' notification when commission is created.
    """
    try:
        notification = {
            "user_id": user_id,
            "type": "success",
            "title": "You just earned!",
            "message": f"You earned {currency} {amount:,.0f} from a {commission_type} commission.",
            "action_url": f"/partner/affiliate-earnings" if commission_type == "affiliate" else "/staff/commission-dashboard",
            "status": "unread",
            "created_at": datetime.now(timezone.utc),
        }
        await db.notifications.insert_one(notification)
    except Exception as e:
        print(f"Warning: Failed to send earned notification: {e}")


async def get_payout_progress(db, user_id: str, user_type: str = "affiliate"):
    """
    Get payout progress - how much more needed to reach threshold.
    """
    try:
        # Get payout settings
        settings = await db.payout_settings.find_one({"is_active": True})
        threshold = settings.get("minimum_threshold", 50000) if settings else 50000
        
        # Get pending commission total
        pipeline = [
            {
                "$match": {
                    "beneficiary_user_id": user_id,
                    "beneficiary_type": user_type,
                    "status": {"$in": ["pending", "approved"]}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": "$amount"}
                }
            }
        ]
        
        result = await db.commission_records.aggregate(pipeline).to_list(1)
        current_balance = result[0]["total"] if result else 0
        
        remaining = max(0, threshold - current_balance)
        progress_percent = min(100, (current_balance / threshold) * 100) if threshold > 0 else 100
        
        return {
            "current_balance": current_balance,
            "threshold": threshold,
            "remaining_to_threshold": remaining,
            "progress_percent": round(progress_percent, 1),
            "ready_for_payout": current_balance >= threshold
        }
    except Exception as e:
        print(f"Error getting payout progress: {e}")
        return {
            "current_balance": 0,
            "threshold": 50000,
            "remaining_to_threshold": 50000,
            "progress_percent": 0,
            "ready_for_payout": False
        }
