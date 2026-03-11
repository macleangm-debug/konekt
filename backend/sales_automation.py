"""
Sales Automation Engine for Konekt Platform
Handles automated sales tasks like abandoned cart recovery, follow-ups, etc.
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid

logger = logging.getLogger(__name__)


class SalesAutomationEngine:
    """Automation engine for running scheduled sales tasks"""
    
    def __init__(self, db, email_service):
        self.db = db
        self.email_service = email_service
        self.is_running = False
    
    async def start(self):
        """Start the automation engine"""
        self.is_running = True
        logger.info("Sales Automation Engine started")
        asyncio.create_task(self._run_loop())
    
    async def stop(self):
        """Stop the automation engine"""
        self.is_running = False
        logger.info("Sales Automation Engine stopped")
    
    async def _run_loop(self):
        """Main loop that checks for automation triggers"""
        while self.is_running:
            try:
                await self._process_automations()
                await asyncio.sleep(300)  # Check every 5 minutes
            except Exception as e:
                logger.error(f"Automation loop error: {e}")
                await asyncio.sleep(60)  # Wait 1 minute on error
    
    async def _process_automations(self):
        """Process all active automation rules"""
        rules = await self.db.automation_rules.find({"is_active": True}, {"_id": 0}).to_list(100)
        
        for rule in rules:
            try:
                await self._process_rule(rule)
            except Exception as e:
                logger.error(f"Error processing rule {rule['id']}: {e}")
    
    async def _process_rule(self, rule: dict):
        """Process a single automation rule"""
        trigger_event = rule.get("trigger_event")
        
        if trigger_event == "cart_abandoned":
            await self._process_abandoned_cart(rule)
        elif trigger_event == "order_delivered":
            await self._process_order_delivered(rule)
        elif trigger_event == "customer_inactive":
            await self._process_inactive_customer(rule)
        elif trigger_event == "customer_birthday":
            await self._process_birthday(rule)
        elif trigger_event == "reorder_reminder":
            await self._process_reorder_reminder(rule)
        elif trigger_event == "quote_pending":
            await self._process_pending_quote(rule)
    
    async def _process_abandoned_cart(self, rule: dict):
        """Process abandoned cart automation"""
        delay_hours = rule.get("trigger_delay_hours", 24)
        cutoff_time = (datetime.now(timezone.utc) - timedelta(hours=delay_hours)).isoformat()
        min_value = rule.get("target_criteria", {}).get("min_cart_value", 0)
        
        # Find abandoned carts (users with saved drafts but no recent orders)
        # This is a simplified version - in production would track cart sessions
        abandoned = await self.db.drafts.find({
            "created_at": {"$lt": cutoff_time},
            "automation_processed": {"$ne": True},
            "total_value": {"$gte": min_value}
        }, {"_id": 0}).to_list(100)
        
        for cart in abandoned:
            user = await self.db.users.find_one({"id": cart.get("user_id")}, {"_id": 0})
            if user:
                await self._create_automated_task(
                    rule=rule,
                    title=f"Abandoned Cart - {user.get('full_name', user['email'])}",
                    description=f"Customer left items in cart worth TZS {cart.get('total_value', 0):,.0f}",
                    customer_id=user["id"],
                    action_data={"cart_id": cart.get("id"), "email": user["email"]}
                )
                
                # Mark as processed
                await self.db.drafts.update_one(
                    {"id": cart["id"]},
                    {"$set": {"automation_processed": True}}
                )
    
    async def _process_order_delivered(self, rule: dict):
        """Process order delivered follow-up automation"""
        delay_hours = rule.get("trigger_delay_hours", 48)
        cutoff_time = (datetime.now(timezone.utc) - timedelta(hours=delay_hours)).isoformat()
        
        # Find delivered orders that need follow-up
        orders = await self.db.orders.find({
            "current_status": "delivered",
            "delivered_at": {"$lt": cutoff_time},
            "follow_up_sent": {"$ne": True}
        }, {"_id": 0}).to_list(100)
        
        for order in orders:
            user = await self.db.users.find_one({"id": order.get("user_id")}, {"_id": 0})
            if user:
                await self._create_automated_task(
                    rule=rule,
                    title=f"Follow-up - Order {order.get('order_number')}",
                    description="Send follow-up email requesting review and feedback",
                    customer_id=user["id"],
                    order_id=order["id"],
                    action_data={"email": user["email"], "order_number": order.get("order_number")}
                )
                
                # Mark as processed
                await self.db.orders.update_one(
                    {"id": order["id"]},
                    {"$set": {"follow_up_sent": True}}
                )
    
    async def _process_inactive_customer(self, rule: dict):
        """Process win-back campaign for inactive customers"""
        inactive_days = rule.get("target_criteria", {}).get("inactive_days", 90)
        cutoff_time = (datetime.now(timezone.utc) - timedelta(days=inactive_days)).isoformat()
        
        # Find inactive customers
        inactive_users = await self.db.users.find({
            "role": "customer",
            "last_order_date": {"$lt": cutoff_time},
            "winback_sent": {"$ne": True}
        }, {"_id": 0}).to_list(100)
        
        for user in inactive_users:
            await self._create_automated_task(
                rule=rule,
                title=f"Win-back - {user.get('full_name', user['email'])}",
                description=f"Customer inactive for {inactive_days}+ days",
                customer_id=user["id"],
                action_data={"email": user["email"]}
            )
            
            await self.db.users.update_one(
                {"id": user["id"]},
                {"$set": {"winback_sent": True}}
            )
    
    async def _process_birthday(self, rule: dict):
        """Process birthday offer automation"""
        today = datetime.now(timezone.utc).strftime("%m-%d")
        
        # Find users with birthday today (stored as YYYY-MM-DD)
        users = await self.db.users.find({
            "birthday": {"$regex": f"-{today}$"},
            "birthday_offer_sent_year": {"$ne": datetime.now().year}
        }, {"_id": 0}).to_list(100)
        
        for user in users:
            await self._create_automated_task(
                rule=rule,
                title=f"Birthday Offer - {user.get('full_name', user['email'])}",
                description="Send birthday discount offer",
                customer_id=user["id"],
                action_data={"email": user["email"]}
            )
            
            await self.db.users.update_one(
                {"id": user["id"]},
                {"$set": {"birthday_offer_sent_year": datetime.now().year}}
            )
    
    async def _process_reorder_reminder(self, rule: dict):
        """Process reorder reminder automation"""
        reminder_days = rule.get("target_criteria", {}).get("days_since_order", 30)
        cutoff_time = (datetime.now(timezone.utc) - timedelta(days=reminder_days)).isoformat()
        
        # Find orders that are candidates for reorder reminder
        orders = await self.db.orders.find({
            "current_status": "delivered",
            "delivered_at": {"$lt": cutoff_time},
            "reorder_reminder_sent": {"$ne": True}
        }, {"_id": 0}).to_list(100)
        
        for order in orders:
            user = await self.db.users.find_one({"id": order.get("user_id")}, {"_id": 0})
            if user:
                await self._create_automated_task(
                    rule=rule,
                    title=f"Reorder Reminder - {user.get('full_name', user['email'])}",
                    description=f"Suggest reorder for previous order {order.get('order_number')}",
                    customer_id=user["id"],
                    order_id=order["id"],
                    action_data={"email": user["email"], "previous_items": order.get("items", [])}
                )
                
                await self.db.orders.update_one(
                    {"id": order["id"]},
                    {"$set": {"reorder_reminder_sent": True}}
                )
    
    async def _process_pending_quote(self, rule: dict):
        """Process pending quote follow-up"""
        delay_hours = rule.get("trigger_delay_hours", 48)
        cutoff_time = (datetime.now(timezone.utc) - timedelta(hours=delay_hours)).isoformat()
        
        # Find sent quotes without response
        quotes = await self.db.quotes.find({
            "status": "sent",
            "sent_at": {"$lt": cutoff_time},
            "follow_up_task_created": {"$ne": True}
        }, {"_id": 0}).to_list(100)
        
        for quote in quotes:
            await self._create_automated_task(
                rule=rule,
                title=f"Quote Follow-up - {quote.get('quote_number')}",
                description=f"Follow up on quote sent to {quote.get('customer_name')}",
                quote_id=quote["id"],
                customer_id=quote.get("customer_id"),
                action_data={"email": quote.get("customer_email"), "quote_number": quote.get("quote_number")}
            )
            
            await self.db.quotes.update_one(
                {"id": quote["id"]},
                {"$set": {"follow_up_task_created": True}}
            )
    
    async def _create_automated_task(
        self,
        rule: dict,
        title: str,
        description: str,
        customer_id: Optional[str] = None,
        lead_id: Optional[str] = None,
        order_id: Optional[str] = None,
        quote_id: Optional[str] = None,
        action_data: Optional[dict] = None
    ):
        """Create an automated task based on rule"""
        task_id = str(uuid.uuid4())
        
        # Determine if this should create a task or send email directly
        action_type = rule.get("action_type", "task")
        
        if action_type == "email" and action_data and action_data.get("email"):
            # Send email directly (simplified - would use templates in production)
            try:
                await self.email_service.send_email(
                    to_email=action_data["email"],
                    subject=title,
                    html_content=f"<p>{description}</p><p>Please visit our store for more details.</p>"
                )
                logger.info(f"Automated email sent for rule {rule['id']}")
            except Exception as e:
                logger.error(f"Failed to send automated email: {e}")
        
        # Always create a task for tracking
        task_doc = {
            "id": task_id,
            "title": title,
            "description": description,
            "task_type": rule.get("task_type"),
            "priority": "medium",
            "status": "pending" if action_type == "task" else "completed",
            "is_automated": True,
            "automation_rule_id": rule["id"],
            "lead_id": lead_id,
            "customer_id": customer_id,
            "order_id": order_id,
            "quote_id": quote_id,
            "assigned_to": rule.get("action_config", {}).get("default_assignee"),
            "assigned_by": "automation",
            "due_date": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "reminder_date": None,
            "completed_at": datetime.now(timezone.utc).isoformat() if action_type == "email" else None,
            "notes": [],
            "outcome": "Email sent automatically" if action_type == "email" else None,
            "action_data": action_data,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.sales_tasks.insert_one(task_doc)
        
        # Update rule stats
        await self.db.automation_rules.update_one(
            {"id": rule["id"]},
            {
                "$inc": {"total_triggered": 1},
                "$set": {"last_triggered": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        logger.info(f"Created automated task {task_id} from rule {rule['id']}")
        return task_id


# Global instance (will be initialized in server.py)
automation_engine: Optional[SalesAutomationEngine] = None


def get_automation_engine():
    return automation_engine


def init_automation_engine(db, email_service):
    global automation_engine
    automation_engine = SalesAutomationEngine(db, email_service)
    return automation_engine
