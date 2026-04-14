"""
Test Product Upload Wizard, Catalog Config, and VendorOps Dashboard Features (v308)
Uses shared session to avoid rate limiting on login.
"""
import pytest
import requests
import os
import time
from uuid import uuid4

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"

# Shared session and token
_shared_session = None
_shared_token = None


def get_authenticated_session():
    """Get or create authenticated session (singleton pattern to avoid rate limiting)"""
    global _shared_session, _shared_token
    
    if _shared_session is not None and _shared_token is not None:
        return _shared_session
    
    _shared_session = requests.Session()
    _shared_session.headers.update({"Content-Type": "application/json"})
    
    # Login
    login_res = _shared_session.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if login_res.status_code == 429:
        pytest.skip("Rate limited - please wait and retry")
    
    assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
    _shared_token = login_res.json().get("token")
    _shared_session.headers.update({"Authorization": f"Bearer {_shared_token}"})
    
    return _shared_session


class TestCatalogConfig:
    """Test catalog configuration endpoint"""
    
    def test_catalog_config_returns_units(self):
        """GET /api/vendor-ops/catalog-config returns units array"""
        session = get_authenticated_session()
        res = session.get(f"{BASE_URL}/api/vendor-ops/catalog-config")
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        assert "units" in data, "Missing 'units' in response"
        assert isinstance(data["units"], list), "units should be a list"
        if len(data["units"]) > 0:
            unit = data["units"][0]
            assert "name" in unit, "Unit missing 'name'"
            assert "abbr" in unit, "Unit missing 'abbr'"
        print(f"PASS: catalog-config returns {len(data['units'])} units")
    
    def test_catalog_config_returns_categories(self):
        """GET /api/vendor-ops/catalog-config returns categories array"""
        session = get_authenticated_session()
        res = session.get(f"{BASE_URL}/api/vendor-ops/catalog-config")
        assert res.status_code == 200
        data = res.json()
        assert "categories" in data, "Missing 'categories' in response"
        assert isinstance(data["categories"], list), "categories should be a list"
        assert len(data["categories"]) > 0, "Should have at least one category"
        print(f"PASS: catalog-config returns {len(data['categories'])} categories")
    
    def test_catalog_config_returns_variant_types(self):
        """GET /api/vendor-ops/catalog-config returns variant_types array"""
        session = get_authenticated_session()
        res = session.get(f"{BASE_URL}/api/vendor-ops/catalog-config")
        assert res.status_code == 200
        data = res.json()
        assert "variant_types" in data, "Missing 'variant_types' in response"
        assert isinstance(data["variant_types"], list), "variant_types should be a list"
        print(f"PASS: catalog-config returns {len(data['variant_types'])} variant types")
    
    def test_catalog_config_returns_sku_config(self):
        """GET /api/vendor-ops/catalog-config returns SKU prefix and format"""
        session = get_authenticated_session()
        res = session.get(f"{BASE_URL}/api/vendor-ops/catalog-config")
        assert res.status_code == 200
        data = res.json()
        assert "sku_prefix" in data, "Missing 'sku_prefix' in response"
        assert "sku_format" in data, "Missing 'sku_format' in response"
        assert isinstance(data["sku_prefix"], str), "sku_prefix should be string"
        assert isinstance(data["sku_format"], str), "sku_format should be string"
        print(f"PASS: SKU config - prefix={data['sku_prefix']}, format={data['sku_format']}")


class TestProductWizardCRUD:
    """Test product creation via wizard flow"""
    
    created_product_ids = []
    
    @classmethod
    def teardown_class(cls):
        """Cleanup test products"""
        session = get_authenticated_session()
        for pid in cls.created_product_ids:
            try:
                session.delete(f"{BASE_URL}/api/vendor-ops/products/{pid}")
            except:
                pass
    
    def test_create_product_basic(self):
        """POST /api/vendor-ops/products creates product with basic fields"""
        session = get_authenticated_session()
        payload = {
            "name": f"TEST_Wizard_Product_{uuid4().hex[:6]}",
            "description": "Test product from wizard",
            "category": "Office Equipment",
            "brand": "TestBrand",
            "images": ["/uploads/test-image.webp"],
            "selling_price": 50000,
            "original_price": 60000,
            "vendor_cost": 40000,
            "unit_of_measurement": "Piece",
            "sku": f"TEST-SKU-{uuid4().hex[:6]}",
            "stock": 100,
            "status": "draft"
        }
        res = session.post(f"{BASE_URL}/api/vendor-ops/products", json=payload)
        assert res.status_code == 200, f"Failed to create product: {res.text}"
        data = res.json()
        assert data.get("ok") == True, "Response should have ok=True"
        assert "product" in data, "Response should have product"
        product = data["product"]
        TestProductWizardCRUD.created_product_ids.append(product["id"])
        
        assert product["name"] == payload["name"]
        assert product["category"] == payload["category"]
        assert product["selling_price"] == payload["selling_price"]
        assert product["status"] == "draft"
        print(f"PASS: Created product {product['id']}")
    
    def test_create_product_with_variants(self):
        """POST /api/vendor-ops/products creates product with variants"""
        session = get_authenticated_session()
        payload = {
            "name": f"TEST_Variant_Product_{uuid4().hex[:6]}",
            "description": "Product with variants",
            "category": "Fashion & Apparel",
            "images": ["/uploads/test-image.webp"],
            "selling_price": 25000,
            "unit_of_measurement": "Piece",
            "stock": 0,
            "variants": [
                {"attributes": {"Size": "S", "Color": "Red"}, "stock": 10, "price_override": None, "sku": ""},
                {"attributes": {"Size": "M", "Color": "Red"}, "stock": 15, "price_override": None, "sku": ""},
                {"attributes": {"Size": "L", "Color": "Blue"}, "stock": 20, "price_override": 27000, "sku": ""},
            ],
            "status": "draft"
        }
        res = session.post(f"{BASE_URL}/api/vendor-ops/products", json=payload)
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        product = data["product"]
        TestProductWizardCRUD.created_product_ids.append(product["id"])
        
        assert product["has_variants"] == True, "Product should have has_variants=True"
        assert len(product["variants"]) == 3, "Should have 3 variants"
        print(f"PASS: Created product with {len(product['variants'])} variants")
    
    def test_create_product_requires_name(self):
        """POST /api/vendor-ops/products fails without name"""
        session = get_authenticated_session()
        payload = {
            "name": "",
            "images": ["/uploads/test.webp"],
            "selling_price": 10000
        }
        res = session.post(f"{BASE_URL}/api/vendor-ops/products", json=payload)
        assert res.status_code == 400, "Should fail without name"
        print("PASS: Product creation correctly fails without name")
    
    def test_create_product_requires_images(self):
        """POST /api/vendor-ops/products fails without images"""
        session = get_authenticated_session()
        payload = {
            "name": "Test Product",
            "images": [],
            "selling_price": 10000
        }
        res = session.post(f"{BASE_URL}/api/vendor-ops/products", json=payload)
        assert res.status_code == 400, "Should fail without images"
        print("PASS: Product creation correctly fails without images")


class TestTogglePublish:
    """Test toggle publish functionality on VendorOps dashboard"""
    
    created_product_ids = []
    
    @classmethod
    def teardown_class(cls):
        session = get_authenticated_session()
        for pid in cls.created_product_ids:
            try:
                session.delete(f"{BASE_URL}/api/vendor-ops/products/{pid}")
            except:
                pass
    
    def test_toggle_draft_to_active(self):
        """PUT /api/vendor-ops/products/{id} toggles draft to active"""
        session = get_authenticated_session()
        # Create draft product
        create_res = session.post(f"{BASE_URL}/api/vendor-ops/products", json={
            "name": f"TEST_Toggle_Product_{uuid4().hex[:6]}",
            "images": ["/uploads/test.webp"],
            "selling_price": 10000,
            "status": "draft"
        })
        assert create_res.status_code == 200
        product_id = create_res.json()["product"]["id"]
        TestTogglePublish.created_product_ids.append(product_id)
        
        # Toggle to active
        update_res = session.put(f"{BASE_URL}/api/vendor-ops/products/{product_id}", json={
            "status": "active"
        })
        assert update_res.status_code == 200, f"Failed to toggle: {update_res.text}"
        
        # Verify
        get_res = session.get(f"{BASE_URL}/api/vendor-ops/products/{product_id}")
        assert get_res.status_code == 200
        product = get_res.json()["product"]
        assert product["status"] == "active", "Status should be active"
        assert product["is_active"] == True, "is_active should be True"
        print(f"PASS: Toggled product {product_id} from draft to active")
    
    def test_toggle_active_to_draft(self):
        """PUT /api/vendor-ops/products/{id} toggles active to draft"""
        session = get_authenticated_session()
        # Create active product
        create_res = session.post(f"{BASE_URL}/api/vendor-ops/products", json={
            "name": f"TEST_Toggle_Active_{uuid4().hex[:6]}",
            "images": ["/uploads/test.webp"],
            "selling_price": 10000,
            "status": "active"
        })
        assert create_res.status_code == 200
        product_id = create_res.json()["product"]["id"]
        TestTogglePublish.created_product_ids.append(product_id)
        
        # Toggle to draft
        update_res = session.put(f"{BASE_URL}/api/vendor-ops/products/{product_id}", json={
            "status": "draft"
        })
        assert update_res.status_code == 200
        
        # Verify
        get_res = session.get(f"{BASE_URL}/api/vendor-ops/products/{product_id}")
        product = get_res.json()["product"]
        assert product["status"] == "draft"
        assert product["is_active"] == False
        print(f"PASS: Toggled product {product_id} from active to draft")


class TestPriceRequestQuoteFlow:
    """Test price request quote entry and ready for sales flow"""
    
    created_request_ids = []
    
    @classmethod
    def teardown_class(cls):
        session = get_authenticated_session()
        for rid in cls.created_request_ids:
            try:
                session.delete(f"{BASE_URL}/api/vendor-ops/price-requests/{rid}")
            except:
                pass
    
    def test_create_price_request(self):
        """POST /api/vendor-ops/price-requests creates request with pending_vendor_response"""
        session = get_authenticated_session()
        payload = {
            "product_or_service": f"TEST_Custom_Service_{uuid4().hex[:6]}",
            "description": "Need pricing for custom printing",
            "requested_by": "sales@test.com",
            "requested_by_role": "sales"
        }
        res = session.post(f"{BASE_URL}/api/vendor-ops/price-requests", json=payload)
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        assert data.get("ok") == True
        pr = data["price_request"]
        TestPriceRequestQuoteFlow.created_request_ids.append(pr["id"])
        
        assert pr["status"] == "pending_vendor_response", "Initial status should be pending_vendor_response"
        assert pr["base_price"] is None, "base_price should be None initially"
        print(f"PASS: Created price request {pr['id']} with status pending_vendor_response")
    
    def test_enter_quote_transitions_to_response_received(self):
        """PUT /api/vendor-ops/price-requests/{id} with base_price transitions to response_received"""
        session = get_authenticated_session()
        # Create request
        create_res = session.post(f"{BASE_URL}/api/vendor-ops/price-requests", json={
            "product_or_service": f"TEST_Quote_Service_{uuid4().hex[:6]}",
            "requested_by": "sales@test.com"
        })
        assert create_res.status_code == 200
        request_id = create_res.json()["price_request"]["id"]
        TestPriceRequestQuoteFlow.created_request_ids.append(request_id)
        
        # Enter quote
        update_res = session.put(f"{BASE_URL}/api/vendor-ops/price-requests/{request_id}", json={
            "base_price": 75000,
            "lead_time": "3-5 days",
            "notes": "Includes delivery"
        })
        assert update_res.status_code == 200, f"Failed to enter quote: {update_res.text}"
        
        # Verify status transition
        list_res = session.get(f"{BASE_URL}/api/vendor-ops/price-requests")
        requests_list = list_res.json()["price_requests"]
        updated_req = next((r for r in requests_list if r["id"] == request_id), None)
        assert updated_req is not None
        assert updated_req["status"] == "response_received", "Status should transition to response_received"
        assert updated_req["base_price"] == 75000
        print(f"PASS: Quote entry transitions status to response_received")
    
    def test_mark_ready_for_sales(self):
        """PUT /api/vendor-ops/price-requests/{id} with status=ready_for_sales works"""
        session = get_authenticated_session()
        # Create and quote
        create_res = session.post(f"{BASE_URL}/api/vendor-ops/price-requests", json={
            "product_or_service": f"TEST_Ready_Service_{uuid4().hex[:6]}",
            "requested_by": "sales@test.com"
        })
        request_id = create_res.json()["price_request"]["id"]
        TestPriceRequestQuoteFlow.created_request_ids.append(request_id)
        
        # Enter quote first
        session.put(f"{BASE_URL}/api/vendor-ops/price-requests/{request_id}", json={
            "base_price": 50000
        })
        
        # Mark ready for sales
        ready_res = session.put(f"{BASE_URL}/api/vendor-ops/price-requests/{request_id}", json={
            "status": "ready_for_sales"
        })
        assert ready_res.status_code == 200
        
        # Verify
        list_res = session.get(f"{BASE_URL}/api/vendor-ops/price-requests")
        requests_list = list_res.json()["price_requests"]
        updated_req = next((r for r in requests_list if r["id"] == request_id), None)
        assert updated_req["status"] == "ready_for_sales"
        print(f"PASS: Mark ready for sales works correctly")


class TestSettingsHubCatalog:
    """Test Settings Hub catalog configuration endpoints"""
    
    def test_get_settings_hub_includes_catalog(self):
        """GET /api/admin/settings-hub returns catalog section"""
        session = get_authenticated_session()
        res = session.get(f"{BASE_URL}/api/admin/settings-hub")
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        settings = data.get("settings", data)
        assert "catalog" in settings, "Settings should include catalog section"
        catalog = settings["catalog"]
        assert "units_of_measurement" in catalog or "product_categories" in catalog or "variant_types" in catalog, \
            "Catalog should have units, categories, or variant_types"
        print(f"PASS: Settings Hub includes catalog section")
    
    def test_update_settings_hub_catalog(self):
        """PUT /api/admin/settings-hub can update catalog settings"""
        session = get_authenticated_session()
        # Get current settings
        get_res = session.get(f"{BASE_URL}/api/admin/settings-hub")
        current = get_res.json().get("settings", get_res.json())
        
        # Update with a test category
        test_category = f"TEST_Category_{uuid4().hex[:6]}"
        catalog = current.get("catalog", {})
        categories = catalog.get("product_categories", [])
        categories_updated = categories + [test_category]
        
        update_payload = {
            **current,
            "catalog": {
                **catalog,
                "product_categories": categories_updated
            }
        }
        
        update_res = session.put(f"{BASE_URL}/api/admin/settings-hub", json=update_payload)
        assert update_res.status_code == 200, f"Failed to update: {update_res.text}"
        
        # Verify in catalog-config
        config_res = session.get(f"{BASE_URL}/api/vendor-ops/catalog-config")
        config = config_res.json()
        assert test_category in config["categories"], "New category should appear in catalog-config"
        
        # Cleanup - remove test category
        cleanup_payload = {
            **current,
            "catalog": {
                **catalog,
                "product_categories": categories
            }
        }
        session.put(f"{BASE_URL}/api/admin/settings-hub", json=cleanup_payload)
        print(f"PASS: Settings Hub catalog update works correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
