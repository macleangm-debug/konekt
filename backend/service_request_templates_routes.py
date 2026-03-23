from fastapi import APIRouter

router = APIRouter(prefix="/api/service-request-templates", tags=["Service Request Templates"])

@router.get("")
async def list_service_request_templates():
    return [
        {
            "service_key": "garment-printing",
            "service_name": "Garment Printing",
            "fields": [
                {"key": "garment_type", "label": "Garment Type", "type": "text", "placeholder": "T-Shirt, Hoodie, Jersey"},
                {"key": "quantity", "label": "Quantity", "type": "number", "placeholder": "100"},
                {"key": "print_locations", "label": "Print Locations", "type": "text", "placeholder": "Front, Back, Sleeve"},
                {"key": "timeline", "label": "Timeline", "type": "text", "placeholder": "Needed in 7 days"},
                {"key": "notes", "label": "Extra Notes", "type": "textarea", "placeholder": "Any special finishing or packaging notes"},
            ],
        },
        {
            "service_key": "office-branding",
            "service_name": "Office Branding",
            "fields": [
                {"key": "site_location", "label": "Site Location", "type": "text", "placeholder": "Masaki, Dar es Salaam"},
                {"key": "areas_to_brand", "label": "Areas to Brand", "type": "text", "placeholder": "Reception, Meeting Room, Signage"},
                {"key": "timeline", "label": "Timeline", "type": "text", "placeholder": "Needed this month"},
                {"key": "notes", "label": "Extra Notes", "type": "textarea", "placeholder": "Brand colors, dimensions, installation requirements"},
            ],
        },
        {
            "service_key": "general",
            "service_name": "General Service Request",
            "fields": [
                {"key": "need", "label": "What do you need?", "type": "text", "placeholder": "Describe the service you need"},
                {"key": "timeline", "label": "Timeline", "type": "text", "placeholder": "When do you need it?"},
                {"key": "notes", "label": "Extra Notes", "type": "textarea", "placeholder": "Anything else we should know"},
            ],
        },
    ]
