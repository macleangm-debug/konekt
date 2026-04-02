"""
Ownership Routing Service — MANDATORY centralized service for ALL inbound creation paths.

Every request/lead/quote/customer context MUST call resolve_owner() before saving.
This service enforces:
  1. Ownership continuity (existing company/individual → keep existing owner)
  2. New entity auto-assignment (only when no owner exists)
  3. Duplicate prevention (auto-link instead of duplicate creation)
  4. Corporate matching confidence: exact ID > exact domain > strong name match > manual

Returns an OwnershipResolution with:
  - owner_sales_id (resolved or newly assigned)
  - company_id (if matched/created)
  - contact_id (if matched/created)
  - individual_id (if matched/created)
  - resolution_type: "existing_company", "existing_individual", "new_company", "new_individual", "ambiguous"
"""
from datetime import datetime, timezone
from services.client_ownership_service import (
    normalize_company_name, extract_domain,
    find_company_by_id, find_company_by_domain, find_company_by_name,
    find_contact_by_email, find_contact_by_phone,
    find_individual_by_email, find_individual_by_phone,
    create_company, create_contact, create_individual,
    list_contacts_for_company,
)


async def resolve_owner(db, *, email: str = "", phone: str = "",
                         company_name: str = "", company_id: str = "",
                         contact_name: str = "", created_by: str = ""):
    """
    Central ownership resolver. Called by ALL inbound creation paths.
    
    Resolution priority:
      1. Exact company_id reference → use company owner
      2. Contact/individual match by email → trace to company or individual owner
      3. Contact/individual match by phone → trace to company or individual owner
      4. Domain match from email → use company owner
      5. Strong normalized company-name match → use company owner
      6. No match → auto-assign new owner, create entity
    
    Returns dict with resolution details.
    """
    now = datetime.now(timezone.utc).isoformat()
    resolution = {
        "owner_sales_id": None,
        "company_id": None,
        "contact_id": None,
        "individual_id": None,
        "resolution_type": "unresolved",
        "confidence": "none",
        "resolved_at": now,
    }

    # --- 1. Exact company_id reference ---
    if company_id:
        company = await find_company_by_id(db, company_id)
        if company and company.get("owner_sales_id"):
            resolution["owner_sales_id"] = company["owner_sales_id"]
            resolution["company_id"] = company["id"]
            resolution["resolution_type"] = "existing_company"
            resolution["confidence"] = "exact_id"
            # Ensure contact exists under company
            if email:
                await _ensure_contact_under_company(db, email, contact_name, phone, company["id"], created_by)
            return resolution

    # --- 2. Check individual/contact match by email ---
    if email:
        # Check contacts first (linked to company)
        contact = await find_contact_by_email(db, email)
        if contact and contact.get("company_id"):
            company = await find_company_by_id(db, contact["company_id"])
            if company and company.get("owner_sales_id"):
                resolution["owner_sales_id"] = company["owner_sales_id"]
                resolution["company_id"] = company["id"]
                resolution["contact_id"] = contact["id"]
                resolution["resolution_type"] = "existing_company"
                resolution["confidence"] = "contact_email"
                return resolution

        # Check individual clients
        individual = await find_individual_by_email(db, email)
        if individual and individual.get("owner_sales_id"):
            resolution["owner_sales_id"] = individual["owner_sales_id"]
            resolution["individual_id"] = individual["id"]
            resolution["resolution_type"] = "existing_individual"
            resolution["confidence"] = "individual_email"
            return resolution

    # --- 3. Check by phone ---
    if phone:
        contact = await find_contact_by_phone(db, phone)
        if contact and contact.get("company_id"):
            company = await find_company_by_id(db, contact["company_id"])
            if company and company.get("owner_sales_id"):
                resolution["owner_sales_id"] = company["owner_sales_id"]
                resolution["company_id"] = company["id"]
                resolution["contact_id"] = contact["id"]
                resolution["resolution_type"] = "existing_company"
                resolution["confidence"] = "contact_phone"
                return resolution

        individual = await find_individual_by_phone(db, phone)
        if individual and individual.get("owner_sales_id"):
            resolution["owner_sales_id"] = individual["owner_sales_id"]
            resolution["individual_id"] = individual["id"]
            resolution["resolution_type"] = "existing_individual"
            resolution["confidence"] = "individual_phone"
            return resolution

    # --- 4. Domain match from email ---
    domain = extract_domain(email) if email else ""
    if domain:
        company = await find_company_by_domain(db, domain)
        if company and company.get("owner_sales_id"):
            resolution["owner_sales_id"] = company["owner_sales_id"]
            resolution["company_id"] = company["id"]
            resolution["resolution_type"] = "existing_company"
            resolution["confidence"] = "domain_match"
            # Auto-create contact under this company
            if email:
                await _ensure_contact_under_company(db, email, contact_name, phone, company["id"], created_by)
            return resolution

    # --- 5. Strong normalized company-name match ---
    if company_name:
        company = await find_company_by_name(db, company_name)
        if company and company.get("owner_sales_id"):
            resolution["owner_sales_id"] = company["owner_sales_id"]
            resolution["company_id"] = company["id"]
            resolution["resolution_type"] = "existing_company"
            resolution["confidence"] = "name_match"
            # Auto-create contact under this company
            if email:
                await _ensure_contact_under_company(db, email, contact_name, phone, company["id"], created_by)
            return resolution

    # --- 6. No match → auto-assign new owner ---
    # Determine if this is a company or individual
    is_corporate = bool(company_name and normalize_company_name(company_name))

    # Auto-assign using the existing assignment engine
    from services.sales_assignment_service import assign_sales_owner
    assignment = await assign_sales_owner(db, email=email, company_name=company_name)
    new_owner_id = assignment.get("assigned_sales_id", "")

    if is_corporate:
        # Create new company
        new_company = await create_company(
            db,
            name=company_name,
            domain=domain,
            owner_sales_id=new_owner_id,
            created_by=created_by,
        )
        resolution["company_id"] = new_company["id"]
        resolution["resolution_type"] = "new_company"
        # Create contact under company
        if email or contact_name:
            contact = await create_contact(
                db,
                name=contact_name or "",
                email=email or "",
                phone=phone or "",
                company_id=new_company["id"],
                created_by=created_by,
            )
            resolution["contact_id"] = contact["id"]
    else:
        # Create new individual client
        new_individual = await create_individual(
            db,
            name=contact_name or "",
            email=email or "",
            phone=phone or "",
            owner_sales_id=new_owner_id,
            created_by=created_by,
        )
        resolution["individual_id"] = new_individual["id"]
        resolution["resolution_type"] = "new_individual"

    resolution["owner_sales_id"] = new_owner_id
    resolution["confidence"] = "auto_assigned"

    # Log the routing decision
    await db.ownership_routing_log.insert_one({
        "email": email,
        "phone": phone,
        "company_name": company_name,
        "resolution": resolution,
        "created_at": now,
    })

    return resolution


async def _ensure_contact_under_company(db, email, name, phone, company_id, created_by):
    """Ensure a contact record exists under the given company. Prevents duplicates."""
    existing = await find_contact_by_email(db, email)
    if existing:
        # Already exists — if not linked to this company, update
        if existing.get("company_id") != company_id:
            await db.contacts.update_one(
                {"id": existing["id"]},
                {"$set": {"company_id": company_id, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
        return existing
    # Create new contact
    return await create_contact(
        db,
        name=name or "",
        email=email,
        phone=phone or "",
        company_id=company_id,
        created_by=created_by,
    )
