"""
Client Ownership Routes — Admin CRUD for companies, contacts, individuals.
Admin reassignment tool with full audit logging.
Sales visibility enforcement: sales users only see owned entities.
"""
import os
import jwt
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional
from services.client_ownership_service import (
    create_company, create_contact, create_individual,
    find_company_by_id, list_companies, list_contacts_for_company,
    list_individuals,
)

router = APIRouter(tags=["Client Ownership"])
security = HTTPBearer()

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]
JWT_SECRET = os.environ.get("JWT_SECRET", "konekt-secret-key-change-in-production")


async def get_auth_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_admin(user: dict):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


def require_admin_or_sales(user: dict):
    if user.get("role") not in ("admin", "staff", "sales"):
        raise HTTPException(status_code=403, detail="Admin or sales access required")


def get_sales_filter(user: dict) -> str:
    """Returns owner_sales_id filter for sales users, empty for admin."""
    if user.get("role") == "admin":
        return ""  # admin sees all
    return user.get("id", "")


# ===== COMPANIES =====

@router.get("/api/admin/client-ownership/companies")
async def get_companies(
    search: str = "",
    user: dict = Depends(get_auth_user)
):
    require_admin_or_sales(user)
    owner_filter = get_sales_filter(user)
    companies = await list_companies(db, owner_sales_id=owner_filter or None, search=search)
    # Enrich with contact count and owner name
    for c in companies:
        c["contact_count"] = await db.contacts.count_documents({"company_id": c["id"], "status": "active"})
        if c.get("owner_sales_id"):
            owner = await db.users.find_one({"id": c["owner_sales_id"]}, {"_id": 0, "full_name": 1, "name": 1, "email": 1})
            c["owner_name"] = (owner.get("full_name") or owner.get("name") or owner.get("email", "")) if owner else ""
        else:
            c["owner_name"] = ""
    return {"companies": companies}


@router.get("/api/admin/client-ownership/companies/{company_id}")
async def get_company_detail(company_id: str, user: dict = Depends(get_auth_user)):
    require_admin_or_sales(user)
    company = await find_company_by_id(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    # Sales can only see owned companies
    if user.get("role") != "admin" and company.get("owner_sales_id") != user.get("id"):
        raise HTTPException(status_code=403, detail="Not your company")
    contacts = await list_contacts_for_company(db, company_id)
    # Get owner name
    owner_name = ""
    if company.get("owner_sales_id"):
        owner = await db.users.find_one({"id": company["owner_sales_id"]}, {"_id": 0, "full_name": 1, "name": 1})
        owner_name = (owner.get("full_name") or owner.get("name") or "") if owner else ""
    return {**company, "contacts": contacts, "owner_name": owner_name}


@router.post("/api/admin/client-ownership/companies")
async def create_company_endpoint(payload: dict, user: dict = Depends(get_auth_user)):
    require_admin_or_sales(user)
    name = payload.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Company name required")

    # Duplicate prevention: check by domain first, then by normalized name
    from services.client_ownership_service import find_company_by_domain, find_company_by_name, normalize_company_name, extract_domain
    domain = payload.get("domain", "").lower().strip()
    if domain:
        existing = await find_company_by_domain(db, domain)
        if existing:
            return {"duplicate": True, "existing": existing, "message": f"Company with domain '{domain}' already exists: {existing['name']}"}
    normalized = normalize_company_name(name)
    if normalized:
        existing = await find_company_by_name(db, name)
        if existing:
            return {"duplicate": True, "existing": existing, "message": f"Similar company already exists: {existing['name']}"}

    # Default owner = current user for sales, or specified owner
    owner_id = payload.get("owner_sales_id", "")
    if not owner_id and user.get("role") in ("sales", "staff"):
        owner_id = user.get("id", "")
    company = await create_company(
        db, name=name,
        domain=domain or extract_domain(payload.get("contact_email", "")),
        owner_sales_id=owner_id,
        industry=payload.get("industry", ""),
        notes=payload.get("notes", ""),
        created_by=user.get("id", ""),
    )
    return company


# ===== CONTACTS =====

@router.get("/api/admin/client-ownership/contacts")
async def get_contacts(
    company_id: str = "",
    user: dict = Depends(get_auth_user)
):
    require_admin_or_sales(user)
    if company_id:
        contacts = await list_contacts_for_company(db, company_id)
    else:
        query = {"status": "active"}
        contacts = await db.contacts.find(query, {"_id": 0}).sort("name", 1).to_list(500)
    return {"contacts": contacts}


@router.post("/api/admin/client-ownership/contacts")
async def create_contact_endpoint(payload: dict, user: dict = Depends(get_auth_user)):
    require_admin_or_sales(user)
    contact = await create_contact(
        db,
        name=payload.get("name", ""),
        email=payload.get("email", ""),
        phone=payload.get("phone", ""),
        company_id=payload.get("company_id", ""),
        position=payload.get("position", ""),
        created_by=user.get("id", ""),
    )
    return contact


# ===== INDIVIDUALS =====

@router.get("/api/admin/client-ownership/individuals")
async def get_individuals(
    search: str = "",
    user: dict = Depends(get_auth_user)
):
    require_admin_or_sales(user)
    owner_filter = get_sales_filter(user)
    individuals = await list_individuals(db, owner_sales_id=owner_filter or None, search=search)
    # Enrich with owner name
    for ind in individuals:
        if ind.get("owner_sales_id"):
            owner = await db.users.find_one({"id": ind["owner_sales_id"]}, {"_id": 0, "full_name": 1, "name": 1, "email": 1})
            ind["owner_name"] = (owner.get("full_name") or owner.get("name") or owner.get("email", "")) if owner else ""
        else:
            ind["owner_name"] = ""
    return {"individuals": individuals}


@router.post("/api/admin/client-ownership/individuals")
async def create_individual_endpoint(payload: dict, user: dict = Depends(get_auth_user)):
    require_admin_or_sales(user)
    email = payload.get("email", "").strip().lower()
    phone = payload.get("phone", "").strip()

    # Duplicate prevention: check by email, then phone
    if email:
        from services.client_ownership_service import find_individual_by_email
        existing = await find_individual_by_email(db, email)
        if existing:
            return {"duplicate": True, "existing": existing, "message": f"Individual with email '{email}' already exists: {existing['name']}"}
    if phone:
        from services.client_ownership_service import find_individual_by_phone
        existing = await find_individual_by_phone(db, phone)
        if existing:
            return {"duplicate": True, "existing": existing, "message": f"Individual with matching phone already exists: {existing['name']}"}

    owner_id = payload.get("owner_sales_id", "")
    if not owner_id and user.get("role") in ("sales", "staff"):
        owner_id = user.get("id", "")
    individual = await create_individual(
        db,
        name=payload.get("name", ""),
        email=email,
        phone=phone,
        owner_sales_id=owner_id,
        notes=payload.get("notes", ""),
        created_by=user.get("id", ""),
    )
    return individual


# ===== UNIFIED CLIENT SEARCH =====

@router.get("/api/admin/client-ownership/search")
async def search_all_clients(q: str = "", user: dict = Depends(get_auth_user)):
    """Search across companies, contacts, and individuals."""
    require_admin_or_sales(user)
    if not q or len(q) < 2:
        return {"results": []}

    owner_filter = get_sales_filter(user)
    regex = {"$regex": q, "$options": "i"}
    results = []

    # Search companies
    comp_query = {"status": "active", "$or": [{"name": regex}, {"domain": regex}]}
    if owner_filter:
        comp_query["owner_sales_id"] = owner_filter
    companies = await db.companies.find(comp_query, {"_id": 0}).to_list(20)
    for c in companies:
        results.append({"type": "company", "id": c["id"], "name": c["name"], "detail": c.get("domain", ""), "owner_sales_id": c.get("owner_sales_id", "")})

    # Search individuals
    ind_query = {"status": "active", "$or": [{"name": regex}, {"email": regex}]}
    if owner_filter:
        ind_query["owner_sales_id"] = owner_filter
    individuals = await db.individual_clients.find(ind_query, {"_id": 0}).to_list(20)
    for i in individuals:
        results.append({"type": "individual", "id": i["id"], "name": i["name"], "detail": i.get("email", ""), "owner_sales_id": i.get("owner_sales_id", "")})

    # Search contacts (admin only — contacts inherit company ownership)
    if not owner_filter:
        contacts = await db.contacts.find({"status": "active", "$or": [{"name": regex}, {"email": regex}]}, {"_id": 0}).to_list(20)
        for ct in contacts:
            results.append({"type": "contact", "id": ct["id"], "name": ct["name"], "detail": ct.get("email", ""), "company_id": ct.get("company_id", "")})

    return {"results": results}


# ===== ADMIN REASSIGNMENT =====

@router.post("/api/admin/client-ownership/reassign")
async def reassign_client(payload: dict, user: dict = Depends(get_auth_user)):
    """Admin: Reassign a company or individual to a different sales owner."""
    require_admin(user)

    entity_type = payload.get("entity_type")  # "company" or "individual"
    entity_id = payload.get("entity_id")
    new_owner_id = payload.get("new_owner_id")
    reason = payload.get("reason", "")

    if not entity_type or not entity_id or not new_owner_id:
        raise HTTPException(status_code=400, detail="entity_type, entity_id, and new_owner_id required")

    now = datetime.now(timezone.utc).isoformat()

    if entity_type == "company":
        entity = await db.companies.find_one({"id": entity_id}, {"_id": 0})
        if not entity:
            raise HTTPException(status_code=404, detail="Company not found")
        previous_owner = entity.get("owner_sales_id", "")
        await db.companies.update_one(
            {"id": entity_id},
            {"$set": {"owner_sales_id": new_owner_id, "updated_at": now}}
        )
    elif entity_type == "individual":
        entity = await db.individual_clients.find_one({"id": entity_id}, {"_id": 0})
        if not entity:
            raise HTTPException(status_code=404, detail="Individual not found")
        previous_owner = entity.get("owner_sales_id", "")
        await db.individual_clients.update_one(
            {"id": entity_id},
            {"$set": {"owner_sales_id": new_owner_id, "updated_at": now}}
        )
    else:
        raise HTTPException(status_code=400, detail="entity_type must be 'company' or 'individual'")

    # Get names for audit
    prev_owner_doc = await db.users.find_one({"id": previous_owner}, {"_id": 0, "full_name": 1, "name": 1}) if previous_owner else None
    new_owner_doc = await db.users.find_one({"id": new_owner_id}, {"_id": 0, "full_name": 1, "name": 1})
    admin_name = user.get("full_name") or user.get("name") or user.get("email", "")

    audit_entry = {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "entity_name": entity.get("name", ""),
        "previous_owner_id": previous_owner,
        "previous_owner_name": (prev_owner_doc.get("full_name") or prev_owner_doc.get("name", "")) if prev_owner_doc else "",
        "new_owner_id": new_owner_id,
        "new_owner_name": (new_owner_doc.get("full_name") or new_owner_doc.get("name", "")) if new_owner_doc else "",
        "reason": reason,
        "changed_by_id": user.get("id", ""),
        "changed_by_name": admin_name,
        "created_at": now,
    }
    await db.reassignment_audit_log.insert_one(audit_entry)

    return {"ok": True, "audit": {k: v for k, v in audit_entry.items() if k != "_id"}}


@router.get("/api/admin/client-ownership/reassignment-log")
async def get_reassignment_log(user: dict = Depends(get_auth_user)):
    """Admin: view reassignment audit log."""
    require_admin(user)
    docs = await db.reassignment_audit_log.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"entries": docs}


# ===== DUPLICATE CHECK =====

@router.post("/api/admin/client-ownership/check-duplicate")
async def check_duplicate(payload: dict, user: dict = Depends(get_auth_user)):
    """Pre-creation duplicate check. Returns matches if found."""
    require_admin_or_sales(user)
    from services.client_ownership_service import (
        find_company_by_domain, find_company_by_name,
        find_contact_by_email, find_individual_by_email,
        extract_domain,
    )
    matches = []
    email = payload.get("email", "").strip().lower()
    company_name = payload.get("company_name", "").strip()
    domain = extract_domain(email) if email else ""

    if email:
        contact = await find_contact_by_email(db, email)
        if contact:
            matches.append({"type": "contact", "name": contact["name"], "email": contact["email"], "company_id": contact.get("company_id", "")})
        individual = await find_individual_by_email(db, email)
        if individual:
            matches.append({"type": "individual", "name": individual["name"], "email": individual["email"], "owner_sales_id": individual.get("owner_sales_id", "")})
    if domain:
        company = await find_company_by_domain(db, domain)
        if company:
            matches.append({"type": "company", "name": company["name"], "domain": company.get("domain", ""), "owner_sales_id": company.get("owner_sales_id", "")})
    if company_name:
        company = await find_company_by_name(db, company_name)
        if company:
            matches.append({"type": "company", "name": company["name"], "domain": company.get("domain", ""), "owner_sales_id": company.get("owner_sales_id", "")})

    return {"has_duplicates": len(matches) > 0, "matches": matches}


# ===== STATS =====

@router.get("/api/admin/client-ownership/stats")
async def get_ownership_stats(user: dict = Depends(get_auth_user)):
    require_admin(user)
    companies = await db.companies.count_documents({"status": "active"})
    contacts = await db.contacts.count_documents({"status": "active"})
    individuals = await db.individual_clients.count_documents({"status": "active"})
    reassignments = await db.reassignment_audit_log.count_documents({})
    # Unowned entities
    unowned_companies = await db.companies.count_documents({"status": "active", "$or": [{"owner_sales_id": ""}, {"owner_sales_id": None}]})
    unowned_individuals = await db.individual_clients.count_documents({"status": "active", "$or": [{"owner_sales_id": ""}, {"owner_sales_id": None}]})
    return {
        "total_companies": companies,
        "total_contacts": contacts,
        "total_individuals": individuals,
        "total_reassignments": reassignments,
        "unowned_companies": unowned_companies,
        "unowned_individuals": unowned_individuals,
    }
