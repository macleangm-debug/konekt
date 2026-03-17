"""
Pre-Launch Operational Pack Tests
Tests for:
- Commission Rules Engine (CRUD, validation)
- Dual Promotion Engine (preview-uplift, preview-discount)
- Supervisor Dashboard (team-summary, leaderboard)
- Staff Alerts (list, summary)
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Headers with admin token."""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


# ================== Commission Rules Engine Tests ==================

class TestCommissionRulesCRUD:
    """Test Commission Rules CRUD operations"""
    
    created_rule_id = None
    
    def test_list_commission_rules(self, auth_headers):
        """Test listing all commission rules."""
        response = requests.get(f"{BASE_URL}/api/admin/commission-rules", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Listed {len(data)} commission rules")
    
    def test_create_commission_rule(self, auth_headers):
        """Test creating a commission rule with valid percentages."""
        payload = {
            "name": "TEST_Printing_Services_TZ",
            "scope_type": "service_group",
            "scope_value": "Printing",
            "country_code": "TZ",
            "protected_margin_percent": 40,
            "sales_percent": 20,
            "affiliate_percent": 15,
            "promo_percent": 15,
            "buffer_percent": 10,
            "is_active": True
        }
        response = requests.post(f"{BASE_URL}/api/admin/commission-rules", 
                                json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["name"] == "TEST_Printing_Services_TZ"
        assert data["scope_type"] == "service_group"
        assert data["protected_margin_percent"] == 40
        assert data["sales_percent"] == 20
        assert data["affiliate_percent"] == 15
        assert data["promo_percent"] == 15
        assert data["buffer_percent"] == 10
        TestCommissionRulesCRUD.created_rule_id = data["id"]
        print(f"Created rule with ID: {data['id']}")
    
    def test_get_commission_rule(self, auth_headers):
        """Test getting a single commission rule by ID."""
        if not TestCommissionRulesCRUD.created_rule_id:
            pytest.skip("No rule created to get")
        
        rule_id = TestCommissionRulesCRUD.created_rule_id
        response = requests.get(f"{BASE_URL}/api/admin/commission-rules/{rule_id}", 
                               headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == rule_id
        assert data["name"] == "TEST_Printing_Services_TZ"
        print(f"Retrieved rule: {data['name']}")
    
    def test_update_commission_rule(self, auth_headers):
        """Test updating a commission rule."""
        if not TestCommissionRulesCRUD.created_rule_id:
            pytest.skip("No rule created to update")
        
        rule_id = TestCommissionRulesCRUD.created_rule_id
        payload = {
            "name": "TEST_Printing_Services_TZ_Updated",
            "protected_margin_percent": 45,
            "sales_percent": 18,
            "affiliate_percent": 12,
            "promo_percent": 15,
            "buffer_percent": 10
        }
        response = requests.put(f"{BASE_URL}/api/admin/commission-rules/{rule_id}", 
                               json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Printing_Services_TZ_Updated"
        assert data["protected_margin_percent"] == 45
        print(f"Updated rule: {data['name']}")
        
        # Verify update persisted
        get_response = requests.get(f"{BASE_URL}/api/admin/commission-rules/{rule_id}", 
                                   headers=auth_headers)
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["name"] == "TEST_Printing_Services_TZ_Updated"


class TestCommissionRulesValidation:
    """Test Commission Rules validation logic"""
    
    def test_create_rule_exceeds_100_percent(self, auth_headers):
        """Test that total percentage cannot exceed 100%."""
        payload = {
            "name": "TEST_Invalid_Rule",
            "scope_type": "default",
            "protected_margin_percent": 50,
            "sales_percent": 30,
            "affiliate_percent": 25,  # Total = 120%
            "promo_percent": 10,
            "buffer_percent": 5,
            "is_active": True
        }
        response = requests.post(f"{BASE_URL}/api/admin/commission-rules", 
                                json=payload, headers=auth_headers)
        assert response.status_code == 400
        data = response.json()
        assert "exceed" in data.get("detail", "").lower() or "100" in data.get("detail", "")
        print(f"Validation rejected rule with 120%: {data.get('detail')}")
    
    def test_create_rule_exactly_100_percent(self, auth_headers):
        """Test that exactly 100% is accepted."""
        payload = {
            "name": "TEST_Exact_100_Rule",
            "scope_type": "default",
            "protected_margin_percent": 50,
            "sales_percent": 20,
            "affiliate_percent": 15,
            "promo_percent": 10,
            "buffer_percent": 5,
            "is_active": True
        }
        response = requests.post(f"{BASE_URL}/api/admin/commission-rules", 
                                json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"Created rule with exactly 100%: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/commission-rules/{data['id']}", 
                       headers=auth_headers)


class TestCommissionRulesCleanup:
    """Cleanup test data"""
    
    def test_delete_commission_rule(self, auth_headers):
        """Test deleting a commission rule."""
        if not TestCommissionRulesCRUD.created_rule_id:
            pytest.skip("No rule created to delete")
        
        rule_id = TestCommissionRulesCRUD.created_rule_id
        response = requests.delete(f"{BASE_URL}/api/admin/commission-rules/{rule_id}", 
                                  headers=auth_headers)
        assert response.status_code == 200
        print(f"Deleted rule: {rule_id}")
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/admin/commission-rules/{rule_id}", 
                                   headers=auth_headers)
        assert get_response.status_code == 404


# ================== Dual Promotion Engine Tests ==================

class TestCampaignPricingPreview:
    """Test Campaign Pricing preview endpoints"""
    
    def test_preview_uplift_pricing(self, auth_headers):
        """Test display uplift pricing calculation."""
        payload = {
            "selling_price": 10000,
            "uplift_percent": 15
        }
        response = requests.post(f"{BASE_URL}/api/campaign-pricing/preview-uplift", 
                                json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify calculation
        assert data["selling_price"] == 10000
        assert data["compare_price"] == 11500  # 10000 + 15%
        assert data["discount_display_percent"] == 15
        assert data["discount_amount"] == 1500
        assert data["promotion_effect"] == "display_only"
        print(f"Uplift pricing: compare={data['compare_price']}, sell={data['selling_price']}")
    
    def test_preview_uplift_small_uplift(self, auth_headers):
        """Test uplift with small percentage (2%)."""
        payload = {
            "selling_price": 5000,
            "uplift_percent": 2
        }
        response = requests.post(f"{BASE_URL}/api/campaign-pricing/preview-uplift", 
                                json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["selling_price"] == 5000
        assert data["compare_price"] == 5100  # 5000 + 2%
        assert data["discount_amount"] == 100
        print(f"Small uplift (2%): compare={data['compare_price']}")
    
    def test_preview_discount_pricing(self, auth_headers):
        """Test margin discount pricing calculation."""
        payload = {
            "selling_price": 10000,
            "discount_percent": 10
        }
        response = requests.post(f"{BASE_URL}/api/campaign-pricing/preview-discount", 
                                json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify calculation
        assert data["compare_price"] == 10000  # Original price
        assert data["selling_price"] == 9000   # 10000 - 10%
        assert data["discount_amount"] == 1000
        assert data["discount_display_percent"] == 10
        assert data["promotion_effect"] == "real_discount"
        print(f"Discount pricing: compare={data['compare_price']}, sell={data['selling_price']}")
    
    def test_preview_discount_small_discount(self, auth_headers):
        """Test discount with small percentage (2%)."""
        payload = {
            "selling_price": 8000,
            "discount_percent": 2
        }
        response = requests.post(f"{BASE_URL}/api/campaign-pricing/preview-discount", 
                                json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["selling_price"] == 7840  # 8000 - 2%
        assert data["compare_price"] == 8000
        assert data["discount_amount"] == 160
        print(f"Small discount (2%): sell={data['selling_price']}")


# ================== Supervisor Dashboard Tests ==================

class TestSupervisorDashboard:
    """Test Supervisor Dashboard endpoints"""
    
    def test_get_team_summary(self, auth_headers):
        """Test team summary endpoint."""
        response = requests.get(f"{BASE_URL}/api/supervisor/team-summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should return array (may be empty if no staff)
        assert isinstance(data, list)
        
        if len(data) > 0:
            member = data[0]
            assert "staff_id" in member
            assert "name" in member
            assert "role" in member
            assert "score" in member
            assert "completed" in member
            assert "active" in member
            assert "delayed" in member
            assert "issues" in member
        
        print(f"Team summary: {len(data)} members")
    
    def test_get_team_summary_by_role_sales(self, auth_headers):
        """Test team summary filtered by sales role."""
        response = requests.get(f"{BASE_URL}/api/supervisor/team-summary/sales", 
                               headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All members should be sales
        for member in data:
            assert member.get("role") == "sales"
        
        print(f"Sales team: {len(data)} members")
    
    def test_get_team_summary_by_role_operations(self, auth_headers):
        """Test team summary filtered by operations role."""
        response = requests.get(f"{BASE_URL}/api/supervisor/team-summary/operations", 
                               headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All members should be operations
        for member in data:
            assert member.get("role") == "operations"
        
        print(f"Operations team: {len(data)} members")
    
    def test_get_leaderboard(self, auth_headers):
        """Test leaderboard endpoint (top 10)."""
        response = requests.get(f"{BASE_URL}/api/supervisor/leaderboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) <= 10  # Max 10 entries
        
        if len(data) > 0:
            leader = data[0]
            assert "staff_id" in leader
            assert "name" in leader
            assert "role" in leader
            assert "score" in leader
            assert "completed" in leader
        
        print(f"Leaderboard: {len(data)} top performers")


# ================== Staff Alerts Tests ==================

class TestStaffAlerts:
    """Test Staff Alerts endpoints"""
    
    def test_list_staff_alerts(self, auth_headers):
        """Test listing staff alerts."""
        response = requests.get(f"{BASE_URL}/api/admin/staff-alerts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should return array
        assert isinstance(data, list)
        
        if len(data) > 0:
            alert = data[0]
            assert "staff_id" in alert
            assert "name" in alert
            assert "type" in alert
            assert "severity" in alert
            assert "message" in alert
        
        print(f"Staff alerts: {len(data)} alerts")
    
    def test_get_alerts_summary(self, auth_headers):
        """Test alerts summary endpoint."""
        response = requests.get(f"{BASE_URL}/api/admin/staff-alerts/summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "staff_with_delays" in data
        assert "staff_with_issues" in data
        assert "staff_inactive" in data
        assert "total_alerts" in data
        
        # Values should be integers
        assert isinstance(data["staff_with_delays"], int)
        assert isinstance(data["staff_with_issues"], int)
        assert isinstance(data["staff_inactive"], int)
        assert isinstance(data["total_alerts"], int)
        
        print(f"Alerts summary: delays={data['staff_with_delays']}, "
              f"issues={data['staff_with_issues']}, inactive={data['staff_inactive']}")


# ================== Integration Tests ==================

class TestIntegration:
    """Integration tests for the Pre-Launch Pack"""
    
    def test_commission_rules_full_workflow(self, auth_headers):
        """Test full workflow: create -> update -> get -> delete."""
        # Create
        create_payload = {
            "name": "TEST_Integration_Rule",
            "scope_type": "product_group",
            "scope_value": "Electronics",
            "country_code": "KE",
            "protected_margin_percent": 35,
            "sales_percent": 25,
            "affiliate_percent": 15,
            "promo_percent": 15,
            "buffer_percent": 10,
            "is_active": True
        }
        create_res = requests.post(f"{BASE_URL}/api/admin/commission-rules", 
                                  json=create_payload, headers=auth_headers)
        assert create_res.status_code == 200
        rule_id = create_res.json()["id"]
        
        # Update
        update_payload = {"name": "TEST_Integration_Rule_Updated", "is_active": False}
        update_res = requests.put(f"{BASE_URL}/api/admin/commission-rules/{rule_id}", 
                                 json=update_payload, headers=auth_headers)
        assert update_res.status_code == 200
        
        # Get to verify
        get_res = requests.get(f"{BASE_URL}/api/admin/commission-rules/{rule_id}", 
                              headers=auth_headers)
        assert get_res.status_code == 200
        data = get_res.json()
        assert data["name"] == "TEST_Integration_Rule_Updated"
        assert data["is_active"] == False
        
        # Delete
        delete_res = requests.delete(f"{BASE_URL}/api/admin/commission-rules/{rule_id}", 
                                    headers=auth_headers)
        assert delete_res.status_code == 200
        
        # Verify deleted
        verify_res = requests.get(f"{BASE_URL}/api/admin/commission-rules/{rule_id}", 
                                 headers=auth_headers)
        assert verify_res.status_code == 404
        
        print("Full commission rules workflow completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
