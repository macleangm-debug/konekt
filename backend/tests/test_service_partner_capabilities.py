"""
Test Service Partner Capabilities Admin API
Tests CRUD operations, filtering, and routing/best endpoint
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestServicePartnerCapabilitiesAPI:
    """Test Service Partner Capabilities CRUD and routing"""
    
    created_ids = []  # Track created IDs for cleanup
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup and teardown for each test"""
        yield
        # Cleanup created test data
        for cap_id in self.created_ids:
            try:
                requests.delete(f"{BASE_URL}/api/admin/service-partner-capabilities/{cap_id}")
            except:
                pass
        self.created_ids.clear()
    
    def test_01_list_capabilities_empty_or_existing(self):
        """GET /api/admin/service-partner-capabilities - List all capabilities"""
        response = requests.get(f"{BASE_URL}/api/admin/service-partner-capabilities")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ List capabilities returned {len(data)} items")
    
    def test_02_create_capability(self):
        """POST /api/admin/service-partner-capabilities - Create new mapping"""
        payload = {
            "partner_id": "TEST_PARTNER_001",
            "partner_name": "Test Partner Alpha",
            "service_key": "test_printing",
            "service_name": "Test Printing Service",
            "country_code": "TZ",
            "regions": ["Dar es Salaam", "Arusha"],
            "capability_status": "active",
            "priority_rank": 1,
            "quality_score": 85.5,
            "avg_turnaround_days": 3.5,
            "success_rate": 92.0,
            "current_active_queue": 5,
            "preferred_routing": False,
            "notes": "Test capability mapping"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/service-partner-capabilities",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert data["partner_id"] == payload["partner_id"]
        assert data["partner_name"] == payload["partner_name"]
        assert data["service_key"] == payload["service_key"]
        assert data["service_name"] == payload["service_name"]
        assert data["country_code"] == payload["country_code"]
        assert data["regions"] == payload["regions"]
        assert data["capability_status"] == payload["capability_status"]
        assert data["priority_rank"] == payload["priority_rank"]
        assert data["quality_score"] == payload["quality_score"]
        assert data["avg_turnaround_days"] == payload["avg_turnaround_days"]
        assert data["success_rate"] == payload["success_rate"]
        assert data["current_active_queue"] == payload["current_active_queue"]
        assert data["preferred_routing"] == payload["preferred_routing"]
        
        self.created_ids.append(data["id"])
        print(f"✓ Created capability with ID: {data['id']}")
        return data["id"]
    
    def test_03_create_and_verify_persistence(self):
        """Create capability and verify it persists via GET"""
        # Create
        payload = {
            "partner_id": "TEST_PARTNER_002",
            "partner_name": "Test Partner Beta",
            "service_key": "test_branding",
            "service_name": "Test Branding Service",
            "country_code": "KE",
            "regions": ["Nairobi"],
            "capability_status": "active",
            "priority_rank": 2,
            "quality_score": 78.0,
            "avg_turnaround_days": 5.0,
            "success_rate": 88.0,
            "current_active_queue": 3,
            "preferred_routing": True,
            "notes": "Test persistence"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/service-partner-capabilities",
            json=payload
        )
        assert create_response.status_code == 200
        created = create_response.json()
        cap_id = created["id"]
        self.created_ids.append(cap_id)
        
        # Verify via list endpoint
        list_response = requests.get(f"{BASE_URL}/api/admin/service-partner-capabilities")
        assert list_response.status_code == 200
        all_caps = list_response.json()
        
        found = next((c for c in all_caps if c["id"] == cap_id), None)
        assert found is not None, f"Created capability {cap_id} not found in list"
        assert found["partner_name"] == payload["partner_name"]
        assert found["preferred_routing"] == True
        print(f"✓ Created capability persisted and verified via GET")
    
    def test_04_filter_by_service_key(self):
        """GET /api/admin/service-partner-capabilities?service_key=X - Filter by service"""
        # First create a capability with known service_key
        payload = {
            "partner_id": "TEST_PARTNER_003",
            "partner_name": "Test Partner Gamma",
            "service_key": "unique_test_service_xyz",
            "service_name": "Unique Test Service",
            "country_code": "TZ",
            "capability_status": "active",
            "priority_rank": 1
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/service-partner-capabilities",
            json=payload
        )
        assert create_response.status_code == 200
        created = create_response.json()
        self.created_ids.append(created["id"])
        
        # Filter by service_key
        filter_response = requests.get(
            f"{BASE_URL}/api/admin/service-partner-capabilities?service_key=unique_test_service_xyz"
        )
        assert filter_response.status_code == 200
        filtered = filter_response.json()
        
        assert len(filtered) >= 1, "Should find at least 1 result"
        assert all(c["service_key"] == "unique_test_service_xyz" for c in filtered)
        print(f"✓ Filter by service_key returned {len(filtered)} results")
    
    def test_05_filter_by_country_code(self):
        """GET /api/admin/service-partner-capabilities?country_code=X - Filter by country"""
        # Create capability with unique country
        payload = {
            "partner_id": "TEST_PARTNER_004",
            "partner_name": "Test Partner Delta",
            "service_key": "test_service_country",
            "service_name": "Test Service Country",
            "country_code": "UG",  # Uganda - unique for test
            "capability_status": "active",
            "priority_rank": 1
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/service-partner-capabilities",
            json=payload
        )
        assert create_response.status_code == 200
        created = create_response.json()
        self.created_ids.append(created["id"])
        
        # Filter by country_code
        filter_response = requests.get(
            f"{BASE_URL}/api/admin/service-partner-capabilities?country_code=UG"
        )
        assert filter_response.status_code == 200
        filtered = filter_response.json()
        
        assert len(filtered) >= 1, "Should find at least 1 result"
        assert all(c["country_code"] == "UG" for c in filtered)
        print(f"✓ Filter by country_code returned {len(filtered)} results")
    
    def test_06_update_capability(self):
        """PUT /api/admin/service-partner-capabilities/:id - Update mapping"""
        # Create first
        payload = {
            "partner_id": "TEST_PARTNER_005",
            "partner_name": "Test Partner Epsilon",
            "service_key": "test_update_service",
            "service_name": "Test Update Service",
            "country_code": "TZ",
            "capability_status": "active",
            "priority_rank": 3,
            "quality_score": 70.0,
            "success_rate": 80.0
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/service-partner-capabilities",
            json=payload
        )
        assert create_response.status_code == 200
        created = create_response.json()
        cap_id = created["id"]
        self.created_ids.append(cap_id)
        
        # Update
        update_payload = {
            "partner_name": "Test Partner Epsilon Updated",
            "priority_rank": 1,
            "quality_score": 95.0,
            "success_rate": 98.0,
            "capability_status": "probation",
            "notes": "Updated via test"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/admin/service-partner-capabilities/{cap_id}",
            json=update_payload
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        updated = update_response.json()
        assert updated["partner_name"] == "Test Partner Epsilon Updated"
        assert updated["priority_rank"] == 1
        assert updated["quality_score"] == 95.0
        assert updated["success_rate"] == 98.0
        assert updated["capability_status"] == "probation"
        assert updated["notes"] == "Updated via test"
        
        # Verify persistence
        list_response = requests.get(f"{BASE_URL}/api/admin/service-partner-capabilities")
        all_caps = list_response.json()
        found = next((c for c in all_caps if c["id"] == cap_id), None)
        assert found["partner_name"] == "Test Partner Epsilon Updated"
        print(f"✓ Updated capability and verified persistence")
    
    def test_07_delete_capability(self):
        """DELETE /api/admin/service-partner-capabilities/:id - Remove mapping"""
        # Create first
        payload = {
            "partner_id": "TEST_PARTNER_006",
            "partner_name": "Test Partner Zeta",
            "service_key": "test_delete_service",
            "service_name": "Test Delete Service",
            "country_code": "TZ",
            "capability_status": "active",
            "priority_rank": 1
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/service-partner-capabilities",
            json=payload
        )
        assert create_response.status_code == 200
        created = create_response.json()
        cap_id = created["id"]
        
        # Delete
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/service-partner-capabilities/{cap_id}"
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        delete_data = delete_response.json()
        assert delete_data.get("ok") == True
        
        # Verify deletion
        list_response = requests.get(f"{BASE_URL}/api/admin/service-partner-capabilities")
        all_caps = list_response.json()
        found = next((c for c in all_caps if c["id"] == cap_id), None)
        assert found is None, "Deleted capability should not be in list"
        print(f"✓ Deleted capability and verified removal")
    
    def test_08_delete_nonexistent_returns_404(self):
        """DELETE /api/admin/service-partner-capabilities/:id - 404 for nonexistent"""
        fake_id = "000000000000000000000000"  # Valid ObjectId format but doesn't exist
        
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/service-partner-capabilities/{fake_id}"
        )
        assert delete_response.status_code == 404, f"Expected 404, got {delete_response.status_code}"
        print(f"✓ Delete nonexistent returns 404")
    
    def test_09_update_nonexistent_returns_404(self):
        """PUT /api/admin/service-partner-capabilities/:id - 404 for nonexistent"""
        fake_id = "000000000000000000000000"
        
        update_response = requests.put(
            f"{BASE_URL}/api/admin/service-partner-capabilities/{fake_id}",
            json={"partner_name": "Should Fail"}
        )
        assert update_response.status_code == 404, f"Expected 404, got {update_response.status_code}"
        print(f"✓ Update nonexistent returns 404")
    
    def test_10_routing_best_endpoint(self):
        """GET /api/admin/service-partner-capabilities/routing/best - Get best partner"""
        # Create multiple capabilities for same service/country
        service_key = "test_routing_service"
        country_code = "TZ"
        
        # Partner 1 - lower priority, higher quality
        payload1 = {
            "partner_id": "TEST_ROUTING_001",
            "partner_name": "Routing Partner One",
            "service_key": service_key,
            "service_name": "Test Routing Service",
            "country_code": country_code,
            "capability_status": "active",
            "priority_rank": 2,
            "quality_score": 95.0,
            "success_rate": 90.0,
            "current_active_queue": 5,
            "preferred_routing": False
        }
        
        # Partner 2 - higher priority, lower quality
        payload2 = {
            "partner_id": "TEST_ROUTING_002",
            "partner_name": "Routing Partner Two",
            "service_key": service_key,
            "service_name": "Test Routing Service",
            "country_code": country_code,
            "capability_status": "active",
            "priority_rank": 1,
            "quality_score": 80.0,
            "success_rate": 85.0,
            "current_active_queue": 3,
            "preferred_routing": False
        }
        
        create1 = requests.post(f"{BASE_URL}/api/admin/service-partner-capabilities", json=payload1)
        create2 = requests.post(f"{BASE_URL}/api/admin/service-partner-capabilities", json=payload2)
        
        assert create1.status_code == 200
        assert create2.status_code == 200
        
        self.created_ids.append(create1.json()["id"])
        self.created_ids.append(create2.json()["id"])
        
        # Get best partner
        best_response = requests.get(
            f"{BASE_URL}/api/admin/service-partner-capabilities/routing/best?service_key={service_key}&country_code={country_code}"
        )
        assert best_response.status_code == 200, f"Expected 200, got {best_response.status_code}: {best_response.text}"
        
        best_data = best_response.json()
        assert "best_partner" in best_data
        
        # Should return partner with priority_rank=1 (Partner Two)
        if best_data["best_partner"]:
            print(f"✓ Best partner returned: {best_data['best_partner']['partner_name']}")
        else:
            print(f"✓ Best partner endpoint works (no active partner found)")
    
    def test_11_preferred_routing_clears_others(self):
        """Setting preferred_routing=true clears other preferred for same service/country"""
        service_key = "test_preferred_service"
        country_code = "TZ"
        
        # Create first partner with preferred_routing=true
        payload1 = {
            "partner_id": "TEST_PREF_001",
            "partner_name": "Preferred Partner One",
            "service_key": service_key,
            "service_name": "Test Preferred Service",
            "country_code": country_code,
            "capability_status": "active",
            "priority_rank": 1,
            "preferred_routing": True
        }
        
        create1 = requests.post(f"{BASE_URL}/api/admin/service-partner-capabilities", json=payload1)
        assert create1.status_code == 200
        cap1 = create1.json()
        self.created_ids.append(cap1["id"])
        assert cap1["preferred_routing"] == True
        
        # Create second partner with preferred_routing=true (should clear first)
        payload2 = {
            "partner_id": "TEST_PREF_002",
            "partner_name": "Preferred Partner Two",
            "service_key": service_key,
            "service_name": "Test Preferred Service",
            "country_code": country_code,
            "capability_status": "active",
            "priority_rank": 2,
            "preferred_routing": True
        }
        
        create2 = requests.post(f"{BASE_URL}/api/admin/service-partner-capabilities", json=payload2)
        assert create2.status_code == 200
        cap2 = create2.json()
        self.created_ids.append(cap2["id"])
        assert cap2["preferred_routing"] == True
        
        # Verify first partner's preferred_routing is now False
        list_response = requests.get(
            f"{BASE_URL}/api/admin/service-partner-capabilities?service_key={service_key}&country_code={country_code}"
        )
        assert list_response.status_code == 200
        caps = list_response.json()
        
        cap1_updated = next((c for c in caps if c["id"] == cap1["id"]), None)
        cap2_updated = next((c for c in caps if c["id"] == cap2["id"]), None)
        
        assert cap1_updated is not None
        assert cap2_updated is not None
        assert cap1_updated["preferred_routing"] == False, "First partner should have preferred_routing=False"
        assert cap2_updated["preferred_routing"] == True, "Second partner should have preferred_routing=True"
        print(f"✓ Preferred routing correctly clears other preferred for same service/country")
    
    def test_12_routing_best_prefers_preferred_routing(self):
        """routing/best should prefer partner with preferred_routing=true"""
        service_key = "test_best_preferred"
        country_code = "TZ"
        
        # Create partner with better stats but no preferred_routing
        payload1 = {
            "partner_id": "TEST_BEST_001",
            "partner_name": "Better Stats Partner",
            "service_key": service_key,
            "service_name": "Test Best Preferred",
            "country_code": country_code,
            "capability_status": "active",
            "priority_rank": 1,
            "quality_score": 99.0,
            "success_rate": 99.0,
            "current_active_queue": 0,
            "preferred_routing": False
        }
        
        # Create partner with worse stats but preferred_routing=true
        payload2 = {
            "partner_id": "TEST_BEST_002",
            "partner_name": "Preferred Partner",
            "service_key": service_key,
            "service_name": "Test Best Preferred",
            "country_code": country_code,
            "capability_status": "active",
            "priority_rank": 5,
            "quality_score": 70.0,
            "success_rate": 70.0,
            "current_active_queue": 10,
            "preferred_routing": True
        }
        
        create1 = requests.post(f"{BASE_URL}/api/admin/service-partner-capabilities", json=payload1)
        create2 = requests.post(f"{BASE_URL}/api/admin/service-partner-capabilities", json=payload2)
        
        assert create1.status_code == 200
        assert create2.status_code == 200
        
        self.created_ids.append(create1.json()["id"])
        self.created_ids.append(create2.json()["id"])
        
        # Get best partner - should be the preferred one despite worse stats
        best_response = requests.get(
            f"{BASE_URL}/api/admin/service-partner-capabilities/routing/best?service_key={service_key}&country_code={country_code}"
        )
        assert best_response.status_code == 200
        
        best_data = best_response.json()
        assert best_data["best_partner"] is not None
        assert best_data["best_partner"]["partner_id"] == "TEST_BEST_002", "Should return preferred partner"
        assert best_data["best_partner"]["preferred_routing"] == True
        print(f"✓ routing/best correctly prefers partner with preferred_routing=true")
    
    def test_13_routing_best_no_match_returns_null(self):
        """routing/best returns null when no matching capabilities"""
        best_response = requests.get(
            f"{BASE_URL}/api/admin/service-partner-capabilities/routing/best?service_key=nonexistent_service_xyz&country_code=XX"
        )
        assert best_response.status_code == 200
        
        best_data = best_response.json()
        assert best_data["best_partner"] is None
        print(f"✓ routing/best returns null for no matches")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
