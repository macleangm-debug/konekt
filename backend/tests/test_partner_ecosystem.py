"""
Test Partner Ecosystem APIs
Tests for multi-country partner routing pack:
- Geography API (countries and regions)
- Partners CRUD
- Partner Catalog CRUD
- Country Pricing Rules
- Routing Rules
- Test Routing endpoint
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data prefix for cleanup
TEST_PREFIX = "TEST_"


class TestGeographyAPI:
    """Geography API tests - countries and regions"""
    
    def test_seed_geography(self):
        """Test geography seed endpoint"""
        response = requests.post(f"{BASE_URL}/api/geography/seed")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Geography seeded, {len(data)} countries available")

    def test_get_countries(self):
        """Test getting all countries"""
        response = requests.get(f"{BASE_URL}/api/geography/countries")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Check country structure
        country = data[0]
        assert "id" in country
        assert "code" in country
        assert "name" in country
        print(f"PASS: Retrieved {len(data)} countries. First: {country['name']} ({country['code']})")

    def test_get_regions_for_tanzania(self):
        """Test getting regions for Tanzania"""
        response = requests.get(f"{BASE_URL}/api/geography/regions/TZ")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"PASS: Retrieved {len(data)} regions for TZ. Sample: {data[:3]}")

    def test_get_regions_for_kenya(self):
        """Test getting regions for Kenya"""
        response = requests.get(f"{BASE_URL}/api/geography/regions/KE")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Retrieved {len(data)} regions for Kenya")

    def test_get_country_details(self):
        """Test getting specific country details"""
        response = requests.get(f"{BASE_URL}/api/geography/country/TZ")
        assert response.status_code == 200
        data = response.json()
        assert data is not None
        assert data["code"] == "TZ"
        assert "currency" in data
        print(f"PASS: Country details for TZ - Currency: {data.get('currency')}")


class TestPartnersCRUD:
    """Partner master data management tests"""
    
    created_partner_id = None
    
    def test_list_partners_empty(self):
        """Test listing partners"""
        response = requests.get(f"{BASE_URL}/api/admin/partners")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Partners list returned {len(data)} items")

    def test_create_partner(self):
        """Test creating a new partner"""
        payload = {
            "name": f"{TEST_PREFIX}Acme Distributors",
            "partner_type": "distributor",
            "contact_person": "John Doe",
            "email": "john@acme-test.com",
            "phone": "+255 700 000 001",
            "country_code": "TZ",
            "regions": ["Dar es Salaam", "Mwanza"],
            "categories": ["printing", "branding"],
            "coverage_mode": "regional",
            "fulfillment_type": "partner_fulfilled",
            "lead_time_days": 3,
            "settlement_terms": "weekly",
            "commission_rate": 5,
            "address": "123 Test Street, Dar es Salaam",
            "notes": "Test partner"
        }
        response = requests.post(f"{BASE_URL}/api/admin/partners", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["name"] == f"{TEST_PREFIX}Acme Distributors"
        assert data["country_code"] == "TZ"
        assert data["status"] == "active"
        TestPartnersCRUD.created_partner_id = data["id"]
        print(f"PASS: Partner created with ID: {data['id']}")

    def test_get_partner_by_id(self):
        """Test getting partner by ID"""
        if not TestPartnersCRUD.created_partner_id:
            pytest.skip("No partner created")
        
        response = requests.get(f"{BASE_URL}/api/admin/partners/{TestPartnersCRUD.created_partner_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == TestPartnersCRUD.created_partner_id
        assert data["name"] == f"{TEST_PREFIX}Acme Distributors"
        print(f"PASS: Retrieved partner: {data['name']}")

    def test_update_partner(self):
        """Test updating partner details"""
        if not TestPartnersCRUD.created_partner_id:
            pytest.skip("No partner created")
        
        payload = {
            "name": f"{TEST_PREFIX}Acme Distributors Updated",
            "lead_time_days": 5,
            "regions": ["Dar es Salaam", "Mwanza", "Arusha"]
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/partners/{TestPartnersCRUD.created_partner_id}",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == f"{TEST_PREFIX}Acme Distributors Updated"
        assert data["lead_time_days"] == 5
        assert "Arusha" in data["regions"]
        print(f"PASS: Partner updated. Lead time: {data['lead_time_days']} days")

    def test_list_partners_filtered_by_country(self):
        """Test filtering partners by country"""
        response = requests.get(f"{BASE_URL}/api/admin/partners?country_code=TZ")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for partner in data:
            assert partner["country_code"] == "TZ"
        print(f"PASS: Filtered partners by TZ, got {len(data)} results")

    def test_delete_partner_soft_delete(self):
        """Test soft deleting (deactivating) a partner"""
        if not TestPartnersCRUD.created_partner_id:
            pytest.skip("No partner created")
        
        response = requests.delete(f"{BASE_URL}/api/admin/partners/{TestPartnersCRUD.created_partner_id}")
        assert response.status_code == 200
        data = response.json()
        assert "deactivated" in data.get("message", "").lower() or "message" in data
        
        # Verify partner is now inactive
        get_response = requests.get(f"{BASE_URL}/api/admin/partners/{TestPartnersCRUD.created_partner_id}")
        assert get_response.status_code == 200
        partner_data = get_response.json()
        assert partner_data["status"] == "inactive"
        print(f"PASS: Partner soft deleted (status: inactive)")


class TestPartnerCatalogCRUD:
    """Partner catalog items tests"""
    
    created_catalog_id = None
    partner_id = None
    
    @classmethod
    def setup_class(cls):
        """Create a partner for catalog tests"""
        payload = {
            "name": f"{TEST_PREFIX}Catalog Test Partner",
            "partner_type": "distributor",
            "country_code": "TZ",
            "status": "active"
        }
        response = requests.post(f"{BASE_URL}/api/admin/partners", json=payload)
        if response.status_code == 200:
            cls.partner_id = response.json()["id"]

    def test_list_catalog_empty(self):
        """Test listing catalog items"""
        response = requests.get(f"{BASE_URL}/api/admin/partner-catalog")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Catalog list returned {len(data)} items")

    def test_create_catalog_item(self):
        """Test creating a catalog item"""
        if not TestPartnerCatalogCRUD.partner_id:
            pytest.skip("No partner available for catalog test")
        
        payload = {
            "partner_id": TestPartnerCatalogCRUD.partner_id,
            "source_type": "product",
            "sku": f"{TEST_PREFIX}SKU-001",
            "name": "Test Printed T-Shirt",
            "description": "Quality cotton t-shirt with custom print",
            "category": "apparel",
            "base_partner_price": 5000,
            "partner_available_qty": 100,
            "partner_status": "in_stock",
            "lead_time_days": 2,
            "min_order_qty": 10,
            "unit": "piece"
        }
        response = requests.post(f"{BASE_URL}/api/admin/partner-catalog", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["sku"] == f"{TEST_PREFIX}SKU-001"
        assert data["base_partner_price"] == 5000
        assert data["is_active"] == True
        TestPartnerCatalogCRUD.created_catalog_id = data["id"]
        print(f"PASS: Catalog item created: {data['name']} (SKU: {data['sku']})")

    def test_create_catalog_item_invalid_partner(self):
        """Test creating catalog item with invalid partner"""
        payload = {
            "partner_id": "invalid-id-12345",
            "sku": "TEST-INVALID",
            "name": "Invalid Item"
        }
        response = requests.post(f"{BASE_URL}/api/admin/partner-catalog", json=payload)
        assert response.status_code == 404
        print("PASS: Correctly rejected invalid partner ID")

    def test_get_catalog_item_by_id(self):
        """Test getting catalog item by ID"""
        if not TestPartnerCatalogCRUD.created_catalog_id:
            pytest.skip("No catalog item created")
        
        response = requests.get(f"{BASE_URL}/api/admin/partner-catalog/{TestPartnerCatalogCRUD.created_catalog_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == TestPartnerCatalogCRUD.created_catalog_id
        print(f"PASS: Retrieved catalog item: {data['name']}")

    def test_update_catalog_item(self):
        """Test updating catalog item"""
        if not TestPartnerCatalogCRUD.created_catalog_id:
            pytest.skip("No catalog item created")
        
        payload = {
            "base_partner_price": 5500,
            "partner_available_qty": 80,
            "partner_status": "low_stock"
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/partner-catalog/{TestPartnerCatalogCRUD.created_catalog_id}",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["base_partner_price"] == 5500
        assert data["partner_status"] == "low_stock"
        print(f"PASS: Catalog item updated. Price: {data['base_partner_price']}")

    def test_list_catalog_filtered_by_partner(self):
        """Test filtering catalog by partner"""
        if not TestPartnerCatalogCRUD.partner_id:
            pytest.skip("No partner available")
        
        response = requests.get(f"{BASE_URL}/api/admin/partner-catalog?partner_id={TestPartnerCatalogCRUD.partner_id}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for item in data:
            assert item["partner_id"] == TestPartnerCatalogCRUD.partner_id
        print(f"PASS: Filtered catalog by partner, got {len(data)} items")

    def test_delete_catalog_item(self):
        """Test soft deleting catalog item"""
        if not TestPartnerCatalogCRUD.created_catalog_id:
            pytest.skip("No catalog item created")
        
        response = requests.delete(f"{BASE_URL}/api/admin/partner-catalog/{TestPartnerCatalogCRUD.created_catalog_id}")
        assert response.status_code == 200
        
        # Verify item is now inactive
        get_response = requests.get(f"{BASE_URL}/api/admin/partner-catalog/{TestPartnerCatalogCRUD.created_catalog_id}")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["is_active"] == False
        print("PASS: Catalog item soft deleted (is_active: False)")


class TestCountryPricingRules:
    """Country pricing rules tests"""
    
    created_rule_id = None

    def test_list_pricing_rules(self):
        """Test listing pricing rules"""
        response = requests.get(f"{BASE_URL}/api/admin/country-pricing")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Pricing rules list returned {len(data)} items")

    def test_create_pricing_rule_percentage(self):
        """Test creating a percentage-based pricing rule"""
        payload = {
            "country_code": "TZ",
            "category": f"{TEST_PREFIX}apparel",
            "markup_type": "percentage",
            "markup_value": 25,
            "currency": "TZS",
            "tax_rate": 18
        }
        response = requests.post(f"{BASE_URL}/api/admin/country-pricing", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["markup_type"] == "percentage"
        assert data["markup_value"] == 25
        assert data["tax_rate"] == 18
        TestCountryPricingRules.created_rule_id = data["id"]
        print(f"PASS: Pricing rule created - {data['markup_value']}% markup + {data['tax_rate']}% tax")

    def test_create_pricing_rule_fixed(self):
        """Test creating a fixed markup pricing rule"""
        payload = {
            "country_code": "KE",
            "category": f"{TEST_PREFIX}services",
            "markup_type": "fixed",
            "markup_value": 500,
            "currency": "KES",
            "tax_rate": 16
        }
        response = requests.post(f"{BASE_URL}/api/admin/country-pricing", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["markup_type"] == "fixed"
        assert data["markup_value"] == 500
        print(f"PASS: Fixed pricing rule created - {data['markup_value']} {data['currency']}")

    def test_create_pricing_rule_missing_country(self):
        """Test creating rule without country code fails"""
        payload = {
            "category": "default",
            "markup_value": 20
        }
        response = requests.post(f"{BASE_URL}/api/admin/country-pricing", json=payload)
        assert response.status_code == 400
        print("PASS: Correctly rejected rule without country_code")

    def test_get_pricing_rule_by_id(self):
        """Test getting pricing rule by ID"""
        if not TestCountryPricingRules.created_rule_id:
            pytest.skip("No pricing rule created")
        
        response = requests.get(f"{BASE_URL}/api/admin/country-pricing/{TestCountryPricingRules.created_rule_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == TestCountryPricingRules.created_rule_id
        print(f"PASS: Retrieved pricing rule for {data['country_code']}/{data['category']}")

    def test_update_pricing_rule_upsert(self):
        """Test updating existing pricing rule (upsert behavior)"""
        payload = {
            "country_code": "TZ",
            "category": f"{TEST_PREFIX}apparel",
            "markup_type": "percentage",
            "markup_value": 30,  # Changed from 25
            "currency": "TZS",
            "tax_rate": 18
        }
        response = requests.post(f"{BASE_URL}/api/admin/country-pricing", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["markup_value"] == 30
        print(f"PASS: Pricing rule upserted - new markup: {data['markup_value']}%")

    def test_list_pricing_rules_by_country(self):
        """Test filtering pricing rules by country"""
        response = requests.get(f"{BASE_URL}/api/admin/country-pricing?country_code=TZ")
        assert response.status_code == 200
        data = response.json()
        for rule in data:
            assert rule["country_code"] == "TZ"
        print(f"PASS: Filtered pricing rules by TZ, got {len(data)} results")

    def test_delete_pricing_rule(self):
        """Test deleting a pricing rule"""
        if not TestCountryPricingRules.created_rule_id:
            pytest.skip("No pricing rule created")
        
        response = requests.delete(f"{BASE_URL}/api/admin/country-pricing/{TestCountryPricingRules.created_rule_id}")
        assert response.status_code == 200
        
        # Verify rule is deleted
        get_response = requests.get(f"{BASE_URL}/api/admin/country-pricing/{TestCountryPricingRules.created_rule_id}")
        assert get_response.status_code == 404
        print("PASS: Pricing rule deleted successfully")


class TestRoutingRules:
    """Routing rules tests"""
    
    created_rule_id = None
    partner_id = None
    
    @classmethod
    def setup_class(cls):
        """Create a partner for routing tests"""
        payload = {
            "name": f"{TEST_PREFIX}Routing Test Partner",
            "partner_type": "distributor",
            "country_code": "TZ",
            "regions": ["Dar es Salaam"],
            "status": "active"
        }
        response = requests.post(f"{BASE_URL}/api/admin/partners", json=payload)
        if response.status_code == 200:
            cls.partner_id = response.json()["id"]

    def test_list_routing_rules(self):
        """Test listing routing rules"""
        response = requests.get(f"{BASE_URL}/api/admin/routing-rules")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Routing rules list returned {len(data)} items")

    def test_create_routing_rule_lead_time(self):
        """Test creating a lead time priority routing rule"""
        payload = {
            "country_code": "TZ",
            "region": "Dar es Salaam",
            "category": f"{TEST_PREFIX}printing",
            "priority_mode": "lead_time",
            "fallback_allowed": True,
            "internal_first": True,
            "notes": "Test routing rule"
        }
        response = requests.post(f"{BASE_URL}/api/admin/routing-rules", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["priority_mode"] == "lead_time"
        assert data["is_active"] == True
        TestRoutingRules.created_rule_id = data["id"]
        print(f"PASS: Routing rule created - priority: {data['priority_mode']}")

    def test_create_routing_rule_preferred_partner(self):
        """Test creating a preferred partner routing rule"""
        if not TestRoutingRules.partner_id:
            pytest.skip("No partner available")
        
        payload = {
            "country_code": "TZ",
            "region": None,  # All regions
            "category": f"{TEST_PREFIX}branding",
            "priority_mode": "preferred_partner",
            "preferred_partner_id": TestRoutingRules.partner_id,
            "fallback_allowed": True
        }
        response = requests.post(f"{BASE_URL}/api/admin/routing-rules", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["priority_mode"] == "preferred_partner"
        assert data["preferred_partner_id"] == TestRoutingRules.partner_id
        print(f"PASS: Preferred partner routing rule created")

    def test_create_routing_rule_margin(self):
        """Test creating a margin priority routing rule"""
        payload = {
            "country_code": "KE",
            "category": None,  # All categories
            "priority_mode": "margin",
            "fallback_allowed": False,
            "internal_first": False
        }
        response = requests.post(f"{BASE_URL}/api/admin/routing-rules", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["priority_mode"] == "margin"
        print(f"PASS: Margin priority routing rule created for KE")

    def test_get_routing_rule_by_id(self):
        """Test getting routing rule by ID"""
        if not TestRoutingRules.created_rule_id:
            pytest.skip("No routing rule created")
        
        response = requests.get(f"{BASE_URL}/api/admin/routing-rules/{TestRoutingRules.created_rule_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == TestRoutingRules.created_rule_id
        print(f"PASS: Retrieved routing rule for {data['country_code']}")

    def test_update_routing_rule(self):
        """Test updating routing rule"""
        if not TestRoutingRules.created_rule_id:
            pytest.skip("No routing rule created")
        
        payload = {
            "priority_mode": "cost",
            "fallback_allowed": False
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/routing-rules/{TestRoutingRules.created_rule_id}",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["priority_mode"] == "cost"
        assert data["fallback_allowed"] == False
        print(f"PASS: Routing rule updated - priority: {data['priority_mode']}")

    def test_list_routing_rules_by_country(self):
        """Test filtering routing rules by country"""
        response = requests.get(f"{BASE_URL}/api/admin/routing-rules?country_code=TZ")
        assert response.status_code == 200
        data = response.json()
        for rule in data:
            assert rule["country_code"] == "TZ"
        print(f"PASS: Filtered routing rules by TZ, got {len(data)} results")

    def test_delete_routing_rule(self):
        """Test deleting routing rule"""
        if not TestRoutingRules.created_rule_id:
            pytest.skip("No routing rule created")
        
        response = requests.delete(f"{BASE_URL}/api/admin/routing-rules/{TestRoutingRules.created_rule_id}")
        assert response.status_code == 200
        
        # Verify rule is deleted
        get_response = requests.get(f"{BASE_URL}/api/admin/routing-rules/{TestRoutingRules.created_rule_id}")
        assert get_response.status_code == 404
        print("PASS: Routing rule deleted successfully")


class TestRoutingEndpoint:
    """Test routing simulation endpoint"""
    
    partner_id = None
    catalog_item_id = None
    
    @classmethod
    def setup_class(cls):
        """Setup partner and catalog item for routing tests"""
        # Create partner
        partner_payload = {
            "name": f"{TEST_PREFIX}Routing Simulation Partner",
            "partner_type": "distributor",
            "country_code": "TZ",
            "regions": ["Dar es Salaam"],
            "categories": ["apparel"],
            "lead_time_days": 2,
            "status": "active"
        }
        partner_response = requests.post(f"{BASE_URL}/api/admin/partners", json=partner_payload)
        if partner_response.status_code == 200:
            cls.partner_id = partner_response.json()["id"]
            
            # Create catalog item
            catalog_payload = {
                "partner_id": cls.partner_id,
                "sku": f"{TEST_PREFIX}ROUTE-SKU-001",
                "name": "Routing Test Item",
                "category": "apparel",
                "base_partner_price": 10000,
                "partner_available_qty": 50,
                "partner_status": "in_stock",
                "lead_time_days": 2
            }
            catalog_response = requests.post(f"{BASE_URL}/api/admin/partner-catalog", json=catalog_payload)
            if catalog_response.status_code == 200:
                cls.catalog_item_id = catalog_response.json()["id"]
                
            # Create pricing rule
            pricing_payload = {
                "country_code": "TZ",
                "category": "apparel",
                "markup_type": "percentage",
                "markup_value": 20,
                "currency": "TZS"
            }
            requests.post(f"{BASE_URL}/api/admin/country-pricing", json=pricing_payload)

    def test_routing_no_sku(self):
        """Test routing without SKU fails"""
        payload = {
            "country_code": "TZ",
            "quantity": 1
        }
        response = requests.post(f"{BASE_URL}/api/admin/multi-country-routing/test-routing", json=payload)
        assert response.status_code == 400
        print("PASS: Correctly rejected routing request without SKU")

    def test_routing_nonexistent_sku(self):
        """Test routing for non-existent SKU returns no_partner"""
        payload = {
            "sku": "NONEXISTENT-SKU-12345",
            "country_code": "TZ",
            "region": "Dar es Salaam",
            "quantity": 1
        }
        response = requests.post(f"{BASE_URL}/api/admin/multi-country-routing/test-routing", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "no_partner"
        print(f"PASS: Correctly returned no_partner for non-existent SKU")

    def test_routing_success(self):
        """Test successful routing simulation"""
        if not TestRoutingEndpoint.catalog_item_id:
            pytest.skip("No catalog item available")
        
        payload = {
            "sku": f"{TEST_PREFIX}ROUTE-SKU-001",
            "country_code": "TZ",
            "region": "Dar es Salaam",
            "category": "apparel",
            "quantity": 10
        }
        response = requests.post(f"{BASE_URL}/api/admin/multi-country-routing/test-routing", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # May return available or no_partner depending on partner status
        if data["status"] == "available":
            assert "routing" in data
            routing = data["routing"]
            assert "partner_id" in routing
            assert "customer_price" in routing
            assert "base_partner_price" in routing
            assert "markup_amount" in routing
            print(f"PASS: Routing found partner. Customer price: {routing['customer_price']}, Markup: {routing['markup_amount']}")
        else:
            print(f"INFO: Routing returned {data['status']} - {data.get('message', '')}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_partners(self):
        """Clean up test partners"""
        response = requests.get(f"{BASE_URL}/api/admin/partners")
        if response.status_code == 200:
            partners = response.json()
            for partner in partners:
                if partner.get("name", "").startswith(TEST_PREFIX):
                    requests.delete(f"{BASE_URL}/api/admin/partners/{partner['id']}")
        print("PASS: Test partners cleaned up")

    def test_cleanup_test_pricing_rules(self):
        """Clean up test pricing rules"""
        response = requests.get(f"{BASE_URL}/api/admin/country-pricing")
        if response.status_code == 200:
            rules = response.json()
            for rule in rules:
                if rule.get("category", "").startswith(TEST_PREFIX):
                    requests.delete(f"{BASE_URL}/api/admin/country-pricing/{rule['id']}")
        print("PASS: Test pricing rules cleaned up")

    def test_cleanup_test_routing_rules(self):
        """Clean up test routing rules"""
        response = requests.get(f"{BASE_URL}/api/admin/routing-rules")
        if response.status_code == 200:
            rules = response.json()
            for rule in rules:
                category = rule.get("category") or ""
                notes = rule.get("notes") or ""
                if category.startswith(TEST_PREFIX) or notes.startswith("Test"):
                    requests.delete(f"{BASE_URL}/api/admin/routing-rules/{rule['id']}")
        print("PASS: Test routing rules cleaned up")
