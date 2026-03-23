from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/service-catalog", tags=["Service Catalog"])

@router.get("/tree")
async def service_catalog_tree(request: Request):
    db = request.app.mongodb
    rows = await db.services.find({"status": {"$ne": "archived"}}).to_list(length=2000)

    groups = {}
    for row in rows:
        group_id = row.get("group_id") or row.get("service_group_id") or row.get("group") or "general"
        group_name = row.get("group_name") or row.get("service_group_name") or row.get("group") or "General"
        service_id = str(row.get("_id")) if row.get("_id") else row.get("id") or row.get("slug") or row.get("name")
        service_name = row.get("name") or row.get("title") or "Unnamed Service"

        if group_id not in groups:
            groups[group_id] = {"id": group_id, "name": group_name, "children": []}

        groups[group_id]["children"].append({
            "id": service_id,
            "name": service_name,
            "children": [
                {"id": sub.get("id") or sub.get("slug") or sub.get("name"), "name": sub.get("name")}
                for sub in (row.get("subservices") or row.get("sub_services") or [])
            ],
        })

    return list(groups.values())
