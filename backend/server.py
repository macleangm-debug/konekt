from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any, Literal
from enum import Enum
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
from email_service import EmailService
from sales_routes import sales_router, create_sales_routes
from sales_automation import init_automation_engine
from ai_services import router as ai_services_router
from service_orders import router as service_orders_router
from admin_routes import router as admin_ops_router
from admin_facade_routes import router as admin_facade_router
from settings_routes import router as settings_router
from quote_routes import router as quote_router
from invoice_routes import router as invoice_router
from pdf_routes import router as pdf_router
from order_ops_routes import router as order_ops_router
from production_routes import router as production_router
from document_send_routes import router as document_send_router
from quote_pipeline_routes import router as quote_pipeline_router
from customer_order_routes import router as customer_order_router
from kwikpay_payment_routes import router as kwikpay_payment_router
from kwikpay_webhook_routes import router as kwikpay_webhook_router
from bank_transfer_routes import router as bank_transfer_router
from payment_admin_routes import router as payment_admin_router
from customer_admin_routes import router as customer_admin_router
from admin_customers_merged_routes import router as customers_merged_router
from payment_upload_routes import router as payment_upload_router
from hero_banner_routes import router as hero_banner_router
from referral_public_routes import router as referral_public_router
from customer_referral_routes import router as customer_referral_router
from referral_settings_routes import router as referral_settings_router
from customer_points_routes import router as customer_points_router
from admin_points_routes import router as admin_points_router
from affiliate_public_routes import router as affiliate_public_router
from affiliate_admin_routes import router as affiliate_admin_router
from affiliate_commission_routes import router as affiliate_commission_router
from affiliate_payout_routes import router as affiliate_payout_router
from affiliate_application_routes import router as affiliate_application_router
from affiliate_portal_routes import router as affiliate_portal_router
from creative_service_routes_v2 import router as creative_service_v2_router
from crm_settings_routes import router as crm_settings_router
from inventory_variant_routes import router as inventory_variant_router
from central_payments_routes import router as central_payments_router
from statement_routes import router as statement_router
from warehouse_routes import router as warehouse_router
from raw_materials_routes import router as raw_materials_router
from stock_movement_routes import router as stock_movement_router
from warehouse_transfer_routes import router as warehouse_transfer_router
from creative_project_collab_routes import router as creative_project_collab_router
from creative_project_routes import router as creative_project_router
from customer_statement_routes import router as customer_statement_router
from launch_email_routes import router as launch_email_router
from payment_gateway_status_routes import router as payment_gateway_status_router
from affiliate_self_service_routes import router as affiliate_self_service_router
from admin_setup_routes import router as admin_setup_router
from public_product_variant_routes import router as public_product_variant_router
from qa_routes import router as qa_router
from health_routes import router as health_router
from service_form_routes import router as service_form_router
from service_request_routes import router as service_request_router
from service_request_admin_routes import router as service_request_admin_router
from points_rules_routes import router as points_rules_router
from first_order_discount_routes import router as first_order_discount_router
from seed_sample_catalog_routes import router as seed_sample_catalog_router
from service_request_customer_routes import router as service_request_customer_router
from upload_service_files_routes import router as upload_service_files_router
from points_checkout_routes import router as points_checkout_router
from points_apply_routes import router as points_apply_router
from launch_hardening_routes import router as launch_hardening_router
from affiliate_dashboard_routes import router as affiliate_dashboard_router
from team_role_routes import router as team_role_router
from security_headers_middleware import SecurityHeadersMiddleware
from audit_routes import router as audit_router
from launch_readiness_report_routes import router as launch_report_router
from customer_address_routes import router as customer_address_router
from customer_invoice_routes import router as customer_invoice_router
from customer_quote_actions_routes import router as customer_quote_actions_router
from customer_orders_routes import router as customer_orders_router
from affiliate_settings_routes import router as affiliate_settings_router
from affiliate_tracking_routes import router as affiliate_tracking_router
from affiliate_promotions_routes import router as affiliate_promotions_router
from affiliate_payout_admin_routes import router as affiliate_payout_admin_router
from affiliate_perk_routes import router as affiliate_perk_router
from affiliate_campaign_routes import router as affiliate_campaign_router
from campaign_marketing_routes import router as campaign_marketing_router
from affiliate_campaign_preview_routes import router as affiliate_campaign_preview_router
from checkout_campaign_routes import router as checkout_campaign_router
from document_pdf_routes import router as document_pdf_router
from notification_test_routes import router as notification_test_router
from campaign_performance_routes import router as campaign_performance_router
from business_settings_routes import router as business_settings_router
from go_live_readiness_routes import router as go_live_readiness_router
from payment_settings_routes import router as payment_settings_router
from crm_intelligence_routes import router as crm_intelligence_router
from sales_kpi_routes import router as sales_kpi_router
from marketing_performance_routes import router as marketing_performance_router
from crm_deal_routes import router as crm_deal_router
from customer_account_routes import router as customer_account_router
from crm_relationship_routes import router as crm_relationship_router
from staff_dashboard_routes import router as staff_dashboard_router
from supervisor_team_routes import router as supervisor_team_router
from delivery_note_routes import router as delivery_note_router
from goods_receiving_routes import router as goods_receiving_router
from supplier_routes import router as supplier_router
from procurement_routes import router as procurement_router
from inventory_operations_dashboard_routes import router as inventory_ops_dashboard_router
from inventory_ledger_routes import router as inventory_ledger_router
from geography_routes import router as geography_router
from partner_routes import router as partner_router
from partner_catalog_routes import router as partner_catalog_router
from country_pricing_routes import router as country_pricing_router
from routing_rules_routes import router as routing_rules_router
from multi_country_order_routing_routes import router as multi_country_routing_router
from partner_auth_routes import router as partner_auth_router
from partner_portal_dashboard_routes import router as partner_portal_router
from partner_bulk_upload_routes import router as partner_bulk_upload_router
from country_launch_routes import router as country_launch_router
from country_expansion_routes import router as country_expansion_router
from country_partner_admin_routes import router as country_partner_admin_router
from public_country_catalog_routes import router as public_country_catalog_router
from marketplace_listing_routes import router as marketplace_listing_router
from partner_listing_submission_routes import router as partner_listing_submission_router
from public_marketplace_routes import router as public_marketplace_router
from media_upload_routes import router as media_upload_router
from partner_excel_import_routes import router as partner_excel_import_router
from vendor_orders_routes import router as vendor_orders_router

# Service Orchestration Routes
from service_catalog_routes import router as service_catalog_router
from service_form_template_routes import router as service_form_template_router
from blank_product_routes import router as blank_product_router
from site_visit_routes import router as site_visit_router
from public_service_routes import router as public_service_router
from partner_capability_routes import router as partner_capability_router
from delivery_partner_routes import router as delivery_partner_router
from product_insight_routes import router as product_insight_router

# Recurring Services + Reorder Pack Routes
from reorder_routes import router as reorder_router
from repeat_service_request_routes import router as repeat_service_request_router
from recurring_service_plan_routes import router as recurring_service_plan_router
from recurring_supply_plan_routes import router as recurring_supply_plan_router
from account_manager_routes import router as account_manager_router
from sla_alerts_routes import router as sla_alerts_router

# Contract Clients + Billing Discipline Pack
from contract_client_routes import router as contract_client_router
from account_manager_note_routes import router as account_manager_note_router
from negotiated_pricing_routes import router as negotiated_pricing_router
from contract_sla_routes import router as contract_sla_router
from recurring_invoice_routes import router as recurring_invoice_router

# Admin Performance & Insights Pack
from partner_performance_routes import router as partner_performance_router
from service_insight_routes import router as service_insight_router
from staff_performance_routes import router as staff_performance_router

# Super Admin Ecosystem Dashboard
from super_admin_dashboard_routes import router as super_admin_dashboard_router

# Group Markup & Margin Protection
from group_markup_routes import router as group_markup_router

# Partner Settlement
from partner_settlement_routes import router as partner_settlement_router

# Payment Proof Workflow
from payment_proof_routes import router as payment_proof_router

# Pricing Validation
from pricing_validation_routes import router as pricing_validation_router

# Commission Rules Engine
from commission_rules_routes import router as commission_rules_router

# Campaign Pricing (Dual Promotion)
from campaign_pricing_routes import router as campaign_pricing_router

# Supervisor Dashboard
from supervisor_dashboard_routes import router as supervisor_dashboard_router

# Staff Alerts
from staff_alerts_routes import router as staff_alerts_router

# Business Pricing Request
from business_pricing_request_routes import router as business_pricing_request_router

# Auto-Numbering Configuration
from auto_numbering_routes import router as auto_numbering_router

# Sales Guided Questions
from sales_guided_questions_routes import router as sales_guided_questions_router

# Numbering Rules
from numbering_rules_routes import router as numbering_rules_router

# Client Profiles
from client_profile_routes import router as client_profile_router

# Welcome Rewards
from welcome_rewards_routes import router as welcome_rewards_router

# Runtime Settings
from runtime_settings_routes import router as runtime_settings_router

# QA Seed
from qa_seed_routes import router as qa_seed_router

# Business Pricing Admin
from business_pricing_admin_routes import router as business_pricing_admin_router

# Notification System
from notification_routes import router as notification_router

# Checkout Points Validation
from checkout_points_routes import router as checkout_points_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT config
JWT_SECRET = os.environ.get('JWT_SECRET', 'konekt-secret-key-2024')
JWT_ALGORITHM = "HS256"

# LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Create the main app
app = FastAPI(title="Konekt API")
api_router = APIRouter(prefix="/api")
admin_router = APIRouter(prefix="/api/admin")
security = HTTPBearer(auto_error=False)

# Mount static files for uploads
STATIC_DIR = Path("/app/static")
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== ENUMS & CONSTANTS ====================

class UserRole(str, Enum):
    ADMIN = "admin"
    SALES = "sales"
    MARKETING = "marketing"
    PRODUCTION = "production"
    CUSTOMER = "customer"

ROLE_PERMISSIONS = {
    UserRole.ADMIN: ["all"],
    UserRole.SALES: ["orders", "customers", "quotes", "analytics_basic"],
    UserRole.MARKETING: ["products", "analytics", "customers"],
    UserRole.PRODUCTION: ["orders", "production_status"],
    UserRole.CUSTOMER: ["own_orders", "own_profile"]
}

ORDER_STATUSES = [
    {"key": "pending", "label": "Order Received", "description": "Order received, awaiting deposit"},
    {"key": "deposit_paid", "label": "Deposit Paid", "description": "Deposit received"},
    {"key": "design_review", "label": "Design Review", "description": "Reviewing customer design"},
    {"key": "approved", "label": "Design Approved", "description": "Design approved by customer"},
    {"key": "printing", "label": "In Production", "description": "Order is being produced"},
    {"key": "quality_check", "label": "Quality Check", "description": "Final quality inspection"},
    {"key": "ready", "label": "Ready for Delivery", "description": "Order ready for pickup/delivery"},
    {"key": "delivered", "label": "Delivered", "description": "Order delivered to customer"}
]

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    company: Optional[str] = None
    # Attribution fields
    affiliate_code: Optional[str] = None
    campaign_id: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole = UserRole.CUSTOMER

class AdminUserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    branch: str  # Main category: Promotional Materials, Office Equipment, KonektSeries
    category: str  # Sub-category: Apparel, Drinkware, Caps, etc.
    description: str
    base_price: float
    image_url: str
    sizes: List[str] = []
    colors: List[Dict[str, str]] = []
    print_methods: List[str] = []
    min_quantity: int = 1
    is_active: bool = True
    is_customizable: bool = True
    stock_quantity: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProductCreate(BaseModel):
    name: str
    branch: str
    category: str
    description: str
    base_price: float
    image_url: str
    sizes: List[str] = []
    colors: List[Dict[str, str]] = []
    print_methods: List[str] = []
    min_quantity: int = 1
    is_customizable: bool = True
    stock_quantity: int = 0

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    branch: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[float] = None
    image_url: Optional[str] = None
    sizes: Optional[List[str]] = None
    colors: Optional[List[Dict[str, str]]] = None
    print_methods: Optional[List[str]] = None
    min_quantity: Optional[int] = None
    is_active: Optional[bool] = None
    is_customizable: Optional[bool] = None
    stock_quantity: Optional[int] = None

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    size: Optional[str] = None
    color: Optional[str] = None
    print_method: str
    logo_url: Optional[str] = None
    logo_position: str = "front"
    unit_price: float
    subtotal: float
    customization_data: Optional[Dict[str, Any]] = None

class OrderCreate(BaseModel):
    items: List[OrderItem]
    delivery_address: str
    delivery_phone: str
    notes: Optional[str] = None
    deposit_percentage: int = 30

class OrderStatusUpdate(BaseModel):
    status: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    notes: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class LogoGenerateRequest(BaseModel):
    prompt: str
    business_name: str
    industry: Optional[str] = None

class MaintenanceRequest(BaseModel):
    name: str
    email: str
    phone: str
    company: Optional[str] = None
    service_type: Optional[str] = None
    equipment_details: Optional[str] = None
    message: Optional[str] = None
    request_type: str = "service"  # service or consultation
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    consultation_type: Optional[str] = None
    notes: Optional[str] = None
    status: str = "pending"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Referral Program Models
class ReferralSettings(BaseModel):
    is_active: bool = True
    referrer_reward_type: str = "percentage"  # percentage or fixed
    referrer_reward_value: float = 10.0  # 10% of referee's first order
    referee_discount_type: str = "percentage"
    referee_discount_value: float = 10.0  # 10% off first order
    reward_trigger: str = "first_purchase"  # signup, first_purchase, order_delivered
    min_order_amount: float = 0
    max_reward_amount: float = 100000  # TZS 100,000 max reward cap

class ReferralTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    referrer_id: str
    referee_id: str
    referee_email: str
    order_id: Optional[str] = None
    order_amount: float = 0
    reward_amount: float = 0
    status: str = "pending"  # pending, credited, used
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Promotional Offers Model
class PromoOffer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    discount_type: str = "percentage"  # percentage or fixed
    discount_value: float
    code: Optional[str] = None
    min_order_amount: float = 0
    max_uses: int = 0  # 0 = unlimited
    current_uses: int = 0
    applicable_branches: List[str] = []  # empty = all
    is_active: bool = True
    start_date: str
    end_date: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PromoOfferCreate(BaseModel):
    title: str
    description: str
    discount_type: str = "percentage"
    discount_value: float
    code: Optional[str] = None
    min_order_amount: float = 0
    max_uses: int = 0
    applicable_branches: List[str] = []
    start_date: str
    end_date: str

class ReferralUse(BaseModel):
    referral_code: str

class QuoteRequest(BaseModel):
    product_type: str
    print_method: str
    quantity: int

class DraftSave(BaseModel):
    name: str
    product_id: str
    customization_data: Dict[str, Any]

# ==================== SALES TASK MODELS ====================

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    OVERDUE = "overdue"

class TaskType(str, Enum):
    # Automated Tasks
    ABANDONED_CART = "abandoned_cart"
    FOLLOW_UP_REVIEW = "follow_up_review"
    BIRTHDAY_OFFER = "birthday_offer"
    REORDER_REMINDER = "reorder_reminder"
    WIN_BACK = "win_back"
    # Manual Tasks
    LEAD_FOLLOW_UP = "lead_follow_up"
    QUOTE_FOLLOW_UP = "quote_follow_up"
    CUSTOMER_RELATIONSHIP = "customer_relationship"
    ORDER_ISSUE = "order_issue"
    UPSELL_OPPORTUNITY = "upsell_opportunity"
    CUSTOM = "custom"

class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"

class LeadSource(str, Enum):
    WEBSITE = "website"
    REFERRAL = "referral"
    SOCIAL_MEDIA = "social_media"
    COLD_CALL = "cold_call"
    EVENT = "event"
    PARTNER = "partner"
    OTHER = "other"

# Lead Model
class Lead(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    source: LeadSource = LeadSource.WEBSITE
    status: LeadStatus = LeadStatus.NEW
    estimated_value: float = 0
    notes: Optional[str] = None
    assigned_to: Optional[str] = None  # Sales user ID
    tags: List[str] = []
    last_contact: Optional[str] = None
    next_follow_up: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LeadCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    source: LeadSource = LeadSource.WEBSITE
    estimated_value: float = 0
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    tags: List[str] = []

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    source: Optional[LeadSource] = None
    status: Optional[LeadStatus] = None
    estimated_value: Optional[float] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    tags: Optional[List[str]] = None
    next_follow_up: Optional[str] = None

# Quote Model
class Quote(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quote_number: str
    lead_id: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    company: Optional[str] = None
    items: List[Dict[str, Any]] = []
    subtotal: float = 0
    discount: float = 0
    tax: float = 0
    total: float = 0
    status: str = "draft"  # draft, sent, viewed, accepted, rejected, expired
    valid_until: str
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    sent_at: Optional[str] = None
    viewed_at: Optional[str] = None
    responded_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class QuoteCreate(BaseModel):
    lead_id: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    company: Optional[str] = None
    items: List[Dict[str, Any]] = []
    discount: float = 0
    tax: float = 0
    valid_days: int = 30
    notes: Optional[str] = None
    assigned_to: Optional[str] = None

class QuoteUpdate(BaseModel):
    items: Optional[List[Dict[str, Any]]] = None
    discount: Optional[float] = None
    tax: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None

# Sales Task Model
class SalesTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    task_type: TaskType
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.PENDING
    is_automated: bool = False
    # Related entities
    lead_id: Optional[str] = None
    customer_id: Optional[str] = None
    order_id: Optional[str] = None
    quote_id: Optional[str] = None
    # Assignment
    assigned_to: Optional[str] = None
    assigned_by: Optional[str] = None
    # Timing
    due_date: Optional[str] = None
    reminder_date: Optional[str] = None
    completed_at: Optional[str] = None
    # Tracking
    notes: List[Dict[str, Any]] = []  # {note, added_by, added_at}
    outcome: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SalesTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    task_type: TaskType = TaskType.CUSTOM
    priority: TaskPriority = TaskPriority.MEDIUM
    lead_id: Optional[str] = None
    customer_id: Optional[str] = None
    order_id: Optional[str] = None
    quote_id: Optional[str] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    reminder_date: Optional[str] = None

class SalesTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None
    reminder_date: Optional[str] = None
    outcome: Optional[str] = None

class TaskNoteAdd(BaseModel):
    note: str

# Automation Rules Model
class AutomationRule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    task_type: TaskType
    is_active: bool = True
    # Trigger conditions
    trigger_event: str  # cart_abandoned, order_delivered, customer_inactive, etc.
    trigger_delay_hours: int = 24  # Hours after trigger event
    # Target criteria
    target_criteria: Dict[str, Any] = {}  # e.g., {"min_cart_value": 50000}
    # Action configuration
    action_type: str = "email"  # email, task, notification
    action_template: Optional[str] = None
    action_config: Dict[str, Any] = {}
    # Stats
    total_triggered: int = 0
    total_converted: int = 0
    last_triggered: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AutomationRuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    task_type: TaskType
    trigger_event: str
    trigger_delay_hours: int = 24
    target_criteria: Dict[str, Any] = {}
    action_type: str = "email"
    action_template: Optional[str] = None
    action_config: Dict[str, Any] = {}

class AutomationRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    trigger_delay_hours: Optional[int] = None
    target_criteria: Optional[Dict[str, Any]] = None
    action_type: Optional[str] = None
    action_template: Optional[str] = None
    action_config: Optional[Dict[str, Any]] = None

# Sales Team Member Model
class SalesTeamMember(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    email: str
    full_name: str
    phone: Optional[str] = None
    role: str = "sales_rep"  # sales_rep, team_lead, sales_manager
    is_active: bool = True
    # Performance metrics
    total_leads: int = 0
    total_quotes: int = 0
    total_conversions: int = 0
    total_revenue: float = 0
    # Capacity
    max_active_leads: int = 50
    current_active_leads: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ==================== HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str = "customer") -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def generate_referral_code(user_id: str) -> str:
    return f"KONEKT-{user_id[:6].upper()}"

def generate_order_number() -> str:
    return f"KNK-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"

def generate_quote_number() -> str:
    return f"QT-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"

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

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    except:
        return None

async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get user and verify they have admin/staff role"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        role = user.get("role", "customer")
        if role not in ["admin", "sales", "marketing", "production"]:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_permission(permission: str):
    """Decorator factory for permission checking"""
    async def check_permission(user: dict = Depends(get_admin_user)):
        role = user.get("role", "customer")
        permissions = ROLE_PERMISSIONS.get(UserRole(role), [])
        if "all" in permissions or permission in permissions:
            return user
        raise HTTPException(status_code=403, detail=f"Permission '{permission}' required")
    return check_permission

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(data: UserCreate):
    from attribution_capture_service import (
        extract_attribution_from_payload,
        hydrate_affiliate_from_code,
        build_attribution_block
    )
    
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Extract and hydrate attribution
    attribution = extract_attribution_from_payload(data.model_dump())
    attribution = await hydrate_affiliate_from_code(db, attribution)
    
    user_id = str(uuid.uuid4())
    referral_code = generate_referral_code(user_id)
    user_doc = {
        "id": user_id,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "full_name": data.full_name,
        "phone": data.phone,
        "company": data.company,
        "points": 100,
        "credit_balance": 0,
        "referral_code": referral_code,
        "referred_by": None,
        "referral_code_used": None,
        "total_referrals": 0,
        "role": "customer",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        # Attribution fields
        **build_attribution_block(attribution),
    }
    await db.users.insert_one(user_doc)
    
    # Send welcome email (fire and forget)
    asyncio.create_task(EmailService.send_welcome_email(data.email, data.full_name, referral_code))
    
    token = create_token(user_id, data.email, "customer")
    return {
        "token": token,
        "user": {
            "id": user_id,
            "email": data.email,
            "full_name": data.full_name,
            "phone": data.phone,
            "company": data.company,
            "points": 100,
            "credit_balance": 0,
            "referral_code": referral_code,
            "role": "customer",
            "created_at": user_doc["created_at"]
        }
    }

@api_router.post("/auth/login")
async def login(data: UserLogin):
    # 1. Check main users collection (customers + admin staff)
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    # Check both password_hash and password fields (demo sales users use 'password')
    pw_hash = user.get("password_hash") or user.get("password", "") if user else ""
    if user and pw_hash and verify_password(data.password, pw_hash):
        if not user.get("is_active", True):
            raise HTTPException(status_code=403, detail="Account is deactivated")
        
        role = user.get("role", "customer")
        token = create_token(user["id"], user["email"], role)
        return {
            "token": token,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "full_name": user["full_name"],
                "phone": user.get("phone"),
                "company": user.get("company"),
                "points": user.get("points", 0),
                "referral_code": user.get("referral_code"),
                "role": role,
                "created_at": user["created_at"]
            }
        }
    
    # 2. Check partner_users collection
    partner_user = await db.partner_users.find_one({"email": data.email, "status": "active"})
    if partner_user:
        import bcrypt as _bcrypt
        pw_hash = partner_user.get("password_hash", "")
        if pw_hash and _bcrypt.checkpw(data.password.encode("utf-8"), pw_hash.encode("utf-8")):
            from partner_auth_routes import create_partner_token
            from bson import ObjectId as _OID
            token = create_partner_token(partner_user)
            partner = await db.partners.find_one({"_id": _OID(partner_user["partner_id"])})
            return {
                "token": token,
                "user": {
                    "id": str(partner_user["_id"]),
                    "email": partner_user["email"],
                    "full_name": partner_user.get("full_name", partner_user.get("name", partner_user["email"])),
                    "phone": partner_user.get("phone", ""),
                    "company": partner.get("company_name", "") if partner else "",
                    "points": 0,
                    "referral_code": "",
                    "role": "partner",
                    "created_at": str(partner_user.get("created_at", ""))
                }
            }
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "phone": user.get("phone"),
        "company": user.get("company"),
        "points": user.get("points", 0),
        "referral_code": user.get("referral_code"),
        "role": user.get("role", "customer"),
        "created_at": user["created_at"]
    }

# ==================== ADMIN AUTH ====================

@admin_router.post("/auth/login")
async def admin_login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    role = user.get("role", "customer")
    if role not in ["admin", "sales", "marketing", "production"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    token = create_token(user["id"], user["email"], role)
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": role,
            "permissions": ROLE_PERMISSIONS.get(UserRole(role), [])
        }
    }

# ==================== ADMIN ANALYTICS ====================

@admin_router.get("/analytics/overview")
async def get_analytics_overview(user: dict = Depends(get_admin_user)):
    """Get dashboard overview analytics"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    month_start = today_start - timedelta(days=30)
    
    # Total counts
    total_orders = await db.orders.count_documents({})
    total_customers = await db.users.count_documents({"role": "customer"})
    total_products = await db.products.count_documents({"is_active": True})
    
    # Orders this month
    orders_this_month = await db.orders.count_documents({
        "created_at": {"$gte": month_start.isoformat()}
    })
    
    # Revenue calculations
    all_orders = await db.orders.find({}, {"_id": 0, "total_amount": 1, "deposit_paid": 1, "created_at": 1}).to_list(None)
    
    total_revenue = sum(o.get("total_amount", 0) for o in all_orders if o.get("deposit_paid"))
    monthly_revenue = sum(
        o.get("total_amount", 0) for o in all_orders 
        if o.get("deposit_paid") and o.get("created_at", "") >= month_start.isoformat()
    )
    
    # Orders by status
    pipeline = [
        {"$group": {"_id": "$current_status", "count": {"$sum": 1}}}
    ]
    status_counts = await db.orders.aggregate(pipeline).to_list(None)
    orders_by_status = {s["_id"]: s["count"] for s in status_counts}
    
    # Recent orders trend (last 7 days)
    daily_orders = []
    for i in range(7):
        day = today_start - timedelta(days=i)
        next_day = day + timedelta(days=1)
        count = await db.orders.count_documents({
            "created_at": {"$gte": day.isoformat(), "$lt": next_day.isoformat()}
        })
        daily_orders.append({
            "date": day.strftime("%Y-%m-%d"),
            "day": day.strftime("%a"),
            "orders": count
        })
    daily_orders.reverse()
    
    # Top products
    pipeline = [
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.product_name", "total_quantity": {"$sum": "$items.quantity"}, "total_revenue": {"$sum": "$items.subtotal"}}},
        {"$sort": {"total_revenue": -1}},
        {"$limit": 5}
    ]
    top_products = await db.orders.aggregate(pipeline).to_list(None)
    
    # New customers this month
    new_customers = await db.users.count_documents({
        "role": "customer",
        "created_at": {"$gte": month_start.isoformat()}
    })
    
    return {
        "summary": {
            "total_orders": total_orders,
            "total_customers": total_customers,
            "total_products": total_products,
            "total_revenue": total_revenue,
            "monthly_revenue": monthly_revenue,
            "orders_this_month": orders_this_month,
            "new_customers": new_customers
        },
        "orders_by_status": orders_by_status,
        "daily_orders": daily_orders,
        "top_products": [
            {"name": p["_id"], "quantity": p["total_quantity"], "revenue": p["total_revenue"]}
            for p in top_products
        ]
    }

@admin_router.get("/analytics/revenue")
async def get_revenue_analytics(
    period: str = Query("monthly", enum=["daily", "weekly", "monthly"]),
    user: dict = Depends(get_admin_user)
):
    """Get detailed revenue analytics"""
    now = datetime.now(timezone.utc)
    
    if period == "daily":
        days = 30
        date_format = "%Y-%m-%d"
    elif period == "weekly":
        days = 84  # 12 weeks
        date_format = "%Y-W%W"
    else:
        days = 365
        date_format = "%Y-%m"
    
    start_date = now - timedelta(days=days)
    
    orders = await db.orders.find(
        {"created_at": {"$gte": start_date.isoformat()}, "deposit_paid": True},
        {"_id": 0, "total_amount": 1, "created_at": 1}
    ).to_list(None)
    
    # Group by period
    revenue_by_period = {}
    for order in orders:
        try:
            order_date = datetime.fromisoformat(order["created_at"].replace("Z", "+00:00"))
            period_key = order_date.strftime(date_format)
            revenue_by_period[period_key] = revenue_by_period.get(period_key, 0) + order.get("total_amount", 0)
        except:
            continue
    
    return {
        "period": period,
        "data": [{"period": k, "revenue": v} for k, v in sorted(revenue_by_period.items())]
    }

# ==================== ADMIN USER MANAGEMENT ====================

@admin_router.get("/users")
async def get_all_users(
    role: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(get_admin_user)
):
    """Get all users with filtering and pagination"""
    query = {}
    if role:
        query["role"] = role
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.users.count_documents(query)
    skip = (page - 1) * limit
    
    users = await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(None)
    
    return {
        "users": users,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@admin_router.post("/users")
async def create_admin_user(data: AdminUserCreate, user: dict = Depends(get_admin_user)):
    """Create a new user (admin only)"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create users")
    
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "full_name": data.full_name,
        "phone": data.phone,
        "company": None,
        "points": 0,
        "referral_code": generate_referral_code(user_id),
        "referred_by": None,
        "total_referrals": 0,
        "role": data.role.value,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"]
    }
    await db.users.insert_one(user_doc)
    
    return {"message": "User created successfully", "user_id": user_id}

@admin_router.put("/users/{user_id}")
async def update_user(user_id: str, data: AdminUserUpdate, admin: dict = Depends(get_admin_user)):
    """Update user details"""
    if admin.get("role") != "admin" and admin["id"] != user_id:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if "role" in update_data:
        update_data["role"] = update_data["role"].value
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.users.update_one({"id": user_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User updated successfully"}

@admin_router.delete("/users/{user_id}")
async def deactivate_user(user_id: str, admin: dict = Depends(get_admin_user)):
    """Deactivate a user (soft delete)"""
    if admin.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can deactivate users")
    
    if admin["id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": False, "deactivated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deactivated successfully"}

# ==================== ADMIN ORDER MANAGEMENT ====================

@admin_router.get("/orders")
async def get_all_orders(
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(get_admin_user)
):
    """Get all orders with filtering"""
    query = {}
    if status:
        query["current_status"] = status
    if search:
        query["$or"] = [
            {"order_number": {"$regex": search, "$options": "i"}},
            {"delivery_phone": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.orders.count_documents(query)
    skip = (page - 1) * limit
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(None)
    
    # Fetch customer info for each order
    for order in orders:
        customer = await db.users.find_one({"id": order.get("user_id")}, {"_id": 0, "full_name": 1, "email": 1, "phone": 1})
        order["customer"] = customer
    
    # Enrich with real sales data
    from order_sales_enrichment_service import enrich_orders_batch
    await enrich_orders_batch(orders, db)
    
    return {
        "orders": orders,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "statuses": ORDER_STATUSES
    }

@admin_router.get("/orders/{order_id}")
async def get_order_details(order_id: str, user: dict = Depends(get_admin_user)):
    """Get detailed order information"""
    # Try finding by 'id' field first, then by ObjectId
    order = await db.orders.find_one({"id": order_id})
    if not order:
        try:
            order = await db.orders.find_one({"_id": ObjectId(order_id)})
        except:
            pass
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Serialize the order
    order = dict(order)
    if "_id" in order:
        order["id"] = str(order["_id"])
        del order["_id"]
    
    customer = await db.users.find_one({"id": order.get("user_id")}, {"_id": 0, "password_hash": 0})
    order["customer"] = customer
    order["available_statuses"] = ORDER_STATUSES
    
    # Enrich with real sales data
    from order_sales_enrichment_service import enrich_order_with_sales
    await enrich_order_with_sales(order, db)
    
    return order

@admin_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, data: OrderStatusUpdate, user: dict = Depends(get_admin_user)):
    """Update order status with optional photo"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Find status info
    status_info = next((s for s in ORDER_STATUSES if s["key"] == data.status), None)
    if not status_info:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    new_status_entry = {
        "status": data.status,
        "description": data.description or status_info["description"],
        "completed": True,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "image_url": data.image_url,
        "updated_by": user["id"],
        "notes": data.notes
    }
    
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "current_status": data.status,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"status_history": new_status_entry}
        }
    )
    
    # Send status update email to customer
    customer = await db.users.find_one({"id": order.get("user_id")}, {"_id": 0, "email": 1, "full_name": 1})
    if customer:
        asyncio.create_task(EmailService.send_order_status_update(
            customer["email"],
            order_id,
            order.get("order_number", order_id),
            data.status,
            customer.get("full_name", "Customer")
        ))
    
    return {"message": "Order status updated", "status": data.status}

# ==================== ADMIN PRODUCT MANAGEMENT ====================

@admin_router.get("/products")
async def get_all_products_admin(
    branch: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    active_only: bool = False,
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(get_admin_user)
):
    """Get all products for admin"""
    query = {}
    if branch and branch != 'all':
        query["branch"] = branch
    if category and category != 'all':
        query["category"] = category
    if active_only:
        query["is_active"] = True
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.products.count_documents(query)
    skip = (page - 1) * limit
    
    products = await db.products.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(None)
    
    branches = await db.products.distinct("branch")
    categories = await db.products.distinct("category")
    
    return {
        "products": products,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "branches": branches,
        "categories": categories
    }

@admin_router.post("/products")
async def create_product_admin(data: ProductCreate, user: dict = Depends(get_admin_user)):
    """Create a new product"""
    product = Product(**data.model_dump())
    await db.products.insert_one(product.model_dump())
    return {"message": "Product created", "product": product.model_dump()}

@admin_router.put("/products/{product_id}")
async def update_product(product_id: str, data: ProductUpdate, user: dict = Depends(get_admin_user)):
    """Update product details"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.products.update_one({"id": product_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product updated successfully"}

@admin_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(get_admin_user)):
    """Soft delete a product"""
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": {"is_active": False, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product deleted successfully"}

# ==================== REFERRAL ROUTES ====================

@api_router.post("/referrals/use")
async def use_referral(data: ReferralUse, user: dict = Depends(get_current_user)):
    if user.get("referred_by"):
        raise HTTPException(status_code=400, detail="You have already used a referral code")
    
    referrer = await db.users.find_one({"referral_code": data.referral_code}, {"_id": 0})
    if not referrer:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    if referrer["id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot use your own referral code")
    
    await db.users.update_one({"id": referrer["id"]}, {"$inc": {"points": 200, "total_referrals": 1}})
    await db.users.update_one({"id": user["id"]}, {"$set": {"referred_by": referrer["id"]}, "$inc": {"points": 150}})
    
    return {"message": "Referral applied! You earned 150 points, your friend earned 200 points."}

@api_router.get("/referrals/stats")
async def get_referral_stats(user: dict = Depends(get_current_user)):
    return {
        "referral_code": user.get("referral_code"),
        "total_referrals": user.get("total_referrals", 0),
        "points": user.get("points", 0)
    }

# ==================== PRODUCT ROUTES ====================

@api_router.get("/products")
async def get_products(branch: Optional[str] = None, category: Optional[str] = None, search: Optional[str] = None):
    query = {"is_active": True}
    if branch:
        query["branch"] = branch
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    products = await db.products.find(query, {"_id": 0}).to_list(100)
    return {"products": products}

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.post("/products")
async def create_product(data: ProductCreate):
    product = Product(**data.model_dump())
    await db.products.insert_one(product.model_dump())
    return product

@api_router.get("/products/categories/list")
async def get_categories():
    branches = await db.products.distinct("branch")
    categories = await db.products.distinct("category")
    return {"branches": branches, "categories": categories}

@api_router.get("/products/branches/structure")
async def get_branch_structure():
    """Get hierarchical structure of branches and their categories"""
    pipeline = [
        {"$match": {"is_active": True}},
        {"$group": {"_id": {"branch": "$branch", "category": "$category"}}},
        {"$group": {"_id": "$_id.branch", "categories": {"$push": "$_id.category"}}},
        {"$project": {"branch": "$_id", "categories": 1, "_id": 0}}
    ]
    result = await db.products.aggregate(pipeline).to_list(None)
    return {"branches": result}

# ==================== ORDER ROUTES ====================

@api_router.post("/orders")
async def create_order(data: OrderCreate, user: dict = Depends(get_current_user)):
    total = sum(item.subtotal for item in data.items)
    deposit = total * (data.deposit_percentage / 100)
    
    order_id = str(uuid.uuid4())
    order_number = generate_order_number()
    order_doc = {
        "id": order_id,
        "order_number": order_number,
        "user_id": user["id"],
        "items": [item.model_dump() for item in data.items],
        "total_amount": total,
        "deposit_amount": deposit,
        "deposit_paid": False,
        "balance_due": total - deposit,
        "delivery_address": data.delivery_address,
        "delivery_phone": data.delivery_phone,
        "notes": data.notes,
        "current_status": "pending",
        "status_history": [{
            "status": "pending",
            "description": "Order received, awaiting deposit payment",
            "completed": True,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "image_url": None
        }],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(order_doc)
    await db.users.update_one({"id": user["id"]}, {"$inc": {"points": int(total * 0.1)}})
    
    # Send order confirmation email to customer (fire and forget)
    asyncio.create_task(EmailService.send_order_confirmation(
        user["email"],
        order_id,
        order_number,
        [item.model_dump() for item in data.items],
        total,
        deposit,
        user.get("full_name", "Customer")
    ))
    
    # Send new order notification to admin
    asyncio.create_task(EmailService.send_admin_new_order_notification(
        order_id,
        order_number,
        user["email"],
        user.get("full_name", "Customer"),
        total,
        len(data.items)
    ))
    
    return {"order": {k: v for k, v in order_doc.items() if k != "_id"}}

@api_router.get("/orders")
async def get_orders(user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"orders": orders}

@api_router.get("/orders/me")
async def get_my_orders(user: dict = Depends(get_current_user)):
    """Get customer's own orders - used by customer dashboard"""
    orders = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_id": user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@api_router.post("/orders/{order_id}/pay-deposit")
async def pay_deposit(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "user_id": user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["deposit_paid"]:
        raise HTTPException(status_code=400, detail="Deposit already paid")
    
    new_status = {
        "status": "deposit_paid",
        "description": "Deposit received, design review in progress",
        "completed": True,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "image_url": None
    }
    
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {"deposit_paid": True, "current_status": "design_review", "updated_at": datetime.now(timezone.utc).isoformat()},
            "$push": {"status_history": new_status}
        }
    )
    
    return {"message": "Deposit payment successful", "status": "design_review"}

# ==================== AI CHAT ASSISTANT ====================

SYSTEM_PROMPT = """You are Konekt's virtual sales assistant, helping customers with promotional products, office equipment, and KonektSeries branded clothing orders. You are friendly, knowledgeable, and helpful.

You help with:
- Choosing products (promotional materials, office equipment & KonektSeries)
- Material and printing recommendations
- Quantity and pricing guidance
- Order process questions

Keep responses concise and helpful. Ask clarifying questions to better help customers.

Product branches:
1. Promotional Materials: Apparel, Drinkware, Stationery, Signage (customizable with your logo)
2. Office Equipment: Tech Accessories, Desk Organizers, Office Supplies
3. KonektSeries: Our exclusive branded clothing line with pre-designed hats, caps, and shorts (ready-to-buy, no customization needed)"""

@api_router.post("/chat")
async def chat_with_assistant(data: ChatRequest, user: dict = Depends(get_optional_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    session_id = data.session_id or str(uuid.uuid4())
    chat_history = await db.chat_sessions.find_one({"session_id": session_id}, {"_id": 0})
    
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=session_id, system_message=SYSTEM_PROMPT).with_model("openai", "gpt-5.2")
    
    try:
        response = await chat.send_message(UserMessage(text=data.message))
        
        message_doc = {
            "session_id": session_id,
            "user_id": user["id"] if user else None,
            "messages": chat_history.get("messages", []) if chat_history else []
        }
        message_doc["messages"].append({"role": "user", "content": data.message, "timestamp": datetime.now(timezone.utc).isoformat()})
        message_doc["messages"].append({"role": "assistant", "content": response, "timestamp": datetime.now(timezone.utc).isoformat()})
        
        await db.chat_sessions.update_one({"session_id": session_id}, {"$set": message_doc}, upsert=True)
        
        return {"response": response, "session_id": session_id}
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process chat request")

@api_router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    history = await db.chat_sessions.find_one({"session_id": session_id}, {"_id": 0})
    return {"messages": history.get("messages", []) if history else []}

# ==================== AI LOGO GENERATION ====================

@api_router.post("/logo/generate")
async def generate_logo(data: LogoGenerateRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    prompt = f"""Create a professional, modern logo for a business called "{data.business_name}".
{f'Industry: {data.industry}.' if data.industry else ''}
Style requirements: {data.prompt}
Make it clean, scalable, suitable for printing on promotional materials."""
    
    try:
        image_gen = OpenAIImageGeneration(api_key=EMERGENT_LLM_KEY)
        images = await image_gen.generate_images(prompt=prompt, model="gpt-image-1", number_of_images=1)
        
        if images and len(images) > 0:
            image_base64 = base64.b64encode(images[0]).decode('utf-8')
            return {"image_base64": image_base64, "prompt_used": prompt}
        else:
            raise HTTPException(status_code=500, detail="No image was generated")
    except Exception as e:
        logger.error(f"Logo generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate logo: {str(e)}")

# ==================== QUOTE CALCULATOR ====================

PRICING_RULES = {
    "t-shirt": {"base": 8000, "screen_print": 2000, "dtg": 4000, "embroidery": 5000},
    "polo": {"base": 15000, "screen_print": 2500, "dtg": 5000, "embroidery": 6000},
    "hoodie": {"base": 25000, "screen_print": 3000, "dtg": 6000, "embroidery": 8000},
    "cap": {"base": 6000, "screen_print": 1500, "dtg": 3000, "embroidery": 4000},
    "mug": {"base": 5000, "screen_print": 2000, "dtg": 3000, "embroidery": 0},
    "notebook": {"base": 8000, "screen_print": 2000, "dtg": 3500, "embroidery": 0},
    "banner": {"base": 20000, "screen_print": 5000, "dtg": 0, "embroidery": 0},
}

QUANTITY_DISCOUNTS = [(100, 0.20), (50, 0.15), (25, 0.10), (10, 0.05)]

@api_router.post("/quote/calculate")
async def calculate_quote(data: QuoteRequest):
    product_type = data.product_type.lower()
    if product_type not in PRICING_RULES:
        raise HTTPException(status_code=400, detail="Invalid product type")
    
    pricing = PRICING_RULES[product_type]
    print_cost = pricing.get(data.print_method.lower().replace(" ", "_"), 0)
    
    unit_price = pricing["base"] + print_cost
    subtotal = unit_price * data.quantity
    
    discount_rate = 0
    for min_qty, rate in QUANTITY_DISCOUNTS:
        if data.quantity >= min_qty:
            discount_rate = rate
            break
    
    discount_amount = subtotal * discount_rate
    total = subtotal - discount_amount
    
    return {
        "unit_price": unit_price,
        "quantity": data.quantity,
        "subtotal": subtotal,
        "discount_rate": discount_rate,
        "discount_amount": discount_amount,
        "total": total,
        "currency": "TZS",
        "best_value": data.quantity >= 25
    }

# ==================== DRAFTS ====================

@api_router.post("/drafts")
async def save_draft(data: DraftSave, user: dict = Depends(get_current_user)):
    draft_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "name": data.name,
        "product_id": data.product_id,
        "customization_data": data.customization_data,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.drafts.insert_one(draft_doc)
    return {"draft": {k: v for k, v in draft_doc.items() if k != "_id"}}

@api_router.get("/drafts")
async def get_drafts(user: dict = Depends(get_current_user)):
    drafts = await db.drafts.find({"user_id": user["id"]}, {"_id": 0}).sort("updated_at", -1).to_list(50)
    return {"drafts": drafts}

@api_router.delete("/drafts/{draft_id}")
async def delete_draft(draft_id: str, user: dict = Depends(get_current_user)):
    result = await db.drafts.delete_one({"id": draft_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Draft not found")
    return {"message": "Draft deleted"}

# ==================== MAINTENANCE REQUESTS ====================

@api_router.post("/maintenance-requests")
async def create_maintenance_request(data: MaintenanceRequest):
    """Create a new equipment maintenance service request"""
    request_id = str(uuid.uuid4())
    request_doc = {
        "id": request_id,
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.maintenance_requests.insert_one(request_doc)
    
    # Send admin notification (fire and forget)
    asyncio.create_task(EmailService.send_admin_consultation_notification(
        request_id,
        data.name,
        data.email,
        data.phone,
        data.company,
        data.request_type,
        data.service_type
    ))
    
    return {"id": request_id, "message": "Maintenance request submitted successfully"}

@admin_router.get("/maintenance-requests")
async def get_maintenance_requests(
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(get_admin_user)
):
    """Get all maintenance requests (admin only)"""
    query = {}
    if status and status != 'all':
        query["status"] = status
    
    total = await db.maintenance_requests.count_documents(query)
    skip = (page - 1) * limit
    
    requests = await db.maintenance_requests.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(None)
    
    return {
        "requests": requests,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@admin_router.put("/maintenance-requests/{request_id}")
async def update_maintenance_request(
    request_id: str,
    status: str,
    notes: Optional[str] = None,
    user: dict = Depends(get_admin_user)
):
    """Update maintenance request status"""
    update_data = {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if notes:
        update_data["admin_notes"] = notes
    
    result = await db.maintenance_requests.update_one(
        {"id": request_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return {"message": "Request updated"}

# ==================== REFERRAL PROGRAM ====================

@api_router.get("/referral/settings")
async def get_referral_settings():
    """Get public referral program settings"""
    settings = await db.referral_settings.find_one({}, {"_id": 0})
    if not settings:
        # Default settings
        settings = {
            "is_active": True,
            "referrer_reward_type": "percentage",
            "referrer_reward_value": 10.0,
            "referee_discount_type": "percentage",
            "referee_discount_value": 10.0,
            "reward_trigger": "first_purchase",
            "min_order_amount": 0,
            "max_reward_amount": 100000
        }
    return settings

@api_router.get("/referral/my-referrals")
async def get_my_referrals(user: dict = Depends(get_current_user)):
    """Get user's referral stats and history"""
    referrals = await db.referral_transactions.find(
        {"referrer_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    # Calculate totals
    total_earned = sum(r.get("reward_amount", 0) for r in referrals if r.get("status") == "credited")
    pending = sum(r.get("reward_amount", 0) for r in referrals if r.get("status") == "pending")
    
    # Get user's current credit balance
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0, "credit_balance": 1})
    credit_balance = user_data.get("credit_balance", 0) if user_data else 0
    
    return {
        "referral_code": user.get("referral_code"),
        "credit_balance": credit_balance,
        "total_earned": total_earned,
        "pending_rewards": pending,
        "total_referrals": len(referrals),
        "successful_referrals": len([r for r in referrals if r.get("status") == "credited"]),
        "referrals": referrals
    }

@api_router.post("/referral/apply")
async def apply_referral_code(data: ReferralUse, user: dict = Depends(get_current_user)):
    """Apply a referral code when signing up or before first purchase"""
    # Check if user already used a referral
    existing = await db.referral_transactions.find_one({"referee_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="You have already used a referral code")
    
    # Find referrer
    referrer = await db.users.find_one({"referral_code": data.referral_code.upper()})
    if not referrer:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    
    if referrer["id"] == user["id"]:
        raise HTTPException(status_code=400, detail="You cannot use your own referral code")
    
    # Create pending referral transaction
    transaction = {
        "id": str(uuid.uuid4()),
        "referrer_id": referrer["id"],
        "referee_id": user["id"],
        "referee_email": user["email"],
        "order_id": None,
        "order_amount": 0,
        "reward_amount": 0,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.referral_transactions.insert_one(transaction)
    
    # Mark user as referred
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"referred_by": referrer["id"], "referral_code_used": data.referral_code.upper()}}
    )
    
    return {"message": "Referral code applied! You'll get 10% off your first order."}

async def process_referral_reward(order_id: str, user_id: str, order_amount: float):
    """Process referral reward when order is completed"""
    # Check if user was referred and hasn't been rewarded yet
    transaction = await db.referral_transactions.find_one({
        "referee_id": user_id,
        "status": "pending"
    })
    
    if not transaction:
        return
    
    settings = await db.referral_settings.find_one({})
    if not settings or not settings.get("is_active", True):
        return
    
    # Calculate reward (10% of order amount)
    reward_value = settings.get("referrer_reward_value", 10.0)
    max_reward = settings.get("max_reward_amount", 100000)
    
    reward_amount = min(order_amount * (reward_value / 100), max_reward)
    
    # Update transaction
    await db.referral_transactions.update_one(
        {"id": transaction["id"]},
        {"$set": {
            "order_id": order_id,
            "order_amount": order_amount,
            "reward_amount": reward_amount,
            "status": "credited",
            "credited_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Add credit to referrer's account
    await db.users.update_one(
        {"id": transaction["referrer_id"]},
        {"$inc": {"credit_balance": reward_amount}}
    )
    
    logger.info(f"Referral reward of {reward_amount} credited to user {transaction['referrer_id']}")

@admin_router.get("/referral/settings")
async def get_admin_referral_settings(user: dict = Depends(get_admin_user)):
    """Get referral program settings (admin)"""
    settings = await db.referral_settings.find_one({}, {"_id": 0})
    if not settings:
        settings = ReferralSettings().model_dump()
    return settings

@admin_router.put("/referral/settings")
async def update_referral_settings(data: ReferralSettings, user: dict = Depends(get_admin_user)):
    """Update referral program settings"""
    await db.referral_settings.update_one(
        {},
        {"$set": data.model_dump()},
        upsert=True
    )
    return {"message": "Referral settings updated"}

@admin_router.get("/referral/transactions")
async def get_referral_transactions(
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(get_admin_user)
):
    """Get all referral transactions"""
    query = {}
    if status and status != 'all':
        query["status"] = status
    
    total = await db.referral_transactions.count_documents(query)
    skip = (page - 1) * limit
    
    transactions = await db.referral_transactions.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(None)
    
    # Get user emails for display
    for t in transactions:
        referrer = await db.users.find_one({"id": t["referrer_id"]}, {"_id": 0, "email": 1, "name": 1})
        t["referrer_email"] = referrer.get("email") if referrer else "Unknown"
        t["referrer_name"] = referrer.get("name") if referrer else "Unknown"
    
    return {
        "transactions": transactions,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

# ==================== PROMOTIONAL OFFERS ====================

@api_router.get("/offers/active")
async def get_active_offers():
    """Get all active promotional offers"""
    now = datetime.now(timezone.utc).isoformat()
    offers = await db.promo_offers.find({
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    }, {"_id": 0}).to_list(20)
    return {"offers": offers}

@api_router.post("/offers/validate")
async def validate_promo_code(code: str, order_amount: float = 0):
    """Validate a promo code"""
    now = datetime.now(timezone.utc).isoformat()
    offer = await db.promo_offers.find_one({
        "code": code.upper(),
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    }, {"_id": 0})
    
    if not offer:
        raise HTTPException(status_code=404, detail="Invalid or expired promo code")
    
    if offer.get("max_uses", 0) > 0 and offer.get("current_uses", 0) >= offer["max_uses"]:
        raise HTTPException(status_code=400, detail="This promo code has reached its usage limit")
    
    if order_amount < offer.get("min_order_amount", 0):
        raise HTTPException(status_code=400, detail=f"Minimum order amount of TZS {offer['min_order_amount']:,.0f} required")
    
    # Calculate discount
    if offer["discount_type"] == "percentage":
        discount = order_amount * (offer["discount_value"] / 100)
    else:
        discount = offer["discount_value"]
    
    return {
        "valid": True,
        "offer": offer,
        "discount_amount": discount
    }

@admin_router.get("/offers")
async def get_all_offers(
    active_only: bool = False,
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(get_admin_user)
):
    """Get all promotional offers (admin)"""
    query = {}
    if active_only:
        query["is_active"] = True
    
    total = await db.promo_offers.count_documents(query)
    skip = (page - 1) * limit
    
    offers = await db.promo_offers.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(None)
    
    return {
        "offers": offers,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@admin_router.post("/offers")
async def create_offer(data: PromoOfferCreate, user: dict = Depends(get_admin_user)):
    """Create a new promotional offer"""
    offer_data = data.model_dump()
    # Uppercase the code if provided
    if offer_data.get("code"):
        offer_data["code"] = offer_data["code"].upper()
    offer = PromoOffer(**offer_data)
    await db.promo_offers.insert_one(offer.model_dump())
    return {"message": "Offer created", "offer": offer.model_dump()}

@admin_router.put("/offers/{offer_id}")
async def update_offer(offer_id: str, data: dict, user: dict = Depends(get_admin_user)):
    """Update a promotional offer"""
    if "code" in data and data["code"]:
        data["code"] = data["code"].upper()
    
    result = await db.promo_offers.update_one(
        {"id": offer_id},
        {"$set": data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    return {"message": "Offer updated"}

@admin_router.delete("/offers/{offer_id}")
async def delete_offer(offer_id: str, user: dict = Depends(get_admin_user)):
    """Delete a promotional offer"""
    result = await db.promo_offers.delete_one({"id": offer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"message": "Offer deleted"}

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_database():
    """Seed initial products and admin user"""
    products = [
        # Promotional Materials - Apparel
        {"id": str(uuid.uuid4()), "name": "Classic Cotton T-Shirt", "branch": "Promotional Materials", "category": "Apparel", "description": "Premium 100% cotton t-shirt", "base_price": 8000, "image_url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800", "sizes": ["S", "M", "L", "XL", "XXL"], "colors": [{"name": "White", "hex": "#FFFFFF"}, {"name": "Black", "hex": "#000000"}, {"name": "Navy", "hex": "#1E3A5F"}], "print_methods": ["Screen Print", "DTG", "Embroidery"], "min_quantity": 10, "is_active": True, "stock_quantity": 500, "is_customizable": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Premium Polo Shirt", "branch": "Promotional Materials", "category": "Apparel", "description": "Professional polo shirt", "base_price": 15000, "image_url": "https://images.unsplash.com/photo-1625910513413-5fc44e16c74c?w=800", "sizes": ["S", "M", "L", "XL", "XXL"], "colors": [{"name": "White", "hex": "#FFFFFF"}, {"name": "Black", "hex": "#000000"}, {"name": "Navy", "hex": "#1E3A5F"}], "print_methods": ["Screen Print", "DTG", "Embroidery"], "min_quantity": 10, "is_active": True, "stock_quantity": 300, "is_customizable": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "Branded Cap", "branch": "Promotional Materials", "category": "Apparel", "description": "Adjustable cotton cap for your brand", "base_price": 6000, "image_url": "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800", "sizes": ["One Size"], "colors": [{"name": "White", "hex": "#FFFFFF"}, {"name": "Black", "hex": "#000000"}], "print_methods": ["Screen Print", "Embroidery"], "min_quantity": 20, "is_active": True, "stock_quantity": 400, "is_customizable": True, "created_at": datetime.now(timezone.utc).isoformat()},
        
        # Promotional Materials - Drinkware
        {"id": str(uuid.uuid4()), "name": "Ceramic Coffee Mug", "branch": "Promotional Materials", "category": "Drinkware", "description": "11oz ceramic mug", "base_price": 5000, "image_url": "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800", "sizes": ["11oz", "15oz"], "colors": [{"name": "White", "hex": "#FFFFFF"}, {"name": "Black", "hex": "#000000"}], "print_methods": ["Screen Print", "DTG"], "min_quantity": 12, "is_active": True, "stock_quantity": 600, "is_customizable": True, "created_at": datetime.now(timezone.utc).isoformat()},
        
        # Promotional Materials - Stationery
        {"id": str(uuid.uuid4()), "name": "A5 Notebook", "branch": "Promotional Materials", "category": "Stationery", "description": "Hardcover A5 notebook", "base_price": 8000, "image_url": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800", "sizes": ["A5", "A4"], "colors": [{"name": "Black", "hex": "#000000"}, {"name": "Navy", "hex": "#1E3A5F"}], "print_methods": ["Screen Print", "DTG"], "min_quantity": 25, "is_active": True, "stock_quantity": 350, "is_customizable": True, "created_at": datetime.now(timezone.utc).isoformat()},
        
        # Promotional Materials - Signage
        {"id": str(uuid.uuid4()), "name": "Roll-Up Banner", "branch": "Promotional Materials", "category": "Signage", "description": "85x200cm retractable banner", "base_price": 45000, "image_url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800", "sizes": ["85x200cm", "100x200cm"], "colors": [], "print_methods": ["Screen Print"], "min_quantity": 1, "is_active": True, "stock_quantity": 100, "is_customizable": True, "created_at": datetime.now(timezone.utc).isoformat()},
        
        # KonektSeries - Caps
        {"id": str(uuid.uuid4()), "name": "KonektSeries Classic Cap", "branch": "KonektSeries", "category": "Caps", "description": "Premium embroidered cap with exclusive Konekt branding. Perfect for everyday streetwear style.", "base_price": 25000, "image_url": "https://images.unsplash.com/photo-1560774358-d727658f457c?w=800", "sizes": ["One Size"], "colors": [{"name": "Navy", "hex": "#2D3E50"}, {"name": "Black", "hex": "#000000"}], "print_methods": [], "min_quantity": 1, "is_active": True, "stock_quantity": 150, "is_customizable": False, "created_at": datetime.now(timezone.utc).isoformat()},
        
        # KonektSeries - Hats
        {"id": str(uuid.uuid4()), "name": "KonektSeries Snapback Hat", "branch": "KonektSeries", "category": "Hats", "description": "Stylish snapback hat with signature Konekt logo. Adjustable fit for all head sizes.", "base_price": 28000, "image_url": "https://images.pexels.com/photos/29926576/pexels-photo-29926576.jpeg?w=800", "sizes": ["One Size"], "colors": [{"name": "Navy", "hex": "#2D3E50"}, {"name": "Gold", "hex": "#D4A843"}], "print_methods": [], "min_quantity": 1, "is_active": True, "stock_quantity": 100, "is_customizable": False, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": str(uuid.uuid4()), "name": "KonektSeries Premium Bucket Hat", "branch": "KonektSeries", "category": "Hats", "description": "Trendy bucket hat with embroidered Konekt logo. Sun protection with style.", "base_price": 22000, "image_url": "https://images.unsplash.com/photo-1721637700386-9cf9a860bbea?w=800", "sizes": ["S/M", "L/XL"], "colors": [{"name": "Navy", "hex": "#2D3E50"}, {"name": "Tan", "hex": "#D2B48C"}], "print_methods": [], "min_quantity": 1, "is_active": True, "stock_quantity": 120, "is_customizable": False, "created_at": datetime.now(timezone.utc).isoformat()},
        
        # KonektSeries - Shorts
        {"id": str(uuid.uuid4()), "name": "KonektSeries Urban Shorts", "branch": "KonektSeries", "category": "Shorts", "description": "Comfortable cotton shorts with Konekt branding. Perfect for casual wear and outdoor activities.", "base_price": 35000, "image_url": "https://images.pexels.com/photos/5990682/pexels-photo-5990682.jpeg?w=800", "sizes": ["S", "M", "L", "XL", "XXL"], "colors": [{"name": "Navy", "hex": "#2D3E50"}, {"name": "Black", "hex": "#000000"}, {"name": "Grey", "hex": "#6B7280"}], "print_methods": [], "min_quantity": 1, "is_active": True, "stock_quantity": 200, "is_customizable": False, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    
    await db.products.delete_many({})
    await db.products.insert_many(products)
    
    # Create admin user if not exists
    admin_email = "info@konekt.co.tz"
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        admin_id = str(uuid.uuid4())
        admin_doc = {
            "id": admin_id,
            "email": admin_email,
            "password_hash": hash_password("password123"),
            "full_name": "Konekt Admin",
            "phone": "+255 XXX XXX XXX",
            "company": "Konekt Limited",
            "points": 0,
            "referral_code": generate_referral_code(admin_id),
            "referred_by": None,
            "total_referrals": 0,
            "role": "admin",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_doc)
    
    return {"message": f"Seeded {len(products)} products and admin user"}

# ==================== ROOT ====================

@api_router.get("/")
async def root():
    return {"message": "Welcome to Konekt API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include routers
app.include_router(api_router)
# IMPORTANT: admin_facade_router must be included BEFORE admin_router
# because admin_router has /orders/{order_id} which would catch /orders/list
app.include_router(admin_facade_router)
app.include_router(admin_router)

# Initialize and include sales router
sales_routes = create_sales_routes(db, get_admin_user, generate_quote_number, EmailService)
app.include_router(sales_routes)

# Include AI services router
app.include_router(ai_services_router)

# Include service orders router
app.include_router(service_orders_router)

# Include quote pipeline routes (Kanban board) - MUST be before admin_ops_router
app.include_router(quote_pipeline_router)

# Include admin operations router (CRM, Inventory, Invoices, Tasks, Quotes)
app.include_router(admin_ops_router)

# Include settings router
app.include_router(settings_router)

# Include quote routes (v2)
app.include_router(quote_router)

# Include invoice routes (v2)
app.include_router(invoice_router)

# Include PDF export routes
app.include_router(pdf_router)

# Include order operations routes
app.include_router(order_ops_router)

# Include production queue routes
app.include_router(production_router)

# Include document send routes (email stubs)
app.include_router(document_send_router)

# Include customer-facing order routes
app.include_router(customer_order_router)

# Include payment routes
# IMPORTANT: payment_admin_router has /{payment_id} which would catch "queue"
app.include_router(kwikpay_payment_router)
app.include_router(kwikpay_webhook_router)
app.include_router(bank_transfer_router)
app.include_router(payment_admin_router)

# Include customer admin routes
app.include_router(customer_admin_router)
app.include_router(customers_merged_router)

# Include payment upload routes
app.include_router(payment_upload_router)

# Include hero banner routes
app.include_router(hero_banner_router)

# Include referral public routes
app.include_router(referral_public_router)

# Include customer referral routes
app.include_router(customer_referral_router)

# Include referral settings routes
app.include_router(referral_settings_router)

# Include customer points routes
app.include_router(customer_points_router)

# Include admin points routes
app.include_router(admin_points_router)

# Include affiliate public routes
app.include_router(affiliate_public_router)

# Include affiliate admin routes
app.include_router(affiliate_admin_router)

# Include affiliate commission routes
app.include_router(affiliate_commission_router)

# Include affiliate payout routes
app.include_router(affiliate_payout_router)

# Include affiliate application and portal routes
app.include_router(affiliate_application_router)
app.include_router(affiliate_portal_router)

# Include Phase A alignment routes
app.include_router(creative_service_v2_router)
app.include_router(crm_settings_router)
app.include_router(inventory_variant_router)
app.include_router(central_payments_router)
app.include_router(statement_router)
app.include_router(warehouse_router)
app.include_router(raw_materials_router)
app.include_router(stock_movement_router)
app.include_router(warehouse_transfer_router)
app.include_router(creative_project_collab_router)
app.include_router(creative_project_router)
app.include_router(customer_statement_router)
app.include_router(affiliate_self_service_router)
app.include_router(admin_setup_router)
app.include_router(public_product_variant_router)
app.include_router(qa_router)
app.include_router(health_router)
app.include_router(service_form_router)
app.include_router(service_request_router)
app.include_router(service_request_admin_router)
app.include_router(service_request_customer_router)
app.include_router(upload_service_files_router)
app.include_router(points_checkout_router)
app.include_router(points_apply_router)
app.include_router(launch_hardening_router)
app.include_router(affiliate_admin_router)
app.include_router(affiliate_dashboard_router)
app.include_router(team_role_router)
app.include_router(audit_router)
app.include_router(launch_report_router)
app.include_router(customer_address_router)
app.include_router(customer_invoice_router)
app.include_router(customer_quote_actions_router)
app.include_router(customer_orders_router)
app.include_router(affiliate_settings_router)
app.include_router(affiliate_tracking_router)
app.include_router(affiliate_promotions_router)
app.include_router(affiliate_payout_admin_router)
app.include_router(affiliate_perk_router)
app.include_router(affiliate_campaign_router)
app.include_router(campaign_marketing_router)
app.include_router(affiliate_campaign_preview_router)
app.include_router(checkout_campaign_router)
app.include_router(document_pdf_router)
app.include_router(notification_test_router)
app.include_router(campaign_performance_router)
app.include_router(business_settings_router)
app.include_router(go_live_readiness_router)
app.include_router(payment_settings_router)
app.include_router(launch_email_router)
app.include_router(payment_gateway_status_router)
app.include_router(points_rules_router)
app.include_router(first_order_discount_router)
app.include_router(seed_sample_catalog_router)
app.include_router(crm_intelligence_router)
app.include_router(sales_kpi_router)
app.include_router(marketing_performance_router)
app.include_router(crm_deal_router)
app.include_router(customer_account_router)
app.include_router(crm_relationship_router)
app.include_router(staff_dashboard_router)
app.include_router(supervisor_team_router)
app.include_router(delivery_note_router)
app.include_router(goods_receiving_router)
app.include_router(supplier_router)
app.include_router(procurement_router)
app.include_router(inventory_ops_dashboard_router)
app.include_router(inventory_ledger_router)
app.include_router(geography_router)
app.include_router(partner_router)
app.include_router(partner_catalog_router)
app.include_router(country_pricing_router)
app.include_router(routing_rules_router)
app.include_router(multi_country_routing_router)
app.include_router(partner_auth_router)
app.include_router(partner_portal_router)
app.include_router(partner_bulk_upload_router)
app.include_router(country_launch_router)
app.include_router(country_expansion_router)
app.include_router(country_partner_admin_router)
app.include_router(public_country_catalog_router)
app.include_router(marketplace_listing_router)
app.include_router(partner_listing_submission_router)
app.include_router(public_marketplace_router)
app.include_router(media_upload_router)
app.include_router(partner_excel_import_router)
app.include_router(vendor_orders_router)

# Service Orchestration Routes
app.include_router(service_catalog_router)
app.include_router(service_form_template_router)
app.include_router(blank_product_router)
app.include_router(site_visit_router)
app.include_router(public_service_router)
app.include_router(partner_capability_router)
app.include_router(delivery_partner_router)
app.include_router(product_insight_router)

# Recurring Services + Reorder Pack Routes
app.include_router(reorder_router)
app.include_router(repeat_service_request_router)
app.include_router(recurring_service_plan_router)
app.include_router(recurring_supply_plan_router)
app.include_router(account_manager_router)
app.include_router(sla_alerts_router)

# Contract Clients + Billing Discipline Pack
app.include_router(contract_client_router)
app.include_router(account_manager_note_router)
app.include_router(negotiated_pricing_router)
app.include_router(contract_sla_router)
app.include_router(recurring_invoice_router)

# Admin Performance & Insights Pack
app.include_router(partner_performance_router)
app.include_router(service_insight_router)
app.include_router(staff_performance_router)

# Super Admin Ecosystem Dashboard
app.include_router(super_admin_dashboard_router)

# Group Markup & Margin Protection
app.include_router(group_markup_router)

# Partner Settlement
app.include_router(partner_settlement_router)

# Payment Proof Workflow
app.include_router(payment_proof_router)

# Pricing Validation
app.include_router(pricing_validation_router)

# Commission Rules Engine
app.include_router(commission_rules_router)

# Campaign Pricing (Dual Promotion)
app.include_router(campaign_pricing_router)

# Supervisor Dashboard
app.include_router(supervisor_dashboard_router)

# Staff Alerts
app.include_router(staff_alerts_router)

# Business Pricing Request
app.include_router(business_pricing_request_router)

# Auto-Numbering Configuration
app.include_router(auto_numbering_router)

# Sales Guided Questions
app.include_router(sales_guided_questions_router)

# Numbering Rules
app.include_router(numbering_rules_router)

# Client Profiles
app.include_router(client_profile_router)

# Welcome Rewards
app.include_router(welcome_rewards_router)

# Runtime Settings
app.include_router(runtime_settings_router)

# QA Seed
app.include_router(qa_seed_router)

# Business Pricing Admin
app.include_router(business_pricing_admin_router)

# Notification System
app.include_router(notification_router)

# Checkout Points Validation
app.include_router(checkout_points_router)

# Production Progress Tracking
from production_progress_routes import router as production_progress_router
app.include_router(production_progress_router)

# Guest Lead Capture
from guest_lead_routes import router as guest_lead_router
app.include_router(guest_lead_router)

# Invoice Payment Flow
from invoice_payment_routes import router as invoice_payment_router
app.include_router(invoice_payment_router)

# Sales Queue
from sales_queue_routes import router as sales_queue_router
app.include_router(sales_queue_router)

# Sales Orders (role-filtered order list for sales team)
from sales_orders_routes import router as sales_orders_router
app.include_router(sales_orders_router)

# Payment Timeline
from payment_timeline_routes import router as payment_timeline_router
app.include_router(payment_timeline_router)

# Sales Intelligence (leaderboard, smart assignment)
from sales_intelligence_routes import router as sales_intelligence_router
app.include_router(sales_intelligence_router)

# Staff Performance (staff + supervisor dashboards)
from staff_performance_routes import router as staff_performance_router
app.include_router(staff_performance_router)

# Commission + Margin Distribution Engine
from commission_margin_engine_routes import router as commission_margin_engine_router
app.include_router(commission_margin_engine_router)

# Service Partner Capability Mapping
from service_partner_capability_routes import router as service_partner_capability_router
app.include_router(service_partner_capability_router)

# Affiliate Margin Rules
from affiliate_margin_rules_routes import router as affiliate_margin_rules_router
app.include_router(affiliate_margin_rules_router)

# Growth Engine - Unified Commission, Promotion, Payout, Attribution
from unified_commission_engine_routes import router as unified_commission_router
app.include_router(unified_commission_router)

from promotion_engine_routes import router as promotion_engine_router
app.include_router(promotion_engine_router)

from payout_engine_routes import router as payout_engine_router
app.include_router(payout_engine_router)

from attribution_engine_routes import router as attribution_engine_router
app.include_router(attribution_engine_router)

# Growth Pack - Notifications, Analytics, AI Assistant
from notifications_routes import router as notifications_router
app.include_router(notifications_router)

from analytics_routes import router as analytics_router
app.include_router(analytics_router)

from ai_assistant_routes import router as ai_assistant_router
app.include_router(ai_assistant_router)

# Final Operations + Growth Pack
from progress_engine_routes import router as progress_engine_router
app.include_router(progress_engine_router)

from sales_provider_coordination_routes import router as sales_provider_coordination_router
app.include_router(sales_provider_coordination_router)

from ai_assistant_upgrade_routes import router as ai_assistant_upgrade_router
app.include_router(ai_assistant_upgrade_router)

from affiliate_performance_routes import router as affiliate_performance_router
app.include_router(affiliate_performance_router)

# GTM + Partner Management + Onboarding Pack
from go_to_market_settings_routes import router as gtm_settings_router
app.include_router(gtm_settings_router)

from affiliate_partner_manager_routes import router as affiliate_partner_manager_router
app.include_router(affiliate_partner_manager_router)

from vendor_partner_portal_routes import router as vendor_partner_portal_router
app.include_router(vendor_partner_portal_router)

# Admin Settings Hub
from admin_settings_hub_routes import router as admin_settings_hub_router
app.include_router(admin_settings_hub_router)

# Smart Partner Ecosystem
from smart_partner_ecosystem_routes import router as smart_partner_ecosystem_router
app.include_router(smart_partner_ecosystem_router)

# Service Catalog Tree
from service_catalog_tree_routes import router as service_catalog_tree_router
app.include_router(service_catalog_tree_router)

# Service Request Templates
from service_request_templates_routes import router as service_request_templates_router
app.include_router(service_request_templates_router)

# Customer In-Account Service Requests
from customer_in_account_service_routes import router as customer_in_account_service_router

# Customer Checkout Quote
from customer_checkout_quote_routes import router as customer_checkout_quote_router

# Admin Catalog Setup
from admin_catalog_routes import router as admin_catalog_router
app.include_router(admin_catalog_router)

# Admin Deliveries
from admin_deliveries_routes import router as admin_deliveries_router
app.include_router(admin_deliveries_router)

app.include_router(customer_checkout_quote_router)

# Instant Quote Engine
from instant_quote_engine_routes import router as instant_quote_router
app.include_router(instant_quote_router)

# Sales Command Center
from sales_command_center_routes import router as sales_command_router
app.include_router(sales_command_router)

# Unified Service Quote Request (simplified)
@app.post("/api/service-requests-quick", tags=["Service Requests"])
async def create_quick_service_request(payload: dict, request: Request):
    from datetime import datetime, timezone
    import uuid
    db = request.app.mongodb
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    user = None
    if token:
        try:
            import jwt, os
            decoded = jwt.decode(token, os.environ.get("JWT_SECRET", "konekt-secret-key"), algorithms=["HS256"])
            user = decoded
        except Exception:
            pass

    doc = {
        "id": str(uuid.uuid4()),
        "service_key": payload.get("service_key"),
        "service_name": payload.get("service_name"),
        "client_name": payload.get("client_name"),
        "client_phone": payload.get("client_phone"),
        "client_email": payload.get("client_email"),
        "invoice_client_name": payload.get("invoice_client_name"),
        "invoice_client_phone": payload.get("invoice_client_phone"),
        "invoice_client_email": payload.get("invoice_client_email"),
        "invoice_client_tin": payload.get("invoice_client_tin"),
        "brief": payload.get("brief"),
        "delivery_or_site_address": payload.get("delivery_or_site_address"),
        "status": "new",
        "source": "unified_marketplace",
        "customer_id": user.get("user_id") if user else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.service_requests_quick.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "request_id": doc["id"], "message": "Service request submitted successfully"}



app.include_router(customer_in_account_service_router)

# Customer Notifications & Activity Feed
from customer_notifications_routes import router as customer_notifications_router
app.include_router(customer_notifications_router)

# Affiliate Growth Routes
from affiliate_growth_routes import router as affiliate_growth_router
app.include_router(affiliate_growth_router)

# WhatsApp Automation
from whatsapp_automation_routes import router as whatsapp_automation_router
app.include_router(whatsapp_automation_router)

# Unified Commerce Filters and Docs Routes
from commerce_filters_and_docs_routes import (
    admin_subgroups_router,
    admin_groups_router,
    vendor_products_router,
    marketplace_router,
    docs_router,
    sales_assist_router
)
app.include_router(admin_subgroups_router)
app.include_router(admin_groups_router)
app.include_router(vendor_products_router)
app.include_router(marketplace_router)
app.include_router(docs_router)
app.include_router(sales_assist_router)

# WhatsApp Twilio Integration (Live)
from whatsapp_twilio_integration_routes import router as whatsapp_twilio_router
app.include_router(whatsapp_twilio_router)

# PDF Generation Routes
from pdf_generation_routes import router as pdf_generation_router
app.include_router(pdf_generation_router)

# Dashboard Metrics Routes
from dashboard_metrics_routes import router as dashboard_metrics_router
app.include_router(dashboard_metrics_router)

# Sales Rating Routes
from sales_rating_routes import router as sales_rating_router
app.include_router(sales_rating_router)

# Branding Settings Routes
from branding_settings_routes import router as branding_settings_router
app.include_router(branding_settings_router)

# Enterprise PDF Routes
from enterprise_pdf_routes import router as enterprise_pdf_router
app.include_router(enterprise_pdf_router)

# Customer Account & Payment Routes (legacy compatibility)
from customer_account_and_payment_routes import payment_router as customer_payment_router
app.include_router(customer_payment_router)

# Final Commercial Flow Routes (upgraded profile + full commercial flow)
from final_commercial_flow_routes import profile_router as commercial_profile_router, flow_router as commercial_flow_router
app.include_router(commercial_profile_router)
app.include_router(commercial_flow_router)

# Payments + Fulfillment Governance Routes
from payments_governance_routes import router as payments_governance_router
app.include_router(payments_governance_router)

# Admin Flow Fixes Routes
from admin_flow_fixes_routes import router as admin_flow_fixes_router
app.include_router(admin_flow_fixes_router)

from referral_commission_governance_routes import router as referral_commission_router
app.include_router(referral_commission_router)

from payment_submission_fixes_routes import router as payment_submission_fixes_router
app.include_router(payment_submission_fixes_router)

from multi_request_routes import router as multi_request_router
app.include_router(multi_request_router)

from public_payment_info_routes import router as public_payment_info_router
app.include_router(public_payment_info_router)

from invoice_branding_routes import router as invoice_branding_router
app.include_router(invoice_branding_router)




# Mount static directory for listing media uploads
LISTING_MEDIA_DIR = Path("/app/uploads/listing_media")
LISTING_MEDIA_DIR.mkdir(parents=True, exist_ok=True)

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    # Make MongoDB accessible via request.app.mongodb
    app.mongodb = db
    # Initialize automation engine
    automation = init_automation_engine(db, EmailService)
    # Start automation engine in background (uncomment for production)
    # await automation.start()
    logger.info("Sales automation engine initialized (manual mode)")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
