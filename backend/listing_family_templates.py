"""
Listing Family Templates
Dynamic field definitions for product and service families
"""

PRODUCT_FAMILY_TEMPLATES = {
    "promotional": {
        "label": "Promotional Products",
        "description": "Branded merchandise and corporate gifts",
        "fields": [
            {"name": "colors", "label": "Available Colors", "type": "list"},
            {"name": "sizes", "label": "Available Sizes", "type": "list"},
            {"name": "branding_methods", "label": "Branding Methods", "type": "list", "options": ["embroidery", "screen_print", "laser_engraving", "heat_transfer", "digital_print"]},
            {"name": "moq", "label": "Minimum Order Quantity", "type": "number"},
            {"name": "printable_area", "label": "Printable Area (cm)", "type": "string"},
            {"name": "setup_fee", "label": "Setup Fee", "type": "number"},
            {"name": "sample_available", "label": "Sample Available", "type": "boolean"},
        ],
    },
    "office_equipment": {
        "label": "Office Equipment",
        "description": "Printers, projectors, and office machinery",
        "fields": [
            {"name": "model", "label": "Model Number", "type": "string"},
            {"name": "technical_specs", "label": "Technical Specifications", "type": "text"},
            {"name": "warranty_months", "label": "Warranty (Months)", "type": "number"},
            {"name": "power_requirements", "label": "Power Requirements", "type": "string"},
            {"name": "included_accessories", "label": "Included Accessories", "type": "list"},
            {"name": "service_support", "label": "Service Support Available", "type": "boolean"},
            {"name": "spare_availability", "label": "Spare Parts Available", "type": "boolean"},
        ],
    },
    "stationery": {
        "label": "Stationery",
        "description": "Office supplies and paper products",
        "fields": [
            {"name": "unit_pack", "label": "Units per Pack", "type": "number"},
            {"name": "paper_size", "label": "Paper Size", "type": "string"},
            {"name": "material", "label": "Material", "type": "string"},
            {"name": "moq", "label": "Minimum Order Quantity", "type": "number"},
            {"name": "gsm", "label": "Paper Weight (GSM)", "type": "number"},
        ],
    },
    "consumables": {
        "label": "Consumables",
        "description": "Ink, toner, and replacement supplies",
        "fields": [
            {"name": "compatible_models", "label": "Compatible Models", "type": "list"},
            {"name": "page_yield", "label": "Page Yield", "type": "number"},
            {"name": "color", "label": "Color", "type": "string"},
            {"name": "shelf_life_months", "label": "Shelf Life (Months)", "type": "number"},
        ],
    },
    "spare_parts": {
        "label": "Spare Parts",
        "description": "Replacement parts and components",
        "fields": [
            {"name": "part_number", "label": "Part Number", "type": "string"},
            {"name": "compatible_equipment", "label": "Compatible Equipment", "type": "list"},
            {"name": "installation_required", "label": "Professional Installation Required", "type": "boolean"},
            {"name": "warranty_months", "label": "Warranty (Months)", "type": "number"},
        ],
    },
}

SERVICE_FAMILY_TEMPLATES = {
    "printing": {
        "label": "Printing Services",
        "description": "Commercial printing and production",
        "fields": [
            {"name": "sizes", "label": "Available Sizes", "type": "list"},
            {"name": "materials", "label": "Paper/Material Options", "type": "list"},
            {"name": "finishes", "label": "Finish Options", "type": "list", "options": ["matte", "gloss", "satin", "laminated"]},
            {"name": "minimum_order_qty", "label": "Minimum Order Quantity", "type": "number"},
            {"name": "requires_artwork", "label": "Requires Artwork", "type": "boolean"},
            {"name": "turnaround_days", "label": "Turnaround Time (Days)", "type": "number"},
            {"name": "proofing_included", "label": "Proofing Included", "type": "boolean"},
        ],
    },
    "creative": {
        "label": "Creative Services",
        "description": "Design, copywriting, and creative work",
        "fields": [
            {"name": "revision_count", "label": "Number of Revisions", "type": "number"},
            {"name": "turnaround_days", "label": "Turnaround Time (Days)", "type": "number"},
            {"name": "source_files_included", "label": "Source Files Included", "type": "boolean"},
            {"name": "copywriting_available", "label": "Copywriting Available", "type": "boolean"},
            {"name": "deliverables", "label": "Deliverables", "type": "list"},
            {"name": "briefing_required", "label": "Briefing Required", "type": "boolean"},
        ],
    },
    "maintenance": {
        "label": "Maintenance Services",
        "description": "Equipment repair and maintenance",
        "fields": [
            {"name": "equipment_types_supported", "label": "Equipment Types Supported", "type": "list"},
            {"name": "onsite_supported", "label": "On-site Service Available", "type": "boolean"},
            {"name": "response_sla_hours", "label": "Response SLA (Hours)", "type": "number"},
            {"name": "contract_supported", "label": "Service Contract Available", "type": "boolean"},
            {"name": "regions_covered", "label": "Regions Covered", "type": "list"},
            {"name": "inspection_fee", "label": "Inspection Fee", "type": "number"},
        ],
    },
    "branding": {
        "label": "Branding Services",
        "description": "Logo application and branding work",
        "fields": [
            {"name": "branding_methods", "label": "Branding Methods", "type": "list"},
            {"name": "turnaround_days", "label": "Turnaround Time (Days)", "type": "number"},
            {"name": "setup_fee", "label": "Setup Fee", "type": "number"},
            {"name": "moq", "label": "Minimum Order Quantity", "type": "number"},
            {"name": "artwork_format", "label": "Required Artwork Format", "type": "list"},
        ],
    },
    "installation": {
        "label": "Installation Services",
        "description": "Equipment setup and installation",
        "fields": [
            {"name": "equipment_types", "label": "Equipment Types", "type": "list"},
            {"name": "includes_training", "label": "Includes Training", "type": "boolean"},
            {"name": "warranty_days", "label": "Installation Warranty (Days)", "type": "number"},
            {"name": "regions_covered", "label": "Regions Covered", "type": "list"},
            {"name": "scheduling_required", "label": "Advance Scheduling Required", "type": "boolean"},
        ],
    },
}


def get_product_family_template(family: str) -> dict:
    """Get template for a product family"""
    return PRODUCT_FAMILY_TEMPLATES.get(family, {})


def get_service_family_template(family: str) -> dict:
    """Get template for a service family"""
    return SERVICE_FAMILY_TEMPLATES.get(family, {})


def get_all_product_families() -> list:
    """Get list of all product families"""
    return [{"key": k, **v} for k, v in PRODUCT_FAMILY_TEMPLATES.items()]


def get_all_service_families() -> list:
    """Get list of all service families"""
    return [{"key": k, **v} for k, v in SERVICE_FAMILY_TEMPLATES.items()]
