"""
Client Ownership Service — Core CRUD for companies, contacts, and individual clients.
All three entity types share a unified ownership contract:
  - owner_sales_id, client_type, status, created_at, updated_at

This is the data layer. Routing logic lives in ownership_routing_service.py.
"""
import re
import uuid
from datetime import datetime, timezone

# Free email domains — do NOT trust for corporate domain matching
FREE_EMAIL_DOMAINS = {
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com",
    "aol.com", "icloud.com", "mail.com", "protonmail.com", "zoho.com",
    "yandex.com", "gmx.com", "fastmail.com", "tutanota.com",
}

# Company name suffixes to strip during normalization
STRIP_SUFFIXES = re.compile(
    r"\b(ltd|limited|inc|incorporated|corp|corporation|llc|plc|co|company|group|gmbh|pty|pvt|sa|srl|ag)\b",
    re.IGNORECASE,
)


def normalize_company_name(name: str) -> str:
    """Normalize company name for matching: lowercase, strip suffixes, collapse whitespace."""
    if not name:
        return ""
    n = name.lower().strip()
    n = STRIP_SUFFIXES.sub("", n)
    n = re.sub(r"[^a-z0-9\s]", "", n)  # remove punctuation
    n = re.sub(r"\s+", " ", n).strip()
    return n


def extract_domain(email: str) -> str:
    """Extract domain from email. Returns empty string for free email domains."""
    if not email or "@" not in email:
        return ""
    domain = email.split("@")[1].lower().strip()
    if domain in FREE_EMAIL_DOMAINS:
        return ""  # free domain — not reliable for corporate matching
    return domain


# ===== Company CRUD =====

async def create_company(db, *, name: str, domain: str = "", owner_sales_id: str = "",
                          industry: str = "", notes: str = "", created_by: str = ""):
    now = datetime.now(timezone.utc).isoformat()
    company_id = str(uuid.uuid4())
    doc = {
        "id": company_id,
        "name": name,
        "normalized_name": normalize_company_name(name),
        "domain": domain.lower().strip() if domain else "",
        "owner_sales_id": owner_sales_id,
        "client_type": "company",
        "industry": industry,
        "notes": notes,
        "status": "active",
        "created_at": now,
        "updated_at": now,
        "created_by": created_by,
    }
    await db.companies.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


async def find_company_by_id(db, company_id: str):
    return await db.companies.find_one({"id": company_id}, {"_id": 0})


async def find_company_by_domain(db, domain: str):
    if not domain or domain in FREE_EMAIL_DOMAINS:
        return None
    return await db.companies.find_one({"domain": domain, "status": "active"}, {"_id": 0})


async def find_company_by_name(db, name: str):
    normalized = normalize_company_name(name)
    if not normalized:
        return None
    return await db.companies.find_one(
        {"normalized_name": normalized, "status": "active"}, {"_id": 0}
    )


async def list_companies(db, owner_sales_id: str = None, search: str = ""):
    query = {"status": "active"}
    if owner_sales_id:
        query["owner_sales_id"] = owner_sales_id
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"domain": {"$regex": search, "$options": "i"}},
        ]
    docs = await db.companies.find(query, {"_id": 0}).sort("name", 1).to_list(500)
    return docs


# ===== Contact CRUD =====

async def create_contact(db, *, name: str, email: str = "", phone: str = "",
                          company_id: str = "", position: str = "", created_by: str = ""):
    now = datetime.now(timezone.utc).isoformat()
    contact_id = str(uuid.uuid4())
    doc = {
        "id": contact_id,
        "name": name,
        "email": email.lower().strip() if email else "",
        "phone": phone,
        "company_id": company_id,
        "position": position,
        "client_type": "contact",
        "status": "active",
        "created_at": now,
        "updated_at": now,
        "created_by": created_by,
    }
    await db.contacts.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


async def find_contact_by_email(db, email: str):
    if not email:
        return None
    return await db.contacts.find_one(
        {"email": email.lower().strip(), "status": "active"}, {"_id": 0}
    )


async def find_contact_by_phone(db, phone: str):
    if not phone:
        return None
    # Normalize phone: strip spaces, dashes
    clean = re.sub(r"[\s\-\(\)]", "", phone)
    return await db.contacts.find_one(
        {"phone": {"$regex": re.escape(clean[-9:])}, "status": "active"}, {"_id": 0}
    )


async def list_contacts_for_company(db, company_id: str):
    docs = await db.contacts.find(
        {"company_id": company_id, "status": "active"}, {"_id": 0}
    ).sort("name", 1).to_list(200)
    return docs


# ===== Individual Client CRUD =====

async def create_individual(db, *, name: str, email: str = "", phone: str = "",
                             owner_sales_id: str = "", notes: str = "", created_by: str = ""):
    now = datetime.now(timezone.utc).isoformat()
    individual_id = str(uuid.uuid4())
    doc = {
        "id": individual_id,
        "name": name,
        "email": email.lower().strip() if email else "",
        "phone": phone,
        "owner_sales_id": owner_sales_id,
        "client_type": "individual",
        "notes": notes,
        "status": "active",
        "created_at": now,
        "updated_at": now,
        "created_by": created_by,
    }
    await db.individual_clients.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


async def find_individual_by_email(db, email: str):
    if not email:
        return None
    return await db.individual_clients.find_one(
        {"email": email.lower().strip(), "status": "active"}, {"_id": 0}
    )


async def find_individual_by_phone(db, phone: str):
    if not phone:
        return None
    clean = re.sub(r"[\s\-\(\)]", "", phone)
    return await db.individual_clients.find_one(
        {"phone": {"$regex": re.escape(clean[-9:])}, "status": "active"}, {"_id": 0}
    )


async def list_individuals(db, owner_sales_id: str = None, search: str = ""):
    query = {"status": "active"}
    if owner_sales_id:
        query["owner_sales_id"] = owner_sales_id
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    docs = await db.individual_clients.find(query, {"_id": 0}).sort("name", 1).to_list(500)
    return docs
