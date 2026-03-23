"""
Smart Partner Ecosystem API Tests
Tests for unified partner management with type-aware logic (Service/Product/Hybrid)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSmartPartnerEcosystemAPI:
    """Tests for Smart Partner Ecosystem CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_partner_ids = []
        yield
        # Cleanup: Delete test partners
        for partner_id in self.created_partner_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/admin/partners-smart/{partner_id}")
            except:
                pass
    
    # ==================== GET /api/admin/partners-smart ====================
    def test_list_partners_returns_200(self):
        """GET /api/admin/partners-smart - Lists all partners"""
        response = self.session.get(f"{BASE_URL}/api/admin/partners-smart")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ List partners returned {len(data)} partners")
    
    def test_list_partners_with_type_filter(self):
        """GET /api/admin/partners-smart?partner_type=service - Filter by type"""
        response = self.session.get(f"{BASE_URL}/api/admin/partners-smart?partner_type=service")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # All returned partners should be service type
        for partner in data:
            assert partner.get("partner_type") == "service", f"Expected service type, got {partner.get('partner_type')}"
        print(f"✓ Filter by type=service returned {len(data)} partners")
    
    def test_list_partners_with_status_filter(self):
        """GET /api/admin/partners-smart?status=active - Filter by status"""
        response = self.session.get(f"{BASE_URL}/api/admin/partners-smart?status=active")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        for partner in data:
            assert partner.get("status") == "active"
        print(f"✓ Filter by status=active returned {len(data)} partners")
    
    # ==================== GET /api/admin/partners-smart/stats/summary ====================
    def test_get_stats_summary_returns_200(self):
        """GET /api/admin/partners-smart/stats/summary - Returns partner type counts"""
        response = self.session.get(f"{BASE_URL}/api/admin/partners-smart/stats/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_partners" in data, "Response should have total_partners"
        assert "active_partners" in data, "Response should have active_partners"
        assert "by_type" in data, "Response should have by_type"
        assert "service" in data["by_type"], "by_type should have service count"
        assert "product" in data["by_type"], "by_type should have product count"
        assert "hybrid" in data["by_type"], "by_type should have hybrid count"
        
        print(f"✓ Stats summary: total={data['total_partners']}, active={data['active_partners']}, by_type={data['by_type']}")
    
    # ==================== POST /api/admin/partners-smart ====================
    def test_create_service_partner(self):
        """POST /api/admin/partners-smart - Creates service partner with type-aware fields"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "name": f"TEST_Service Partner {unique_id}",
            "email": f"test_service_{unique_id}@example.com",
            "partner_type": "service",
            "country_code": "TZ",
            "regions": ["Dar es Salaam"],
            "specific_services": ["Garment Printing", "T-Shirt Printing"],
            "contact_phone": "+255123456789",
            "lead_time_days": 5,
            "settlement_terms": "net_30",
            "notes": "Test service partner"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/partners-smart", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "partner" in data, "Response should have partner object"
        partner = data["partner"]
        
        # Verify type-specific flags for service partner
        assert partner["partner_type"] == "service"
        assert partner["quote_based"] == True, "Service partner should be quote_based"
        assert partner["has_catalog"] == False, "Service partner should not have catalog"
        assert partner["has_inventory"] == False, "Service partner should not have inventory"
        assert partner["specific_services"] == ["Garment Printing", "T-Shirt Printing"]
        
        self.created_partner_ids.append(partner["id"])
        print(f"✓ Created service partner: {partner['name']} (id={partner['id']})")
        
        # Verify persistence with GET
        get_response = self.session.get(f"{BASE_URL}/api/admin/partners-smart/{partner['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["name"] == payload["name"]
        assert fetched["partner_type"] == "service"
        print(f"✓ Verified service partner persisted correctly")
    
    def test_create_product_partner(self):
        """POST /api/admin/partners-smart - Creates product partner with inventory flags"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "name": f"TEST_Product Partner {unique_id}",
            "email": f"test_product_{unique_id}@example.com",
            "partner_type": "product",
            "country_code": "KE",
            "regions": ["Nairobi"],
            "specific_services": [],
            "lead_time_days": 3,
            "settlement_terms": "net_14"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/partners-smart", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        partner = data["partner"]
        
        # Verify type-specific flags for product partner
        assert partner["partner_type"] == "product"
        assert partner["has_catalog"] == True, "Product partner should have catalog"
        assert partner["has_inventory"] == True, "Product partner should have inventory"
        assert partner["quote_based"] == False, "Product partner should not be quote_based"
        
        self.created_partner_ids.append(partner["id"])
        print(f"✓ Created product partner: {partner['name']} with catalog/inventory flags")
    
    def test_create_hybrid_partner(self):
        """POST /api/admin/partners-smart - Creates hybrid partner with all flags"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "name": f"TEST_Hybrid Partner {unique_id}",
            "email": f"test_hybrid_{unique_id}@example.com",
            "partner_type": "hybrid",
            "country_code": "UG",
            "regions": ["Kampala"],
            "specific_services": ["Custom Printing", "Embroidery"],
            "lead_time_days": 7,
            "settlement_terms": "net_60"
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/partners-smart", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        partner = data["partner"]
        
        # Verify type-specific flags for hybrid partner
        assert partner["partner_type"] == "hybrid"
        assert partner["has_catalog"] == True, "Hybrid partner should have catalog"
        assert partner["has_inventory"] == True, "Hybrid partner should have inventory"
        assert partner["quote_based"] == True, "Hybrid partner should be quote_based"
        
        self.created_partner_ids.append(partner["id"])
        print(f"✓ Created hybrid partner: {partner['name']} with all flags enabled")
    
    def test_create_partner_missing_required_fields(self):
        """POST /api/admin/partners-smart - Validates required fields"""
        payload = {
            "name": "Test Partner"
            # Missing email and partner_type
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/partners-smart", json=payload)
        assert response.status_code == 422, f"Expected 422 for validation error, got {response.status_code}"
        print(f"✓ Validation error returned for missing required fields")
    
    # ==================== PUT /api/admin/partners-smart/{id}/status ====================
    def test_update_partner_status(self):
        """PUT /api/admin/partners-smart/{id}/status - Updates partner status"""
        # First create a partner
        unique_id = str(uuid.uuid4())[:8]
        create_payload = {
            "name": f"TEST_Status Update Partner {unique_id}",
            "email": f"test_status_{unique_id}@example.com",
            "partner_type": "service"
        }
        create_response = self.session.post(f"{BASE_URL}/api/admin/partners-smart", json=create_payload)
        assert create_response.status_code == 200
        partner_id = create_response.json()["partner"]["id"]
        self.created_partner_ids.append(partner_id)
        
        # Update status to paused
        status_response = self.session.put(
            f"{BASE_URL}/api/admin/partners-smart/{partner_id}/status",
            json={"status": "paused"}
        )
        assert status_response.status_code == 200, f"Expected 200, got {status_response.status_code}"
        assert "paused" in status_response.json()["message"]
        
        # Verify status persisted
        get_response = self.session.get(f"{BASE_URL}/api/admin/partners-smart/{partner_id}")
        assert get_response.status_code == 200
        assert get_response.json()["status"] == "paused"
        print(f"✓ Partner status updated to paused and verified")
        
        # Update status to suspended
        status_response = self.session.put(
            f"{BASE_URL}/api/admin/partners-smart/{partner_id}/status",
            json={"status": "suspended"}
        )
        assert status_response.status_code == 200
        
        # Verify
        get_response = self.session.get(f"{BASE_URL}/api/admin/partners-smart/{partner_id}")
        assert get_response.json()["status"] == "suspended"
        print(f"✓ Partner status updated to suspended and verified")
    
    def test_update_partner_status_invalid(self):
        """PUT /api/admin/partners-smart/{id}/status - Rejects invalid status"""
        # First create a partner
        unique_id = str(uuid.uuid4())[:8]
        create_payload = {
            "name": f"TEST_Invalid Status Partner {unique_id}",
            "email": f"test_invalid_{unique_id}@example.com",
            "partner_type": "service"
        }
        create_response = self.session.post(f"{BASE_URL}/api/admin/partners-smart", json=create_payload)
        partner_id = create_response.json()["partner"]["id"]
        self.created_partner_ids.append(partner_id)
        
        # Try invalid status
        status_response = self.session.put(
            f"{BASE_URL}/api/admin/partners-smart/{partner_id}/status",
            json={"status": "invalid_status"}
        )
        assert status_response.status_code == 400, f"Expected 400 for invalid status, got {status_response.status_code}"
        print(f"✓ Invalid status rejected with 400")
    
    # ==================== PUT /api/admin/partners-smart/{id}/services ====================
    def test_update_partner_services(self):
        """PUT /api/admin/partners-smart/{id}/services - Updates specific services"""
        # First create a service partner
        unique_id = str(uuid.uuid4())[:8]
        create_payload = {
            "name": f"TEST_Services Update Partner {unique_id}",
            "email": f"test_services_{unique_id}@example.com",
            "partner_type": "service",
            "specific_services": ["Initial Service"]
        }
        create_response = self.session.post(f"{BASE_URL}/api/admin/partners-smart", json=create_payload)
        assert create_response.status_code == 200
        partner_id = create_response.json()["partner"]["id"]
        self.created_partner_ids.append(partner_id)
        
        # Update services
        new_services = ["Garment Printing", "Embroidery", "Screen Printing"]
        services_response = self.session.put(
            f"{BASE_URL}/api/admin/partners-smart/{partner_id}/services",
            json={"services": new_services}
        )
        assert services_response.status_code == 200, f"Expected 200, got {services_response.status_code}"
        assert services_response.json()["services"] == new_services
        
        # Verify services persisted
        get_response = self.session.get(f"{BASE_URL}/api/admin/partners-smart/{partner_id}")
        assert get_response.status_code == 200
        assert get_response.json()["specific_services"] == new_services
        print(f"✓ Partner services updated and verified: {new_services}")
    
    # ==================== GET /api/admin/partners-smart/{id} ====================
    def test_get_single_partner(self):
        """GET /api/admin/partners-smart/{id} - Returns partner with stats"""
        # First create a partner
        unique_id = str(uuid.uuid4())[:8]
        create_payload = {
            "name": f"TEST_Single Get Partner {unique_id}",
            "email": f"test_single_{unique_id}@example.com",
            "partner_type": "service",
            "specific_services": ["Test Service"]
        }
        create_response = self.session.post(f"{BASE_URL}/api/admin/partners-smart", json=create_payload)
        partner_id = create_response.json()["partner"]["id"]
        self.created_partner_ids.append(partner_id)
        
        # Get single partner
        get_response = self.session.get(f"{BASE_URL}/api/admin/partners-smart/{partner_id}")
        assert get_response.status_code == 200
        
        partner = get_response.json()
        assert partner["id"] == partner_id
        assert partner["name"] == create_payload["name"]
        assert "stats" in partner, "Single partner should include stats"
        assert "total_jobs" in partner["stats"]
        assert "completed_jobs" in partner["stats"]
        assert "completion_rate" in partner["stats"]
        print(f"✓ Single partner retrieved with stats: {partner['stats']}")
    
    def test_get_partner_not_found(self):
        """GET /api/admin/partners-smart/{id} - Returns 404 for non-existent partner"""
        response = self.session.get(f"{BASE_URL}/api/admin/partners-smart/000000000000000000000000")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Non-existent partner returns 404")
    
    def test_get_partner_invalid_id(self):
        """GET /api/admin/partners-smart/{id} - Returns 400 for invalid ID format"""
        response = self.session.get(f"{BASE_URL}/api/admin/partners-smart/invalid-id")
        assert response.status_code == 400, f"Expected 400 for invalid ID, got {response.status_code}"
        print(f"✓ Invalid partner ID returns 400")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
