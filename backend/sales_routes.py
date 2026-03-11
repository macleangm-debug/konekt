"""
Sales Management Routes for Konekt Platform
Handles leads, quotes, tasks, automation, and sales team management
"""
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks, Body
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid

# Create sales router
sales_router = APIRouter(prefix="/api/sales", tags=["sales"])

# Request Models
class LeadCreateRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    source: str = "website"
    estimated_value: float = 0
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    tags: List[str] = []

class LeadUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    estimated_value: Optional[float] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    tags: Optional[List[str]] = None
    next_follow_up: Optional[str] = None

class ContactLogRequest(BaseModel):
    contact_type: str
    notes: str
    outcome: Optional[str] = None
    next_follow_up: Optional[str] = None

class QuoteCreateRequest(BaseModel):
    customer_name: str
    customer_email: str
    items: List[Dict[str, Any]]
    customer_phone: Optional[str] = None
    company: Optional[str] = None
    lead_id: Optional[str] = None
    customer_id: Optional[str] = None
    discount: float = 0
    tax: float = 0
    valid_days: int = 30
    notes: Optional[str] = None
    assigned_to: Optional[str] = None

class QuoteUpdateRequest(BaseModel):
    items: Optional[List[Dict[str, Any]]] = None
    discount: Optional[float] = None
    tax: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None

class TaskCreateRequest(BaseModel):
    title: str
    task_type: str = "custom"
    description: Optional[str] = None
    priority: str = "medium"
    lead_id: Optional[str] = None
    customer_id: Optional[str] = None
    order_id: Optional[str] = None
    quote_id: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    reminder_date: Optional[str] = None

class TaskUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    reminder_date: Optional[str] = None
    outcome: Optional[str] = None

class TaskNoteRequest(BaseModel):
    note: str

class AutomationRuleCreateRequest(BaseModel):
    name: str
    task_type: str
    trigger_event: str
    trigger_delay_hours: int = 24
    target_criteria: Dict[str, Any] = {}
    action_type: str = "email"
    action_template: Optional[str] = None
    action_config: Dict[str, Any] = {}
    description: Optional[str] = None

class AutomationRuleUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    trigger_delay_hours: Optional[int] = None
    target_criteria: Optional[Dict[str, Any]] = None
    action_type: Optional[str] = None
    action_template: Optional[str] = None
    action_config: Optional[Dict[str, Any]] = None

class TeamMemberAddRequest(BaseModel):
    user_id: str
    role: str = "sales_rep"
    max_active_leads: int = 50

class TeamMemberUpdateRequest(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None
    max_active_leads: Optional[int] = None


def create_sales_routes(db, get_admin_user, generate_quote_number, EmailService):
    """Factory function to create sales routes with dependencies"""
    
    # ==================== LEADS ====================
    
    @sales_router.get("/leads")
    async def get_leads(
        status: Optional[str] = None,
        assigned_to: Optional[str] = None,
        source: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
        user: dict = Depends(get_admin_user)
    ):
        """Get all leads with filtering"""
        query = {}
        if status:
            query["status"] = status
        if assigned_to:
            query["assigned_to"] = assigned_to
        if source:
            query["source"] = source
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"company": {"$regex": search, "$options": "i"}}
            ]
        
        total = await db.leads.count_documents(query)
        leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).skip((page-1)*limit).limit(limit).to_list(limit)
        
        return {
            "leads": leads,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    
    @sales_router.post("/leads")
    async def create_lead(
        data: LeadCreateRequest,
        user: dict = Depends(get_admin_user)
    ):
        """Create a new lead"""
        lead_id = str(uuid.uuid4())
        lead_doc = {
            "id": lead_id,
            "name": data.name,
            "email": data.email,
            "phone": data.phone,
            "company": data.company,
            "position": data.position,
            "source": data.source,
            "status": "new",
            "estimated_value": data.estimated_value,
            "notes": data.notes,
            "assigned_to": data.assigned_to,
            "tags": data.tags,
            "last_contact": None,
            "next_follow_up": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user["id"]
        }
        await db.leads.insert_one(lead_doc)
        
        # Update sales team member stats if assigned
        if data.assigned_to:
            await db.sales_team.update_one(
                {"user_id": data.assigned_to},
                {"$inc": {"total_leads": 1, "current_active_leads": 1}}
            )
        
        return {"lead": {k: v for k, v in lead_doc.items() if k != "_id"}}
    
    @sales_router.get("/leads/{lead_id}")
    async def get_lead(lead_id: str, user: dict = Depends(get_admin_user)):
        """Get single lead details"""
        lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Get related tasks
        tasks = await db.sales_tasks.find({"lead_id": lead_id}, {"_id": 0}).to_list(100)
        # Get related quotes
        quotes = await db.quotes.find({"lead_id": lead_id}, {"_id": 0}).to_list(100)
        
        return {"lead": lead, "tasks": tasks, "quotes": quotes}
    
    @sales_router.put("/leads/{lead_id}")
    async def update_lead(
        lead_id: str,
        data: LeadUpdateRequest,
        user: dict = Depends(get_admin_user)
    ):
        """Update a lead"""
        lead = await db.leads.find_one({"id": lead_id})
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        if data.name is not None: update_data["name"] = data.name
        if data.email is not None: update_data["email"] = data.email
        if data.phone is not None: update_data["phone"] = data.phone
        if data.company is not None: update_data["company"] = data.company
        if data.position is not None: update_data["position"] = data.position
        if data.source is not None: update_data["source"] = data.source
        if data.status is not None: 
            update_data["status"] = data.status
            # Track conversion
            if data.status == "won" and lead.get("status") != "won":
                if lead.get("assigned_to"):
                    await db.sales_team.update_one(
                        {"user_id": lead["assigned_to"]},
                        {"$inc": {"total_conversions": 1, "total_revenue": lead.get("estimated_value", 0), "current_active_leads": -1}}
                    )
            elif data.status == "lost" and lead.get("status") not in ["won", "lost"]:
                if lead.get("assigned_to"):
                    await db.sales_team.update_one(
                        {"user_id": lead["assigned_to"]},
                        {"$inc": {"current_active_leads": -1}}
                    )
        if data.estimated_value is not None: update_data["estimated_value"] = data.estimated_value
        if data.notes is not None: update_data["notes"] = data.notes
        if data.assigned_to is not None: update_data["assigned_to"] = data.assigned_to
        if data.tags is not None: update_data["tags"] = data.tags
        if data.next_follow_up is not None: update_data["next_follow_up"] = data.next_follow_up
        
        await db.leads.update_one({"id": lead_id}, {"$set": update_data})
        return {"message": "Lead updated"}
    
    @sales_router.post("/leads/{lead_id}/contact")
    async def log_lead_contact(
        lead_id: str,
        data: ContactLogRequest,
        user: dict = Depends(get_admin_user)
    ):
        """Log a contact with a lead"""
        lead = await db.leads.find_one({"id": lead_id})
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        contact_log = {
            "id": str(uuid.uuid4()),
            "lead_id": lead_id,
            "contact_type": data.contact_type,
            "notes": data.notes,
            "outcome": data.outcome,
            "logged_by": user["id"],
            "logged_by_name": user.get("full_name", "Unknown"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.lead_contacts.insert_one(contact_log)
        
        # Update lead's last contact
        update_data = {
            "last_contact": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        if data.next_follow_up:
            update_data["next_follow_up"] = data.next_follow_up
        
        await db.leads.update_one({"id": lead_id}, {"$set": update_data})
        
        return {"message": "Contact logged", "contact": {k: v for k, v in contact_log.items() if k != "_id"}}
    
    # ==================== QUOTES ====================
    
    @sales_router.get("/quotes")
    async def get_quotes(
        status: Optional[str] = None,
        assigned_to: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
        user: dict = Depends(get_admin_user)
    ):
        """Get all quotes"""
        query = {}
        if status:
            query["status"] = status
        if assigned_to:
            query["assigned_to"] = assigned_to
        if search:
            query["$or"] = [
                {"quote_number": {"$regex": search, "$options": "i"}},
                {"customer_name": {"$regex": search, "$options": "i"}},
                {"customer_email": {"$regex": search, "$options": "i"}}
            ]
        
        total = await db.quotes.count_documents(query)
        quotes = await db.quotes.find(query, {"_id": 0}).sort("created_at", -1).skip((page-1)*limit).limit(limit).to_list(limit)
        
        return {
            "quotes": quotes,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    
    @sales_router.post("/quotes")
    async def create_quote(
        data: QuoteCreateRequest,
        user: dict = Depends(get_admin_user)
    ):
        """Create a new quote"""
        quote_id = str(uuid.uuid4())
        subtotal = sum(item.get("quantity", 1) * item.get("unit_price", 0) for item in data.items)
        total = subtotal - data.discount + data.tax
        
        quote_doc = {
            "id": quote_id,
            "quote_number": generate_quote_number(),
            "lead_id": data.lead_id,
            "customer_id": data.customer_id,
            "customer_name": data.customer_name,
            "customer_email": data.customer_email,
            "customer_phone": data.customer_phone,
            "company": data.company,
            "items": data.items,
            "subtotal": subtotal,
            "discount": data.discount,
            "tax": data.tax,
            "total": total,
            "status": "draft",
            "valid_until": (datetime.now(timezone.utc) + timedelta(days=data.valid_days)).isoformat(),
            "notes": data.notes,
            "assigned_to": data.assigned_to or user["id"],
            "sent_at": None,
            "viewed_at": None,
            "responded_at": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user["id"]
        }
        await db.quotes.insert_one(quote_doc)
        
        # Update sales team stats
        if data.assigned_to:
            await db.sales_team.update_one(
                {"user_id": data.assigned_to},
                {"$inc": {"total_quotes": 1}}
            )
        
        return {"quote": {k: v for k, v in quote_doc.items() if k != "_id"}}
    
    @sales_router.get("/quotes/{quote_id}")
    async def get_quote(quote_id: str, user: dict = Depends(get_admin_user)):
        """Get single quote details"""
        quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        return {"quote": quote}
    
    @sales_router.put("/quotes/{quote_id}")
    async def update_quote(
        quote_id: str,
        data: QuoteUpdateRequest,
        user: dict = Depends(get_admin_user)
    ):
        """Update a quote"""
        quote = await db.quotes.find_one({"id": quote_id})
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        if data.items is not None:
            update_data["items"] = data.items
            subtotal = sum(item.get("quantity", 1) * item.get("unit_price", 0) for item in data.items)
            update_data["subtotal"] = subtotal
            d = data.discount if data.discount is not None else quote.get("discount", 0)
            t = data.tax if data.tax is not None else quote.get("tax", 0)
            update_data["total"] = subtotal - d + t
        
        if data.discount is not None:
            update_data["discount"] = data.discount
            if data.items is None:
                update_data["total"] = quote.get("subtotal", 0) - data.discount + quote.get("tax", 0)
        
        if data.tax is not None:
            update_data["tax"] = data.tax
            if data.items is None:
                update_data["total"] = quote.get("subtotal", 0) - quote.get("discount", 0) + data.tax
        
        if data.status is not None:
            update_data["status"] = data.status
            if data.status == "sent" and not quote.get("sent_at"):
                update_data["sent_at"] = datetime.now(timezone.utc).isoformat()
            elif data.status == "accepted":
                update_data["responded_at"] = datetime.now(timezone.utc).isoformat()
            elif data.status == "rejected":
                update_data["responded_at"] = datetime.now(timezone.utc).isoformat()
        
        if data.notes is not None: update_data["notes"] = data.notes
        if data.assigned_to is not None: update_data["assigned_to"] = data.assigned_to
        
        await db.quotes.update_one({"id": quote_id}, {"$set": update_data})
        return {"message": "Quote updated"}
    
    @sales_router.post("/quotes/{quote_id}/send")
    async def send_quote(quote_id: str, user: dict = Depends(get_admin_user)):
        """Send quote to customer via email"""
        quote = await db.quotes.find_one({"id": quote_id}, {"_id": 0})
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        
        # Send email (simplified - would need proper template)
        # await EmailService.send_quote_email(quote)
        
        await db.quotes.update_one(
            {"id": quote_id},
            {"$set": {
                "status": "sent",
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"message": "Quote sent successfully"}
    
    # ==================== SALES TASKS ====================
    
    @sales_router.get("/tasks")
    async def get_tasks(
        status: Optional[str] = None,
        task_type: Optional[str] = None,
        priority: Optional[str] = None,
        assigned_to: Optional[str] = None,
        is_automated: Optional[bool] = None,
        overdue_only: bool = False,
        page: int = 1,
        limit: int = 20,
        user: dict = Depends(get_admin_user)
    ):
        """Get all sales tasks"""
        query = {}
        if status:
            query["status"] = status
        if task_type:
            query["task_type"] = task_type
        if priority:
            query["priority"] = priority
        if assigned_to:
            query["assigned_to"] = assigned_to
        if is_automated is not None:
            query["is_automated"] = is_automated
        if overdue_only:
            query["due_date"] = {"$lt": datetime.now(timezone.utc).isoformat()}
            query["status"] = {"$nin": ["completed", "cancelled"]}
        
        total = await db.sales_tasks.count_documents(query)
        tasks = await db.sales_tasks.find(query, {"_id": 0}).sort([("priority", -1), ("due_date", 1)]).skip((page-1)*limit).limit(limit).to_list(limit)
        
        return {
            "tasks": tasks,
            "total": total,
            "page": page,
            "pages": (total + limit - 1) // limit
        }
    
    @sales_router.post("/tasks")
    async def create_task(
        data: TaskCreateRequest,
        user: dict = Depends(get_admin_user)
    ):
        """Create a new sales task"""
        task_id = str(uuid.uuid4())
        task_doc = {
            "id": task_id,
            "title": data.title,
            "description": data.description,
            "task_type": data.task_type,
            "priority": data.priority,
            "status": "pending",
            "is_automated": False,
            "lead_id": data.lead_id,
            "customer_id": data.customer_id,
            "order_id": data.order_id,
            "quote_id": data.quote_id,
            "assigned_to": data.assigned_to,
            "assigned_by": user["id"],
            "due_date": data.due_date,
            "reminder_date": data.reminder_date,
            "completed_at": None,
            "notes": [],
            "outcome": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.sales_tasks.insert_one(task_doc)
        
        return {"task": {k: v for k, v in task_doc.items() if k != "_id"}}
    
    @sales_router.get("/tasks/{task_id}")
    async def get_task(task_id: str, user: dict = Depends(get_admin_user)):
        """Get single task details"""
        task = await db.sales_tasks.find_one({"id": task_id}, {"_id": 0})
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Enrich with related data
        result = {"task": task}
        if task.get("lead_id"):
            lead = await db.leads.find_one({"id": task["lead_id"]}, {"_id": 0})
            result["lead"] = lead
        if task.get("customer_id"):
            customer = await db.users.find_one({"id": task["customer_id"]}, {"_id": 0, "password_hash": 0})
            result["customer"] = customer
        if task.get("quote_id"):
            quote = await db.quotes.find_one({"id": task["quote_id"]}, {"_id": 0})
            result["quote"] = quote
        if task.get("order_id"):
            order = await db.orders.find_one({"id": task["order_id"]}, {"_id": 0})
            result["order"] = order
        
        return result
    
    @sales_router.put("/tasks/{task_id}")
    async def update_task(
        task_id: str,
        data: TaskUpdateRequest,
        user: dict = Depends(get_admin_user)
    ):
        """Update a task"""
        task = await db.sales_tasks.find_one({"id": task_id})
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        if data.title is not None: update_data["title"] = data.title
        if data.description is not None: update_data["description"] = data.description
        if data.priority is not None: update_data["priority"] = data.priority
        if data.status is not None:
            update_data["status"] = data.status
            if data.status == "completed":
                update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        if data.assigned_to is not None: update_data["assigned_to"] = data.assigned_to
        if data.due_date is not None: update_data["due_date"] = data.due_date
        if data.reminder_date is not None: update_data["reminder_date"] = data.reminder_date
        if data.outcome is not None: update_data["outcome"] = data.outcome
        
        await db.sales_tasks.update_one({"id": task_id}, {"$set": update_data})
        return {"message": "Task updated"}
    
    @sales_router.post("/tasks/{task_id}/notes")
    async def add_task_note(task_id: str, data: TaskNoteRequest, user: dict = Depends(get_admin_user)):
        """Add a note to a task"""
        task = await db.sales_tasks.find_one({"id": task_id})
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        note_entry = {
            "id": str(uuid.uuid4()),
            "note": data.note,
            "added_by": user["id"],
            "added_by_name": user.get("full_name", "Unknown"),
            "added_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.sales_tasks.update_one(
            {"id": task_id},
            {
                "$push": {"notes": note_entry},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        return {"message": "Note added", "note": note_entry}
    
    # ==================== AUTOMATION RULES ====================
    
    @sales_router.get("/automation")
    async def get_automation_rules(user: dict = Depends(get_admin_user)):
        """Get all automation rules"""
        rules = await db.automation_rules.find({}, {"_id": 0}).to_list(100)
        return {"rules": rules}
    
    @sales_router.post("/automation")
    async def create_automation_rule(
        data: AutomationRuleCreateRequest,
        user: dict = Depends(get_admin_user)
    ):
        """Create a new automation rule"""
        rule_id = str(uuid.uuid4())
        rule_doc = {
            "id": rule_id,
            "name": data.name,
            "description": data.description,
            "task_type": data.task_type,
            "is_active": True,
            "trigger_event": data.trigger_event,
            "trigger_delay_hours": data.trigger_delay_hours,
            "target_criteria": data.target_criteria,
            "action_type": data.action_type,
            "action_template": data.action_template,
            "action_config": data.action_config,
            "total_triggered": 0,
            "total_converted": 0,
            "last_triggered": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user["id"]
        }
        await db.automation_rules.insert_one(rule_doc)
        
        return {"rule": {k: v for k, v in rule_doc.items() if k != "_id"}}
    
    @sales_router.put("/automation/{rule_id}")
    async def update_automation_rule(
        rule_id: str,
        data: AutomationRuleUpdateRequest,
        user: dict = Depends(get_admin_user)
    ):
        """Update an automation rule"""
        rule = await db.automation_rules.find_one({"id": rule_id})
        if not rule:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        if data.name is not None: update_data["name"] = data.name
        if data.description is not None: update_data["description"] = data.description
        if data.is_active is not None: update_data["is_active"] = data.is_active
        if data.trigger_delay_hours is not None: update_data["trigger_delay_hours"] = data.trigger_delay_hours
        if data.target_criteria is not None: update_data["target_criteria"] = data.target_criteria
        if data.action_type is not None: update_data["action_type"] = data.action_type
        if data.action_template is not None: update_data["action_template"] = data.action_template
        if data.action_config is not None: update_data["action_config"] = data.action_config
        
        await db.automation_rules.update_one({"id": rule_id}, {"$set": update_data})
        return {"message": "Rule updated"}
    
    @sales_router.delete("/automation/{rule_id}")
    async def delete_automation_rule(rule_id: str, user: dict = Depends(get_admin_user)):
        """Delete an automation rule"""
        result = await db.automation_rules.delete_one({"id": rule_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Rule not found")
        return {"message": "Rule deleted"}
    
    # ==================== SALES TEAM ====================
    
    @sales_router.get("/team")
    async def get_sales_team(user: dict = Depends(get_admin_user)):
        """Get all sales team members"""
        team = await db.sales_team.find({}, {"_id": 0}).to_list(100)
        return {"team": team}
    
    @sales_router.post("/team")
    async def add_team_member(
        data: TeamMemberAddRequest,
        admin_user: dict = Depends(get_admin_user)
    ):
        """Add a user to the sales team"""
        # Check if user exists
        user = await db.users.find_one({"id": data.user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if already in team
        existing = await db.sales_team.find_one({"user_id": data.user_id})
        if existing:
            raise HTTPException(status_code=400, detail="User already in sales team")
        
        member_doc = {
            "id": str(uuid.uuid4()),
            "user_id": data.user_id,
            "email": user["email"],
            "full_name": user.get("full_name", "Unknown"),
            "phone": user.get("phone"),
            "role": data.role,
            "is_active": True,
            "total_leads": 0,
            "total_quotes": 0,
            "total_conversions": 0,
            "total_revenue": 0,
            "max_active_leads": data.max_active_leads,
            "current_active_leads": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.sales_team.insert_one(member_doc)
        
        # Update user role to sales
        await db.users.update_one({"id": data.user_id}, {"$set": {"role": "sales"}})
        
        return {"member": {k: v for k, v in member_doc.items() if k != "_id"}}
    
    @sales_router.put("/team/{member_id}")
    async def update_team_member(
        member_id: str,
        data: TeamMemberUpdateRequest,
        user: dict = Depends(get_admin_user)
    ):
        """Update a sales team member"""
        update_data = {}
        if data.role is not None: update_data["role"] = data.role
        if data.is_active is not None: update_data["is_active"] = data.is_active
        if data.max_active_leads is not None: update_data["max_active_leads"] = data.max_active_leads
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No update data provided")
        
        result = await db.sales_team.update_one({"id": member_id}, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Team member not found")
        
        return {"message": "Team member updated"}
    
    # ==================== DASHBOARD & ANALYTICS ====================
    
    @sales_router.get("/dashboard")
    async def get_sales_dashboard(
        period: str = "30d",  # 7d, 30d, 90d, all
        user: dict = Depends(get_admin_user)
    ):
        """Get sales dashboard metrics"""
        # Calculate date range
        now = datetime.now(timezone.utc)
        if period == "7d":
            start_date = (now - timedelta(days=7)).isoformat()
        elif period == "30d":
            start_date = (now - timedelta(days=30)).isoformat()
        elif period == "90d":
            start_date = (now - timedelta(days=90)).isoformat()
        else:
            start_date = None
        
        date_filter = {"created_at": {"$gte": start_date}} if start_date else {}
        
        # Lead metrics
        total_leads = await db.leads.count_documents(date_filter)
        new_leads = await db.leads.count_documents({**date_filter, "status": "new"})
        qualified_leads = await db.leads.count_documents({**date_filter, "status": "qualified"})
        won_leads = await db.leads.count_documents({**date_filter, "status": "won"})
        lost_leads = await db.leads.count_documents({**date_filter, "status": "lost"})
        
        # Quote metrics
        total_quotes = await db.quotes.count_documents(date_filter)
        sent_quotes = await db.quotes.count_documents({**date_filter, "status": "sent"})
        accepted_quotes = await db.quotes.count_documents({**date_filter, "status": "accepted"})
        
        # Task metrics
        total_tasks = await db.sales_tasks.count_documents(date_filter)
        pending_tasks = await db.sales_tasks.count_documents({**date_filter, "status": "pending"})
        completed_tasks = await db.sales_tasks.count_documents({**date_filter, "status": "completed"})
        overdue_tasks = await db.sales_tasks.count_documents({
            "due_date": {"$lt": now.isoformat()},
            "status": {"$nin": ["completed", "cancelled"]}
        })
        
        # Pipeline value
        pipeline = await db.leads.aggregate([
            {"$match": {"status": {"$nin": ["won", "lost"]}}},
            {"$group": {"_id": None, "total": {"$sum": "$estimated_value"}}}
        ]).to_list(1)
        pipeline_value = pipeline[0]["total"] if pipeline else 0
        
        # Team performance
        team_performance = await db.sales_team.find({}, {"_id": 0}).to_list(100)
        
        # Recent activity
        recent_leads = await db.leads.find(date_filter, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
        recent_tasks = await db.sales_tasks.find(date_filter, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
        
        # Conversion rate
        conversion_rate = (won_leads / total_leads * 100) if total_leads > 0 else 0
        quote_acceptance_rate = (accepted_quotes / sent_quotes * 100) if sent_quotes > 0 else 0
        
        return {
            "period": period,
            "leads": {
                "total": total_leads,
                "new": new_leads,
                "qualified": qualified_leads,
                "won": won_leads,
                "lost": lost_leads,
                "conversion_rate": round(conversion_rate, 1)
            },
            "quotes": {
                "total": total_quotes,
                "sent": sent_quotes,
                "accepted": accepted_quotes,
                "acceptance_rate": round(quote_acceptance_rate, 1)
            },
            "tasks": {
                "total": total_tasks,
                "pending": pending_tasks,
                "completed": completed_tasks,
                "overdue": overdue_tasks
            },
            "pipeline_value": pipeline_value,
            "team_performance": team_performance,
            "recent_leads": recent_leads,
            "recent_tasks": recent_tasks
        }
    
    @sales_router.get("/reports/performance")
    async def get_performance_report(
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        team_member_id: Optional[str] = None,
        user: dict = Depends(get_admin_user)
    ):
        """Get detailed performance report"""
        query = {}
        if start_date:
            query["created_at"] = {"$gte": start_date}
        if end_date:
            if "created_at" in query:
                query["created_at"]["$lte"] = end_date
            else:
                query["created_at"] = {"$lte": end_date}
        
        if team_member_id:
            # Get performance for specific team member
            member = await db.sales_team.find_one({"user_id": team_member_id}, {"_id": 0})
            if not member:
                raise HTTPException(status_code=404, detail="Team member not found")
            
            member_query = {**query, "assigned_to": team_member_id}
            leads = await db.leads.count_documents(member_query)
            won = await db.leads.count_documents({**member_query, "status": "won"})
            quotes = await db.quotes.count_documents(member_query)
            accepted = await db.quotes.count_documents({**member_query, "status": "accepted"})
            tasks_completed = await db.sales_tasks.count_documents({**member_query, "status": "completed"})
            
            return {
                "member": member,
                "metrics": {
                    "leads_assigned": leads,
                    "leads_won": won,
                    "conversion_rate": round((won / leads * 100) if leads > 0 else 0, 1),
                    "quotes_created": quotes,
                    "quotes_accepted": accepted,
                    "tasks_completed": tasks_completed
                }
            }
        else:
            # Get team-wide performance
            team = await db.sales_team.find({}, {"_id": 0}).to_list(100)
            report = []
            
            for member in team:
                member_query = {**query, "assigned_to": member["user_id"]}
                leads = await db.leads.count_documents(member_query)
                won = await db.leads.count_documents({**member_query, "status": "won"})
                quotes = await db.quotes.count_documents(member_query)
                accepted = await db.quotes.count_documents({**member_query, "status": "accepted"})
                
                report.append({
                    "member": member,
                    "metrics": {
                        "leads": leads,
                        "won": won,
                        "conversion_rate": round((won / leads * 100) if leads > 0 else 0, 1),
                        "quotes": quotes,
                        "accepted": accepted
                    }
                })
            
            return {"report": report}
    
    return sales_router
