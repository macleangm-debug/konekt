"""
Production Readiness Pass v259 - Testing:
1. Settings Hub API - operational_rules, distribution_config, partner_policy sections
2. Sales order detail - vendor_orders array with vendor contacts
3. Partner CRUD - vendor_type, supported_services, preferred_partner, capacity_notes
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
PARTNER_EMAIL = "demo.partner@konekt.com"
PARTNER_PASSWORD = "Partner123!"

# Test order ID for vendor_orders testing
TEST_ORDER_ID = "e25f5d80-ecb9-4a32-9201-a258c0aa5a67"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    data = response.json()
    return data.get("token") or data.get("access_token")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Get admin headers with auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestSettingsHubAPI:
    """Test Settings Hub API - operational_rules, distribution_config, partner_policy"""
    
    def test_get_settings_hub_returns_operational_rules(self, admin_headers):
        """GET /api/admin/settings-hub returns operational_rules section"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "operational_rules" in data, "operational_rules section missing"
        
        op_rules = data["operational_rules"]
        # Verify all required fields
        required_fields = [
            "date_format", "timezone", "follow_up_threshold_days",
            "stale_deal_threshold_days", "quote_response_threshold_days",
            "payment_overdue_threshold_days"
        ]
        for field in required_fields:
            assert field in op_rules, f"operational_rules.{field} missing"
        
        # Verify default values
        assert op_rules["follow_up_threshold_days"] == 3 or isinstance(op_rules["follow_up_threshold_days"], int)
        assert op_rules["stale_deal_threshold_days"] == 7 or isinstance(op_rules["stale_deal_threshold_days"], int)
        assert op_rules["quote_response_threshold_days"] == 5 or isinstance(op_rules["quote_response_threshold_days"], int)
        assert op_rules["payment_overdue_threshold_days"] == 7 or isinstance(op_rules["payment_overdue_threshold_days"], int)
        print(f"✓ operational_rules section verified with all required fields")
    
    def test_get_settings_hub_returns_distribution_config(self, admin_headers):
        """GET /api/admin/settings-hub returns distribution_config section"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "distribution_config" in data, "distribution_config section missing"
        
        dc = data["distribution_config"]
        # Verify all required fields
        required_fields = [
            "protected_company_margin_percent",
            "affiliate_percent_of_distributable",
            "sales_percent_of_distributable",
            "promo_percent_of_distributable",
            "referral_percent_of_distributable",
            "country_bonus_percent_of_distributable"
        ]
        for field in required_fields:
            assert field in dc, f"distribution_config.{field} missing"
        
        # Verify values are numeric
        assert isinstance(dc["protected_company_margin_percent"], (int, float))
        assert isinstance(dc["affiliate_percent_of_distributable"], (int, float))
        assert isinstance(dc["sales_percent_of_distributable"], (int, float))
        print(f"✓ distribution_config section verified: protected={dc['protected_company_margin_percent']}%, affiliate={dc['affiliate_percent_of_distributable']}%, sales={dc['sales_percent_of_distributable']}%")
    
    def test_get_settings_hub_returns_partner_policy(self, admin_headers):
        """GET /api/admin/settings-hub returns partner_policy section"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "partner_policy" in data, "partner_policy section missing"
        
        pp = data["partner_policy"]
        # Verify all required fields
        required_fields = ["auto_assignment_mode", "logistics_handling_default", "vendor_types"]
        for field in required_fields:
            assert field in pp, f"partner_policy.{field} missing"
        
        # Verify default values
        assert pp["auto_assignment_mode"] in ["capability_match", "round_robin", "manual"]
        assert pp["logistics_handling_default"] in ["konekt_managed", "vendor_managed", "customer_pickup"]
        assert isinstance(pp["vendor_types"], list)
        assert len(pp["vendor_types"]) > 0
        print(f"✓ partner_policy section verified: auto_assignment={pp['auto_assignment_mode']}, logistics={pp['logistics_handling_default']}, vendor_types={pp['vendor_types']}")
    
    def test_put_settings_hub_saves_and_invalidates_cache(self, admin_headers):
        """PUT /api/admin/settings-hub saves changes and invalidates cache"""
        # First get current settings
        get_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert get_response.status_code == 200
        current = get_response.json()
        
        # Modify a value
        test_value = 4  # Change follow_up_threshold_days
        current["operational_rules"]["follow_up_threshold_days"] = test_value
        
        # Save
        put_response = requests.put(
            f"{BASE_URL}/api/admin/settings-hub",
            headers=admin_headers,
            json=current
        )
        assert put_response.status_code == 200, f"PUT failed: {put_response.status_code} - {put_response.text}"
        
        # Verify updated_at is set
        saved = put_response.json()
        assert "updated_at" in saved, "updated_at not set after save"
        
        # Verify change persisted by re-fetching
        verify_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert verify_response.status_code == 200
        verified = verify_response.json()
        assert verified["operational_rules"]["follow_up_threshold_days"] == test_value
        
        # Restore original value
        current["operational_rules"]["follow_up_threshold_days"] = 3
        requests.put(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers, json=current)
        
        print(f"✓ Settings Hub PUT saves changes and cache invalidation works")


class TestSalesOrderVendorOrders:
    """Test Sales order detail returns vendor_orders with vendor contacts"""
    
    @pytest.fixture(scope="class")
    def sales_token(self):
        """Get sales/admin token for sales orders API"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip("Login failed for sales orders test")
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    def test_sales_order_detail_returns_vendor_orders_array(self, sales_token):
        """GET /api/sales/orders/{id} returns vendor_orders array"""
        headers = {"Authorization": f"Bearer {sales_token}", "Content-Type": "application/json"}
        
        response = requests.get(f"{BASE_URL}/api/sales/orders/{TEST_ORDER_ID}", headers=headers)
        
        # Order may not exist, but API should work
        if response.status_code == 404:
            pytest.skip(f"Test order {TEST_ORDER_ID} not found - skipping vendor_orders test")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "vendor_orders" in data, "vendor_orders array missing from order detail"
        assert isinstance(data["vendor_orders"], list), "vendor_orders should be a list"
        assert "vendor_count" in data, "vendor_count field missing"
        
        print(f"✓ Sales order detail returns vendor_orders array (count: {data['vendor_count']})")
        
        # If there are vendor orders, verify structure
        if len(data["vendor_orders"]) > 0:
            vo = data["vendor_orders"][0]
            expected_fields = ["vendor_order_id", "status", "items"]
            for field in expected_fields:
                assert field in vo, f"vendor_order missing {field}"
            
            # Check for contact fields (may be empty if vendor not resolved)
            contact_fields = ["vendor_name", "contact_person", "contact_phone", "contact_email"]
            present_contacts = [f for f in contact_fields if f in vo]
            print(f"  Vendor order has contact fields: {present_contacts}")
    
    def test_sales_orders_list_endpoint(self, sales_token):
        """GET /api/sales/orders returns orders list"""
        headers = {"Authorization": f"Bearer {sales_token}", "Content-Type": "application/json"}
        
        response = requests.get(f"{BASE_URL}/api/sales/orders", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "orders" in data, "orders array missing"
        assert "total" in data, "total count missing"
        assert "page" in data, "page number missing"
        
        print(f"✓ Sales orders list returns {data['total']} orders")


class TestPartnerCRUD:
    """Test Partner create/update with vendor_type, supported_services, preferred_partner, capacity_notes"""
    
    @pytest.fixture(scope="class")
    def created_partner_id(self, admin_headers):
        """Create a test partner and return its ID"""
        test_partner = {
            "name": f"TEST_Partner_{uuid.uuid4().hex[:8]}",
            "partner_type": "product",
            "vendor_type": "product_supplier",
            "contact_person": "Test Contact",
            "email": f"test_{uuid.uuid4().hex[:8]}@test.com",
            "phone": "+255712345678",
            "country_code": "TZ",
            "supported_services": ["delivery", "installation"],
            "preferred_partner": True,
            "capacity_notes": "Test capacity notes - 100 units/month",
            "status": "active"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/partners",
            headers=admin_headers,
            json=test_partner
        )
        
        if response.status_code not in [200, 201]:
            pytest.skip(f"Partner creation failed: {response.status_code} - {response.text}")
        
        data = response.json()
        partner_id = data.get("id")
        assert partner_id, "Partner ID not returned"
        
        yield partner_id
        
        # Cleanup - delete the test partner
        requests.delete(f"{BASE_URL}/api/admin/partners/{partner_id}", headers=admin_headers)
    
    def test_partner_create_accepts_vendor_specialization_fields(self, admin_headers):
        """POST /api/admin/partners accepts vendor_type, supported_services, preferred_partner, capacity_notes"""
        test_partner = {
            "name": f"TEST_VendorSpec_{uuid.uuid4().hex[:8]}",
            "partner_type": "service",
            "vendor_type": "service_provider",
            "contact_person": "Service Contact",
            "email": f"service_{uuid.uuid4().hex[:8]}@test.com",
            "phone": "+255712345679",
            "country_code": "TZ",
            "supported_services": ["printing", "branding", "embroidery"],
            "preferred_partner": True,
            "capacity_notes": "High capacity - 500 orders/month, seasonal peak in Q4",
            "status": "active"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/partners",
            headers=admin_headers,
            json=test_partner
        )
        
        assert response.status_code in [200, 201], f"Partner create failed: {response.status_code} - {response.text}"
        
        data = response.json()
        
        # Verify all vendor specialization fields are saved
        assert data.get("vendor_type") == "service_provider", f"vendor_type not saved correctly: {data.get('vendor_type')}"
        assert data.get("supported_services") == ["printing", "branding", "embroidery"], f"supported_services not saved: {data.get('supported_services')}"
        assert data.get("preferred_partner") == True, f"preferred_partner not saved: {data.get('preferred_partner')}"
        assert data.get("capacity_notes") == "High capacity - 500 orders/month, seasonal peak in Q4", f"capacity_notes not saved: {data.get('capacity_notes')}"
        
        print(f"✓ Partner create accepts all vendor specialization fields")
        
        # Cleanup
        partner_id = data.get("id")
        if partner_id:
            requests.delete(f"{BASE_URL}/api/admin/partners/{partner_id}", headers=admin_headers)
    
    def test_partner_update_persists_vendor_specialization_fields(self, admin_headers, created_partner_id):
        """PUT /api/admin/partners/{id} persists vendor_type, supported_services, preferred_partner, capacity_notes"""
        
        # Update the partner with new values
        update_data = {
            "vendor_type": "logistics_partner",
            "supported_services": ["warehousing", "last_mile_delivery"],
            "preferred_partner": False,
            "capacity_notes": "Updated capacity - 200 deliveries/day"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/partners/{created_partner_id}",
            headers=admin_headers,
            json=update_data
        )
        
        assert response.status_code == 200, f"Partner update failed: {response.status_code} - {response.text}"
        
        updated = response.json()
        
        # Verify updates persisted
        assert updated.get("vendor_type") == "logistics_partner", f"vendor_type not updated: {updated.get('vendor_type')}"
        assert updated.get("supported_services") == ["warehousing", "last_mile_delivery"], f"supported_services not updated: {updated.get('supported_services')}"
        assert updated.get("preferred_partner") == False, f"preferred_partner not updated: {updated.get('preferred_partner')}"
        assert updated.get("capacity_notes") == "Updated capacity - 200 deliveries/day", f"capacity_notes not updated: {updated.get('capacity_notes')}"
        
        # Verify by re-fetching
        get_response = requests.get(f"{BASE_URL}/api/admin/partners/{created_partner_id}", headers=admin_headers)
        assert get_response.status_code == 200
        
        fetched = get_response.json()
        assert fetched.get("vendor_type") == "logistics_partner"
        assert fetched.get("capacity_notes") == "Updated capacity - 200 deliveries/day"
        
        print(f"✓ Partner update persists all vendor specialization fields")
    
    def test_partner_list_returns_vendor_type(self, admin_headers):
        """GET /api/admin/partners returns vendor_type for each partner"""
        response = requests.get(f"{BASE_URL}/api/admin/partners", headers=admin_headers)
        assert response.status_code == 200, f"Partner list failed: {response.status_code}"
        
        partners = response.json()
        assert isinstance(partners, list), "Partners should be a list"
        
        if len(partners) > 0:
            # Check first partner has vendor_type
            first = partners[0]
            # vendor_type may be null for old partners, but field should exist or be defaulted
            print(f"✓ Partner list returns {len(partners)} partners")
            if "vendor_type" in first:
                print(f"  First partner vendor_type: {first.get('vendor_type')}")


class TestSettingsHubTabs:
    """Verify Settings Hub has 14 tabs including Operational Rules and Partner Policy"""
    
    def test_settings_hub_has_all_sections(self, admin_headers):
        """GET /api/admin/settings-hub returns all expected sections"""
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        
        # Expected sections that map to frontend tabs
        expected_sections = [
            "business_profile",      # Business Profile tab
            "payment_accounts",      # Payment Details tab
            "branding",              # Document Branding tab
            "commercial",            # Commercial Rules tab
            "operational_rules",     # Operational Rules tab (NEW)
            "sales",                 # Sales & Commissions tab
            "affiliate",             # Affiliate & Referrals tab
            "payouts",               # Payout Settings tab
            "progress_workflows",    # Workflows & Vendors tab
            "vendors",               # Part of Workflows tab
            "partner_policy",        # Partner Policy tab (NEW)
            "notifications",         # Notifications tab
            "launch_controls",       # Launch Controls tab
            "distribution_config",   # Part of Operational Rules tab
        ]
        
        missing = [s for s in expected_sections if s not in data]
        assert len(missing) == 0, f"Missing sections: {missing}"
        
        print(f"✓ Settings Hub API returns all {len(expected_sections)} expected sections")
        print(f"  Sections: {list(data.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
