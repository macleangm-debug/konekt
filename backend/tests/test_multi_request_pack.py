"""
Test Multi-Service + Promo Taxonomy Pack and Commission Rules Editor
Tests for Pack 3 features:
- Multi-request endpoints (service taxonomy, promo bundles, service bundles)
- Commission rules CRUD
- Affiliate management
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestServiceTaxonomy:
    """Service Taxonomy API tests"""
    
    def test_get_service_taxonomy(self):
        """GET /api/multi-request/service-taxonomy returns service groups with subgroups"""
        response = requests.get(f"{BASE_URL}/api/multi-request/service-taxonomy")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of service groups"
        
        # Check structure of groups
        if len(data) > 0:
            group = data[0]
            assert "group_key" in group, "Group should have group_key"
            assert "group_name" in group, "Group should have group_name"
            assert "subgroups" in group, "Group should have subgroups"
            assert isinstance(group["subgroups"], list), "Subgroups should be a list"
        
        print(f"✓ Service taxonomy returned {len(data)} groups")
    
    def test_upsert_service_group(self):
        """POST /api/multi-request/service-group upserts a new service group"""
        unique_key = f"test_group_{uuid.uuid4().hex[:8]}"
        payload = {
            "group_key": unique_key,
            "group_name": "Test Service Group",
            "subgroups": ["Subgroup A", "Subgroup B", "Subgroup C"]
        }
        
        response = requests.post(f"{BASE_URL}/api/multi-request/service-group", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, "Expected ok: true"
        assert "group" in data, "Expected group in response"
        assert data["group"]["group_key"] == unique_key
        assert data["group"]["group_name"] == "Test Service Group"
        assert len(data["group"]["subgroups"]) == 3
        
        print(f"✓ Created service group: {unique_key}")
        
        # Cleanup - delete the test group
        requests.delete(f"{BASE_URL}/api/multi-request/service-group/{unique_key}")
    
    def test_upsert_service_group_missing_key(self):
        """POST /api/multi-request/service-group rejects missing group_key"""
        payload = {
            "group_name": "Test Group Without Key"
        }
        
        response = requests.post(f"{BASE_URL}/api/multi-request/service-group", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Correctly rejected missing group_key")
    
    def test_delete_service_group(self):
        """DELETE /api/multi-request/service-group/{key} deletes a group"""
        # First create a group to delete
        unique_key = f"test_delete_{uuid.uuid4().hex[:8]}"
        create_payload = {
            "group_key": unique_key,
            "group_name": "Group To Delete",
            "subgroups": []
        }
        requests.post(f"{BASE_URL}/api/multi-request/service-group", json=create_payload)
        
        # Now delete it
        response = requests.delete(f"{BASE_URL}/api/multi-request/service-group/{unique_key}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        
        print(f"✓ Deleted service group: {unique_key}")
    
    def test_delete_nonexistent_group(self):
        """DELETE /api/multi-request/service-group/{key} returns 404 for nonexistent group"""
        response = requests.delete(f"{BASE_URL}/api/multi-request/service-group/nonexistent_group_xyz")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Correctly returned 404 for nonexistent group")


class TestPromoBundles:
    """Promo Bundle API tests"""
    
    def test_create_promo_bundle(self):
        """POST /api/multi-request/promo-bundle creates a multi-item promo lead"""
        payload = {
            "customer_id": "test-customer-123",
            "items": [
                {"item_name": "Branded Pen", "selected_color": "Blue", "quantity": 100},
                {"item_name": "T-Shirt", "selected_size": "L", "quantity": 50}
            ],
            "customization_brief": "Logo on all items, company colors"
        }
        
        response = requests.post(f"{BASE_URL}/api/multi-request/promo-bundle", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        assert "lead" in data
        lead = data["lead"]
        assert lead["type"] == "promotional_bundle_request"
        assert lead["status"] == "new"
        assert len(lead["items"]) == 2
        assert lead["customer_id"] == "test-customer-123"
        
        print(f"✓ Created promo bundle lead: {lead['id']}")
    
    def test_create_promo_bundle_missing_items(self):
        """POST /api/multi-request/promo-bundle rejects missing items"""
        payload = {
            "customer_id": "test-customer-123"
        }
        
        response = requests.post(f"{BASE_URL}/api/multi-request/promo-bundle", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Correctly rejected missing items")
    
    def test_create_promo_bundle_missing_customer(self):
        """POST /api/multi-request/promo-bundle rejects missing customer_id"""
        payload = {
            "items": [{"item_name": "Pen", "quantity": 10}]
        }
        
        response = requests.post(f"{BASE_URL}/api/multi-request/promo-bundle", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Correctly rejected missing customer_id")


class TestServiceBundles:
    """Service Bundle API tests"""
    
    def test_create_service_bundle(self):
        """POST /api/multi-request/service-bundle creates a multi-service lead"""
        payload = {
            "customer_id": "test-customer-456",
            "services": [
                {"group_key": "photo_video", "group_name": "Photography & Videography", "subgroup": "Product Photography"},
                {"group_key": "design", "group_name": "Design Services", "subgroup": "Logo Design"}
            ],
            "brief": "Need photos and logo for new product launch"
        }
        
        response = requests.post(f"{BASE_URL}/api/multi-request/service-bundle", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        assert "lead" in data
        lead = data["lead"]
        assert lead["type"] == "service_bundle_request"
        assert lead["status"] == "new"
        assert len(lead["services"]) == 2
        assert lead["customer_id"] == "test-customer-456"
        
        print(f"✓ Created service bundle lead: {lead['id']}")
    
    def test_create_service_bundle_missing_services(self):
        """POST /api/multi-request/service-bundle rejects missing services"""
        payload = {
            "customer_id": "test-customer-456"
        }
        
        response = requests.post(f"{BASE_URL}/api/multi-request/service-bundle", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Correctly rejected missing services")


class TestCommissionRules:
    """Commission Rules API tests"""
    
    def test_get_commission_rules(self):
        """GET /api/referral-commission/rules returns commission rules"""
        response = requests.get(f"{BASE_URL}/api/referral-commission/rules")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "affiliate_commission_percent" in data
        assert "sales_commission_percent" in data
        assert "minimum_payout_threshold" in data
        assert "allow_affiliate_and_sales_same_order" in data
        
        print(f"✓ Commission rules: affiliate={data['affiliate_commission_percent']}%, sales={data['sales_commission_percent']}%")
    
    def test_update_commission_rules(self):
        """PUT /api/referral-commission/rules saves updated rules"""
        # First get current rules
        get_response = requests.get(f"{BASE_URL}/api/referral-commission/rules")
        original_rules = get_response.json()
        
        # Update rules
        new_rules = {
            "affiliate_commission_percent": 7,
            "sales_commission_percent": 4,
            "minimum_payout_threshold": 75000,
            "allow_affiliate_and_sales_same_order": False
        }
        
        response = requests.put(f"{BASE_URL}/api/referral-commission/rules", json=new_rules)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        assert data["rules"]["affiliate_commission_percent"] == 7
        assert data["rules"]["sales_commission_percent"] == 4
        
        # Verify persistence
        verify_response = requests.get(f"{BASE_URL}/api/referral-commission/rules")
        verify_data = verify_response.json()
        assert verify_data["affiliate_commission_percent"] == 7
        
        # Restore original rules
        requests.put(f"{BASE_URL}/api/referral-commission/rules", json=original_rules)
        
        print("✓ Commission rules updated and verified")


class TestAffiliateManagement:
    """Affiliate Management API tests"""
    
    def test_create_affiliate(self):
        """POST /api/referral-commission/affiliate/create creates an affiliate"""
        unique_code = f"TEST{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "name": "Test Affiliate",
            "email": "test@affiliate.com",
            "phone": "+255123456789",
            "promo_code": unique_code
        }
        
        response = requests.post(f"{BASE_URL}/api/referral-commission/affiliate/create", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        assert "affiliate" in data
        affiliate = data["affiliate"]
        assert affiliate["promo_code"] == unique_code
        assert affiliate["name"] == "Test Affiliate"
        assert affiliate["status"] == "active"
        
        print(f"✓ Created affiliate: {unique_code}")
    
    def test_create_affiliate_duplicate_code(self):
        """POST /api/referral-commission/affiliate/create rejects duplicate promo codes"""
        unique_code = f"DUP{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "name": "First Affiliate",
            "promo_code": unique_code
        }
        
        # Create first affiliate
        requests.post(f"{BASE_URL}/api/referral-commission/affiliate/create", json=payload)
        
        # Try to create duplicate
        response = requests.post(f"{BASE_URL}/api/referral-commission/affiliate/create", json=payload)
        assert response.status_code == 409, f"Expected 409, got {response.status_code}"
        
        print("✓ Correctly rejected duplicate promo code")
    
    def test_create_affiliate_missing_code(self):
        """POST /api/referral-commission/affiliate/create rejects missing promo_code"""
        payload = {
            "name": "Affiliate Without Code"
        }
        
        response = requests.post(f"{BASE_URL}/api/referral-commission/affiliate/create", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        print("✓ Correctly rejected missing promo_code")
    
    def test_get_admin_affiliates(self):
        """GET /api/referral-commission/admin/affiliates returns affiliate list"""
        response = requests.get(f"{BASE_URL}/api/referral-commission/admin/affiliates")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of affiliates"
        
        if len(data) > 0:
            affiliate = data[0]
            assert "id" in affiliate
            assert "name" in affiliate
            assert "promo_code" in affiliate
            assert "status" in affiliate
            assert "clicks" in affiliate
            assert "leads" in affiliate
            assert "approved_sales" in affiliate
            assert "unpaid_commission" in affiliate
        
        print(f"✓ Admin affiliates returned {len(data)} affiliates")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
