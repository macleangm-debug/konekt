from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import os
import jwt

router = APIRouter(prefix="/api/customer/referrals", tags=["Customer Referrals"])
security = HTTPBearer(auto_error=False)

mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'konekt')]

JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
JWT_ALGORITHM = "HS256"

# ── Milestone definitions ──
REFERRAL_COUNT_MILESTONES = [1, 5, 10, 25, 50]
EARNINGS_MILESTONES = [10_000, 50_000, 100_000, 250_000, 500_000]


def serialize_doc(doc):
    if doc is None:
        return None
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


def compute_milestones(successful_referrals: int, total_earned: float):
    """Compute milestone progress from referral count and earnings. Pure function."""
    # Referral count milestones
    count_achieved = [m for m in REFERRAL_COUNT_MILESTONES if successful_referrals >= m]
    next_count = next((m for m in REFERRAL_COUNT_MILESTONES if successful_referrals < m), None)

    # Earnings milestones
    earned_achieved = [m for m in EARNINGS_MILESTONES if total_earned >= m]
    next_earning = next((m for m in EARNINGS_MILESTONES if total_earned < m), None)

    return {
        "referrals": {
            "current": successful_referrals,
            "achieved": count_achieved,
            "next_target": next_count,
            "all_complete": next_count is None,
        },
        "earnings": {
            "current": total_earned,
            "achieved": earned_achieved,
            "next_target": next_earning,
            "all_complete": next_earning is None,
        },
    }


async def check_and_send_milestone_notification(user_id: str, successful_referrals: int, total_earned: float):
    """Check if a NEW milestone was just reached and send a notification if so."""
    # Get previously notified milestones
    user_milestones = await db.user_milestones.find_one({"user_id": user_id}, {"_id": 0})
    notified_counts = set((user_milestones or {}).get("notified_counts", []))
    notified_earnings = set((user_milestones or {}).get("notified_earnings", []))

    new_counts = [m for m in REFERRAL_COUNT_MILESTONES if successful_referrals >= m and m not in notified_counts]
    new_earnings = [m for m in EARNINGS_MILESTONES if total_earned >= m and m not in notified_earnings]

    if not new_counts and not new_earnings:
        return

    # Record all reached milestones
    await db.user_milestones.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "notified_counts": list(notified_counts | set(new_counts)),
            "notified_earnings": list(notified_earnings | set(new_earnings)),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    # Send notification for the highest new milestone
    try:
        from services.in_app_notification_service import create_in_app_notification
        if new_counts:
            top = max(new_counts)
            await create_in_app_notification(
                db,
                event_key="referral_milestone",
                recipient_user_id=user_id,
                recipient_role="customer",
                entity_type="milestone",
                entity_id=str(top),
                context={"milestone_value": str(top), "milestone_type": "referrals"},
                skip_pref_check=True,
            )
        if new_earnings:
            top = max(new_earnings)
            await create_in_app_notification(
                db,
                event_key="referral_milestone",
                recipient_user_id=user_id,
                recipient_role="customer",
                entity_type="milestone",
                entity_id=str(top),
                context={"milestone_value": f"{int(top):,}", "milestone_type": "earnings"},
                skip_pref_check=True,
            )
    except Exception:
        pass  # non-critical


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get("/me")
async def get_my_referrals(user: dict = Depends(get_current_user)):
    """Get current user's referral stats, wallet balance, and transactions."""
    user_id = user.get("id")

    # Get referral transactions where this user is the referrer
    transactions = await db.referral_transactions.find(
        {"referrer_id": user_id}
    ).sort("created_at", -1).to_list(length=200)

    # Calculate stats
    credited_txns = [t for t in transactions if t.get("status") == "credited"]
    total_earned = sum(t.get("reward_amount", 0) for t in credited_txns)
    successful_referrals = len(credited_txns)

    # Get wallet balance (credit_balance on user record)
    fresh_user = await db.users.find_one({"id": user_id}, {"_id": 0, "credit_balance": 1})
    wallet_balance = float(fresh_user.get("credit_balance", 0)) if fresh_user else 0

    # Calculate total used (from wallet usage transactions)
    wallet_usage_txns = await db.wallet_transactions.find(
        {"user_id": user_id, "type": "debit"}
    ).to_list(length=500)
    total_used = sum(abs(t.get("amount", 0)) for t in wallet_usage_txns)

    # Get referral settings for share messages and rules
    settings = await db.referral_settings.find_one({}, {"_id": 0})
    share_message = "I've been using Konekt for branded products and design services. Join using my link: {referral_link}"
    whatsapp_message = "Join Konekt with my referral link: {referral_link}"

    if settings:
        share_message = settings.get("share_message", share_message)
        whatsapp_message = settings.get("whatsapp_message", whatsapp_message)

    # Get wallet usage rules from admin settings
    hub = await db.admin_settings.find_one({"key": "settings_hub"}, {"_id": 0})
    commercial = {}
    if hub and hub.get("value"):
        commercial = hub["value"].get("commercial", {})
    max_wallet_usage_pct = commercial.get("max_wallet_usage_pct", 30)

    frontend_url = os.environ.get('FRONTEND_URL') or os.environ.get('REACT_APP_BACKEND_URL', '')

    # Compute milestones
    milestones = compute_milestones(successful_referrals, total_earned)

    # Check for new milestone notifications (fire-and-forget)
    try:
        await check_and_send_milestone_notification(user_id, successful_referrals, total_earned)
    except Exception:
        pass

    return {
        "referral_code": user.get("referral_code", ""),
        "referral_link": f"{frontend_url}/register?ref={user.get('referral_code', '')}",
        "wallet": {
            "balance": wallet_balance,
            "total_earned": total_earned,
            "total_used": total_used,
        },
        "stats": {
            "total_referrals": len(transactions),
            "successful_referrals": successful_referrals,
            "reward_earned": total_earned,
        },
        "milestones": milestones,
        "max_wallet_usage_pct": max_wallet_usage_pct,
        "referral_transactions": [serialize_doc(t) for t in transactions],
        "share_message": share_message,
        "whatsapp_message": whatsapp_message,
    }


@router.get("/stats")
async def get_referral_stats(user: dict = Depends(get_current_user)):
    """Get summary stats for current user's referrals."""
    user_id = user.get("id")

    transactions = await db.referral_transactions.find(
        {"referrer_id": user_id}
    ).to_list(length=1000)

    credited = [t for t in transactions if t.get("status") == "credited"]

    fresh_user = await db.users.find_one({"id": user_id}, {"_id": 0, "credit_balance": 1})
    wallet_balance = float(fresh_user.get("credit_balance", 0)) if fresh_user else 0

    return {
        "referral_code": user.get("referral_code", ""),
        "total_referrals": len(transactions),
        "successful_referrals": len(credited),
        "total_earned": sum(t.get("reward_amount", 0) for t in credited),
        "wallet_balance": wallet_balance,
    }


@router.get("/overview")
async def get_referral_overview(user: dict = Depends(get_current_user)):
    """Get overview for dashboard — referral, wallet, and earn data."""
    user_id = user.get("id")

    # Referral stats
    transactions = await db.referral_transactions.find(
        {"referrer_id": user_id}
    ).to_list(length=500)
    credited = [t for t in transactions if t.get("status") == "credited"]
    total_earned = sum(t.get("reward_amount", 0) for t in credited)

    # Wallet balance
    fresh_user = await db.users.find_one({"id": user_id}, {"_id": 0, "credit_balance": 1})
    wallet_balance = float(fresh_user.get("credit_balance", 0)) if fresh_user else 0

    milestones = compute_milestones(len(credited), total_earned)

    return {
        "referral_code": user.get("referral_code", ""),
        "wallet_balance": wallet_balance,
        "total_earned": total_earned,
        "successful_referrals": len(credited),
        "total_referrals": len(transactions),
        "milestones": milestones,
    }


@router.get("/wallet-usage-rules")
async def get_wallet_usage_rules(user: dict = Depends(get_current_user)):
    """Get wallet usage rules for the current user (checkout context)."""
    user_id = user.get("id")
    fresh_user = await db.users.find_one({"id": user_id}, {"_id": 0, "credit_balance": 1})
    wallet_balance = float(fresh_user.get("credit_balance", 0)) if fresh_user else 0

    hub = await db.admin_settings.find_one({"key": "settings_hub"}, {"_id": 0})
    commercial = {}
    if hub and hub.get("value"):
        commercial = hub["value"].get("commercial", {})
    max_wallet_usage_pct = commercial.get("max_wallet_usage_pct", 30)

    return {
        "wallet_balance": wallet_balance,
        "max_wallet_usage_pct": max_wallet_usage_pct,
    }
