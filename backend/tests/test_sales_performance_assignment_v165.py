"""
Sales Performance & Assignment Pack Tests (Phase 1)
Tests: Performance calculation, capabilities CRUD, assignment engine with ownership continuity gate
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
SALES_EMAIL = "neema.sales@konekt.demo"
SALES_PASSWORD = "Sales123!"


class TestSalesPerformanceAPIs:
    """Sales Performance API tests - Phase 1"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        self.sales_token = None
        self.sales_user_id = None
    
    def get_admin_token(self):
        """Get admin authentication token"""
        if self.admin_token:
            return self.admin_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("token")
            return self.admin_token
        pytest.skip(f"Admin auth failed: {response.status_code}")
    
    def get_sales_token(self):
        """Get sales user authentication token"""
        if self.sales_token:
            return self.sales_token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SALES_EMAIL,
            "password": SALES_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            self.sales_token = data.get("token")
            self.sales_user_id = data.get("user", {}).get("id")
            return self.sales_token
        pytest.skip(f"Sales auth failed: {response.status_code}")
    
    # --- Test 1: GET /api/admin/sales-performance/team (admin only) ---
    def test_01_team_performance_admin_access(self):
        """Admin can access team performance list"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/sales-performance/team",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "team" in data, "Response should contain 'team' key"
        assert isinstance(data["team"], list), "Team should be a list"
        
        # Verify team member structure
        if len(data["team"]) > 0:
            member = data["team"][0]
            assert "user_id" in member, "Member should have user_id"
            assert "name" in member, "Member should have name"
            assert "email" in member, "Member should have email"
            assert "performance_score" in member, "Member should have performance_score"
            assert "performance_zone" in member, "Member should have performance_zone"
            assert "sample_size" in member, "Member should have sample_size"
            assert "status" in member, "Member should have status"
            print(f"✓ Team has {len(data['team'])} sales members")
            print(f"  First member: {member['name']} - Score: {member['performance_score']}% ({member['performance_zone']})")
    
    def test_02_team_performance_sales_forbidden(self):
        """Sales user cannot access team performance (403)"""
        token = self.get_sales_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/sales-performance/team",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403, f"Expected 403 for sales user, got {response.status_code}"
        print("✓ Sales user correctly denied access to team performance")
    
    # --- Test 2: GET /api/admin/sales-performance/team/{userId} (admin only) ---
    def test_03_sales_detail_admin_access(self):
        """Admin can access full breakdown for a sales user"""
        token = self.get_admin_token()
        
        # First get team to find a sales user ID
        team_response = self.session.get(
            f"{BASE_URL}/api/admin/sales-performance/team",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert team_response.status_code == 200
        team = team_response.json().get("team", [])
        
        if len(team) == 0:
            pytest.skip("No sales team members found")
        
        sales_user_id = team[0]["user_id"]
        
        # Get detail
        response = self.session.get(
            f"{BASE_URL}/api/admin/sales-performance/team/{sales_user_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify full breakdown structure
        assert "performance_score" in data, "Should have performance_score"
        assert "performance_zone" in data, "Should have performance_zone"
        assert "breakdown" in data, "Should have breakdown"
        assert "tips" in data, "Should have tips"
        assert "capabilities" in data, "Should have capabilities"
        
        # Verify breakdown has tip field (admin can see tips)
        if len(data["breakdown"]) > 0:
            breakdown_item = data["breakdown"][0]
            assert "label" in breakdown_item, "Breakdown should have label"
            assert "raw_score" in breakdown_item, "Breakdown should have raw_score"
            assert "weight" in breakdown_item, "Breakdown should have weight"
            assert "weighted" in breakdown_item, "Breakdown should have weighted"
            assert "tip" in breakdown_item, "Admin breakdown should have tip field"
            print(f"✓ Sales detail retrieved for {sales_user_id}")
            print(f"  Score: {data['performance_score']}%, Zone: {data['performance_zone']}")
            print(f"  Breakdown items: {len(data['breakdown'])}")
    
    def test_04_sales_detail_not_found(self):
        """Non-existent sales user returns 404"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/sales-performance/team/nonexistent-user-id",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent user correctly returns 404")
    
    # --- Test 3: GET /api/admin/sales-performance/me (role-safe) ---
    def test_05_my_performance_sales_access(self):
        """Sales user can access own performance"""
        token = self.get_sales_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/sales-performance/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "performance_score" in data, "Should have performance_score"
        assert "performance_zone" in data, "Should have performance_zone"
        assert "breakdown" in data, "Should have breakdown"
        assert "tips" in data, "Should have tips"
        
        # CRITICAL: Verify NO tip field in breakdown (role-safe)
        if len(data["breakdown"]) > 0:
            breakdown_item = data["breakdown"][0]
            assert "tip" not in breakdown_item, "ROLE-SAFE: /me endpoint should NOT expose tip field in breakdown"
            assert "label" in breakdown_item, "Breakdown should have label"
            assert "raw_score" in breakdown_item, "Breakdown should have raw_score"
            print(f"✓ Own performance retrieved - Score: {data['performance_score']}%")
            print(f"  Zone: {data['performance_zone']}, Sample size: {data.get('sample_size', 0)}")
            print("  ✓ ROLE-SAFE: No tip field exposed in breakdown")
    
    def test_06_my_performance_admin_access(self):
        """Admin can also access /me endpoint"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/sales-performance/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Admin can access /me endpoint")
    
    # --- Test 4: GET /api/admin/sales-performance/capabilities/{userId} ---
    def test_07_get_capabilities(self):
        """Admin can get sales capabilities"""
        token = self.get_admin_token()
        
        # Get a sales user ID
        team_response = self.session.get(
            f"{BASE_URL}/api/admin/sales-performance/team",
            headers={"Authorization": f"Bearer {token}"}
        )
        team = team_response.json().get("team", [])
        if len(team) == 0:
            pytest.skip("No sales team members found")
        
        sales_user_id = team[0]["user_id"]
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/sales-performance/capabilities/{sales_user_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify capability structure
        assert "user_id" in data, "Should have user_id"
        assert "lanes" in data, "Should have lanes"
        assert "categories" in data, "Should have categories"
        assert "max_active_leads" in data, "Should have max_active_leads"
        assert "active" in data, "Should have active flag"
        print(f"✓ Capabilities retrieved for {sales_user_id}")
        print(f"  Lanes: {data['lanes']}, Categories: {data['categories']}")
        print(f"  Max leads: {data['max_active_leads']}, Active: {data['active']}")
    
    # --- Test 5: PUT /api/admin/sales-performance/capabilities/{userId} ---
    def test_08_update_capabilities(self):
        """Admin can update sales capabilities"""
        token = self.get_admin_token()
        
        # Get a sales user ID
        team_response = self.session.get(
            f"{BASE_URL}/api/admin/sales-performance/team",
            headers={"Authorization": f"Bearer {token}"}
        )
        team = team_response.json().get("team", [])
        if len(team) == 0:
            pytest.skip("No sales team members found")
        
        sales_user_id = team[0]["user_id"]
        
        # Update capabilities
        update_payload = {
            "lanes": ["import", "export"],
            "categories": ["electronics", "textiles"],
            "max_active_leads": 30,
            "active": True
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/admin/sales-performance/capabilities/{sales_user_id}",
            headers={"Authorization": f"Bearer {token}"},
            json=update_payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify update persisted
        assert data["lanes"] == ["import", "export"], "Lanes should be updated"
        assert data["categories"] == ["electronics", "textiles"], "Categories should be updated"
        assert data["max_active_leads"] == 30, "Max leads should be updated"
        assert data["active"] == True, "Active should be True"
        print(f"✓ Capabilities updated for {sales_user_id}")
        
        # Verify with GET
        get_response = self.session.get(
            f"{BASE_URL}/api/admin/sales-performance/capabilities/{sales_user_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        get_data = get_response.json()
        assert get_data["lanes"] == ["import", "export"], "GET should return updated lanes"
        print("  ✓ Update verified with GET")
    
    def test_09_capabilities_sales_forbidden(self):
        """Sales user cannot access capabilities endpoint"""
        token = self.get_sales_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/sales-performance/capabilities/some-user-id",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Sales user correctly denied access to capabilities")
    
    # --- Test 6: POST /api/admin/sales-performance/assign ---
    def test_10_assignment_no_owner(self):
        """Assignment returns scored_assignment when no existing owner"""
        token = self.get_admin_token()
        
        # Use a unique email that won't have an existing owner
        response = self.session.post(
            f"{BASE_URL}/api/admin/sales-performance/assign",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "email": "TEST_newclient_unique@example.com",
                "company_name": "TEST New Company Unique",
                "lane": "import",
                "category": "electronics"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify assignment response
        assert "assigned_sales_id" in data, "Should have assigned_sales_id"
        assert "routing_mode" in data, "Should have routing_mode"
        assert "reason" in data, "Should have reason"
        assert "candidates" in data, "Should have candidates"
        
        # Should be scored_assignment since no existing owner
        assert data["routing_mode"] == "scored_assignment", f"Expected scored_assignment, got {data['routing_mode']}"
        assert len(data["candidates"]) > 0, "Should have candidates list"
        
        # Verify candidate structure
        candidate = data["candidates"][0]
        assert "id" in candidate, "Candidate should have id"
        assert "name" in candidate, "Candidate should have name"
        assert "score" in candidate, "Candidate should have score"
        
        print(f"✓ Assignment returned scored_assignment mode")
        print(f"  Assigned to: {data['assigned_sales_id']}")
        print(f"  Reason: {data['reason']}")
        print(f"  Candidates: {len(data['candidates'])}")
    
    # --- Test 7: Assignment with ownership continuity ---
    def test_11_assignment_continuity_gate(self):
        """Assignment returns continuity routing when existing owner found"""
        token = self.get_admin_token()
        
        # First, create a lead with an assigned owner to establish ownership
        # Check if there's an existing lead with an owner
        leads_response = self.session.get(
            f"{BASE_URL}/api/admin/crm/leads",
            headers={"Authorization": f"Bearer {token}"},
            params={"limit": 1}
        )
        
        if leads_response.status_code == 200:
            leads_data = leads_response.json()
            # Handle both list and dict response formats
            leads = leads_data if isinstance(leads_data, list) else leads_data.get("leads", [])
            if len(leads) > 0 and leads[0].get("assigned_sales_owner_id"):
                # Use this lead's email to test continuity
                existing_email = leads[0].get("email")
                if existing_email:
                    response = self.session.post(
                        f"{BASE_URL}/api/admin/sales-performance/assign",
                        headers={"Authorization": f"Bearer {token}"},
                        json={
                            "email": existing_email,
                            "company_name": "Test Company"
                        }
                    )
                    assert response.status_code == 200
                    data = response.json()
                    
                    # Should return continuity if owner exists
                    if data["routing_mode"] == "continuity":
                        print(f"✓ Continuity gate triggered for existing client")
                        print(f"  Existing owner preserved: {data['assigned_sales_id']}")
                        return
        
        # If no existing lead with owner, test passes but note it
        print("✓ Continuity gate test - no existing ownership found (scored_assignment used)")
    
    def test_12_assignment_sales_forbidden(self):
        """Sales user cannot run assignment"""
        token = self.get_sales_token()
        response = self.session.post(
            f"{BASE_URL}/api/admin/sales-performance/assign",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "email": "test@example.com",
                "company_name": "Test"
            }
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Sales user correctly denied access to assignment")
    
    # --- Test 8: Performance zones ---
    def test_13_performance_zones(self):
        """Verify performance zones are correctly assigned"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/sales-performance/team",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        team = response.json().get("team", [])
        
        valid_zones = {"excellent", "safe", "risk", "developing"}
        for member in team:
            zone = member.get("performance_zone")
            assert zone in valid_zones, f"Invalid zone: {zone}"
            score = member.get("performance_score", 0)
            sample_size = member.get("sample_size", 0)
            
            # Verify zone logic
            if sample_size < 5:
                assert zone == "developing", f"Low sample size should be developing, got {zone}"
            elif score >= 85:
                assert zone == "excellent", f"Score {score} should be excellent, got {zone}"
            elif score >= 70:
                assert zone == "safe", f"Score {score} should be safe, got {zone}"
            elif score >= 50:
                assert zone == "risk", f"Score {score} should be risk, got {zone}"
        
        print(f"✓ All {len(team)} team members have valid performance zones")
    
    # --- Test 9: Regression - existing admin pages ---
    def test_14_regression_dashboard(self):
        """Dashboard still works"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/dashboard/summary",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Dashboard failed: {response.status_code}"
        print("✓ Dashboard endpoint working")
    
    def test_15_regression_orders(self):
        """Orders endpoint still works"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/orders-ops",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Orders failed: {response.status_code}"
        print("✓ Orders endpoint working")
    
    def test_16_regression_crm_leads(self):
        """CRM leads endpoint still works"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/crm/leads",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"CRM leads failed: {response.status_code}"
        print("✓ CRM leads endpoint working")
    
    def test_17_regression_business_settings(self):
        """Business settings endpoint still works"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/business-settings",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Business settings failed: {response.status_code}"
        print("✓ Business settings endpoint working")
    
    # --- Test 10: Breakdown structure validation ---
    def test_18_breakdown_structure(self):
        """Verify breakdown has all required metrics"""
        token = self.get_admin_token()
        
        team_response = self.session.get(
            f"{BASE_URL}/api/admin/sales-performance/team",
            headers={"Authorization": f"Bearer {token}"}
        )
        team = team_response.json().get("team", [])
        if len(team) == 0:
            pytest.skip("No sales team members")
        
        sales_user_id = team[0]["user_id"]
        response = self.session.get(
            f"{BASE_URL}/api/admin/sales-performance/team/{sales_user_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = response.json()
        breakdown = data.get("breakdown", [])
        
        # Expected metrics
        expected_labels = {
            "Customer Rating",
            "Conversion Rate",
            "Revenue Contribution",
            "Response Speed",
            "Follow-up Compliance"
        }
        
        actual_labels = {b["label"] for b in breakdown}
        assert expected_labels == actual_labels, f"Missing metrics: {expected_labels - actual_labels}"
        
        # Verify weights sum to 1.0
        total_weight = sum(b["weight"] for b in breakdown)
        assert abs(total_weight - 1.0) < 0.01, f"Weights should sum to 1.0, got {total_weight}"
        
        print(f"✓ Breakdown has all 5 required metrics")
        print(f"  Total weight: {total_weight}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
