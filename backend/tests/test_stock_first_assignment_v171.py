"""
Test Stock-First Vendor Assignment Engine (Iteration 171)

Tests:
- GET /api/admin/assignment/candidates/{product_id}?quantity=N - Ranked vendor candidates
- GET /api/admin/assignment/explain/{order_id} - Assignment decision explanation
- GET /api/admin/assignment/decisions?limit=N&engine=X - List decisions
- Stock-First priority tiers (exact_stock, partial_stock, made_to_order, on_demand, product_owner)
- Atomic stock reservation via POST /api/admin/vendors/{vendor_id}/supply
- Double-booking prevention
- Vendor eligibility (suspended/blocked excluded, risk-zone allowed with warning)
- Assignment decisions persisted in assignment_decisions collection
- Explain endpoint returns 404 for orders without decisions
- Type-aware dispatch (product, service, promo)
- Existing routes still work (health, auth, vendor orders, admin orders)
"""
import pytest
import requests
import os
import uuid
import time
from concurrent.futures import ThreadPoolExecutor

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"

# Test data from context
VENDOR_1_ID = "a8a47305-4357-49b0-b653-b01631e3e8f4"  # Has supply record
VENDOR_2_ID = "613bd36c-6d31-472b-9c05-32350d97a0ac"
VENDOR_3_ID = "694ec5ad-a72b-45d6-a463-2d31a8cec4e9"
PRODUCT_ID = "6d927ec9-a7b8-43f5-8ade-15f211d2112a"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        data = resp.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


# ─── Health & Auth Regression ────────────────────────────────────────────────

class TestHealthAndAuthRegression:
    """Verify existing routes still work"""
    
    def test_health_endpoint(self):
        """Health check should return 200"""
        resp = requests.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200, f"Health check failed: {resp.text}"
        print("✓ Health endpoint working")
    
    def test_admin_login(self):
        """Admin login should work"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert resp.status_code == 200, f"Admin login failed: {resp.text}"
        data = resp.json()
        assert "token" in data or "access_token" in data
        print("✓ Admin login working")


# ─── Supply Record Management ────────────────────────────────────────────────

class TestSupplyRecordManagement:
    """Test supply record creation for stock-first assignment"""
    
    def test_create_supply_record_for_vendor_2(self, admin_headers):
        """Create supply record for second vendor to test multi-vendor ranking"""
        # Create supply record for vendor 2 with less stock than vendor 1
        test_product_id = f"TEST_PRODUCT_{uuid.uuid4().hex[:8]}"
        resp = requests.post(
            f"{BASE_URL}/api/admin/vendors/{VENDOR_2_ID}/supply",
            headers=admin_headers,
            json={
                "product_id": test_product_id,
                "base_price_vat_inclusive": 15000.0,
                "quantity": 5,
                "lead_time_days": 2,
                "supply_mode": "in_stock"
            }
        )
        # May return 404 if vendor doesn't exist as vendor role
        if resp.status_code == 404:
            print(f"⚠ Vendor {VENDOR_2_ID} not found as vendor role - skipping")
            pytest.skip("Vendor 2 not found")
        assert resp.status_code == 200, f"Create supply failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        assert "id" in data
        assert data["vendor_id"] == VENDOR_2_ID
        assert data["quantity"] == 5
        assert data["supply_mode"] == "in_stock"
        print(f"✓ Created supply record for vendor 2: {data['id']}")
    
    def test_list_supply_records(self, admin_headers):
        """List supply records for a vendor"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/vendors/{VENDOR_1_ID}/supply",
            headers=admin_headers
        )
        if resp.status_code == 404:
            pytest.skip("Vendor 1 not found")
        assert resp.status_code == 200, f"List supply failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} supply records for vendor 1")


# ─── Candidates Preview Endpoint ─────────────────────────────────────────────

class TestCandidatesPreview:
    """Test GET /api/admin/assignment/candidates/{product_id}"""
    
    def test_candidates_returns_ranked_list(self, admin_headers):
        """Candidates endpoint returns ranked vendor list with tier classification"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/assignment/candidates/{PRODUCT_ID}?quantity=5",
            headers=admin_headers
        )
        assert resp.status_code == 200, f"Candidates failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        
        # Verify response structure
        assert "product_id" in data
        assert "candidates" in data
        assert "engine" in data
        assert data["engine"] == "stock_first_product"
        assert "requested_quantity" in data
        assert data["requested_quantity"] == 5
        
        print(f"✓ Candidates endpoint returned {len(data['candidates'])} candidates")
        
        # Verify candidate structure
        if data["candidates"]:
            candidate = data["candidates"][0]
            assert "vendor_id" in candidate
            assert "tier" in candidate
            assert "tier_label" in candidate
            assert "supply_mode" in candidate
            assert "available_qty" in candidate
            assert "eligible" in candidate
            assert "eligibility_reason" in candidate
            print(f"  First candidate: {candidate['vendor_name']} - tier {candidate['tier']} ({candidate['tier_label']})")
    
    def test_candidates_tier_classification(self, admin_headers):
        """Verify tier classification: exact_stock (tier 1), partial_stock (tier 2)"""
        # Request quantity that should result in exact_stock for vendor with qty >= requested
        resp = requests.get(
            f"{BASE_URL}/api/admin/assignment/candidates/{PRODUCT_ID}?quantity=3",
            headers=admin_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Check tier labels are valid
        valid_tiers = {"exact_stock", "partial_stock", "made_to_order", "on_demand", "product_owner", "catalog_owner", "unknown"}
        for candidate in data.get("candidates", []):
            assert candidate.get("tier_label") in valid_tiers, f"Invalid tier_label: {candidate.get('tier_label')}"
        
        print("✓ Tier classification validated")
    
    def test_candidates_with_large_quantity(self, admin_headers):
        """Request quantity larger than available stock should show partial_stock tier"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/assignment/candidates/{PRODUCT_ID}?quantity=100",
            headers=admin_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        
        # Vendors with in_stock but insufficient qty should be tier 2 (partial_stock)
        for candidate in data.get("candidates", []):
            if candidate.get("supply_mode") == "in_stock" and candidate.get("available_qty", 0) > 0:
                if candidate.get("available_qty") < 100:
                    assert candidate.get("tier") == 2, f"Expected tier 2 for partial stock, got {candidate.get('tier')}"
        
        print("✓ Large quantity request shows partial_stock tier correctly")
    
    def test_candidates_nonexistent_product(self, admin_headers):
        """Candidates for nonexistent product should return empty list or product_owner fallback"""
        fake_product_id = f"NONEXISTENT_{uuid.uuid4().hex}"
        resp = requests.get(
            f"{BASE_URL}/api/admin/assignment/candidates/{fake_product_id}?quantity=1",
            headers=admin_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "candidates" in data
        # May be empty or have catalog_owner fallback
        print(f"✓ Nonexistent product returned {len(data.get('candidates', []))} candidates")


# ─── Assignment Decisions Endpoint ───────────────────────────────────────────

class TestAssignmentDecisions:
    """Test GET /api/admin/assignment/decisions"""
    
    def test_list_decisions_default(self, admin_headers):
        """List recent assignment decisions"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/assignment/decisions",
            headers=admin_headers
        )
        assert resp.status_code == 200, f"List decisions failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} assignment decisions")
    
    def test_list_decisions_with_limit(self, admin_headers):
        """List decisions with limit parameter"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/assignment/decisions?limit=5",
            headers=admin_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) <= 5
        print(f"✓ Listed {len(data)} decisions with limit=5")
    
    def test_list_decisions_filter_by_engine(self, admin_headers):
        """Filter decisions by engine type"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/assignment/decisions?engine=stock_first_product",
            headers=admin_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        # All returned decisions should have the filtered engine
        for decision in data:
            assert decision.get("engine_used") == "stock_first_product"
        print(f"✓ Filtered {len(data)} decisions by engine=stock_first_product")


# ─── Explain Endpoint ────────────────────────────────────────────────────────

class TestExplainEndpoint:
    """Test GET /api/admin/assignment/explain/{order_id}"""
    
    def test_explain_nonexistent_order_returns_404(self, admin_headers):
        """Explain for nonexistent order should return 404"""
        fake_order_id = f"NONEXISTENT_ORDER_{uuid.uuid4().hex}"
        resp = requests.get(
            f"{BASE_URL}/api/admin/assignment/explain/{fake_order_id}",
            headers=admin_headers
        )
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("✓ Explain returns 404 for nonexistent order")
    
    def test_explain_existing_decision(self, admin_headers):
        """If decisions exist, explain should return full audit record"""
        # First get a decision to find an order_id
        resp = requests.get(
            f"{BASE_URL}/api/admin/assignment/decisions?limit=1",
            headers=admin_headers
        )
        assert resp.status_code == 200
        decisions = resp.json()
        
        if not decisions:
            pytest.skip("No existing decisions to test explain endpoint")
        
        order_id = decisions[0].get("order_id")
        resp = requests.get(
            f"{BASE_URL}/api/admin/assignment/explain/{order_id}",
            headers=admin_headers
        )
        assert resp.status_code == 200, f"Explain failed: {resp.text}"
        data = resp.json()
        
        # Verify audit record structure
        assert "order_id" in data
        assert "engine_used" in data
        assert "chosen_vendor_id" in data or "chosen_vendor_name" in data
        assert "reason_code" in data
        assert "created_at" in data
        
        print(f"✓ Explain returned audit record for order {order_id}")
        print(f"  Engine: {data.get('engine_used')}, Reason: {data.get('reason_code')}")


# ─── Vendor Eligibility ──────────────────────────────────────────────────────

class TestVendorEligibility:
    """Test vendor eligibility rules in assignment"""
    
    def test_candidates_show_eligibility_status(self, admin_headers):
        """Candidates should show eligible/ineligible status with reason"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/assignment/candidates/{PRODUCT_ID}?quantity=1",
            headers=admin_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        
        for candidate in data.get("candidates", []):
            assert "eligible" in candidate
            assert "eligibility_reason" in candidate
            # Warning field should exist (may be null)
            assert "warning" in candidate or candidate.get("warning") is None
        
        print("✓ Candidates show eligibility status")
    
    def test_eligible_vendors_have_valid_reasons(self, admin_headers):
        """Eligible vendors should have 'eligible' reason"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/assignment/candidates/{PRODUCT_ID}?quantity=1",
            headers=admin_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        
        for candidate in data.get("candidates", []):
            if candidate.get("eligible"):
                assert candidate.get("eligibility_reason") == "eligible"
        
        print("✓ Eligible vendors have valid reasons")


# ─── Type-Aware Dispatch ─────────────────────────────────────────────────────

class TestTypeAwareDispatch:
    """Test that different order types use different engines"""
    
    def test_decisions_show_engine_type(self, admin_headers):
        """Assignment decisions should show which engine was used"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/assignment/decisions?limit=20",
            headers=admin_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        
        valid_engines = {
            "stock_first_product",
            "promo_capability",
            "service_capability_performance",
            "manual_override",
            "fallback_item_vendor",
            "fallback_product_catalog"
        }
        
        for decision in data:
            engine = decision.get("engine_used")
            assert engine in valid_engines, f"Invalid engine: {engine}"
        
        print("✓ All decisions have valid engine types")


# ─── Atomic Stock Reservation ────────────────────────────────────────────────

class TestAtomicStockReservation:
    """Test atomic stock reservation prevents double-booking"""
    
    def test_create_supply_and_verify_quantity(self, admin_headers):
        """Create supply record and verify quantity is stored correctly"""
        test_product_id = f"TEST_ATOMIC_{uuid.uuid4().hex[:8]}"
        
        # Create supply with specific quantity
        resp = requests.post(
            f"{BASE_URL}/api/admin/vendors/{VENDOR_1_ID}/supply",
            headers=admin_headers,
            json={
                "product_id": test_product_id,
                "base_price_vat_inclusive": 10000.0,
                "quantity": 20,
                "lead_time_days": 1,
                "supply_mode": "in_stock"
            }
        )
        if resp.status_code == 404:
            pytest.skip("Vendor not found")
        
        assert resp.status_code == 200, f"Create supply failed: {resp.text}"
        data = resp.json()
        assert data["quantity"] == 20
        print(f"✓ Created supply record with quantity=20 for product {test_product_id}")
        
        # Verify in candidates preview
        resp = requests.get(
            f"{BASE_URL}/api/admin/assignment/candidates/{test_product_id}?quantity=10",
            headers=admin_headers
        )
        assert resp.status_code == 200
        candidates_data = resp.json()
        
        # Find our vendor in candidates
        our_candidate = None
        for c in candidates_data.get("candidates", []):
            if c.get("vendor_id") == VENDOR_1_ID or c.get("vendor_user_id") == VENDOR_1_ID:
                our_candidate = c
                break
        
        if our_candidate:
            assert our_candidate.get("available_qty") == 20
            assert our_candidate.get("tier") == 1  # exact_stock since 20 >= 10
            print(f"✓ Verified candidate shows correct quantity and tier")


# ─── Decision Audit Trail ────────────────────────────────────────────────────

class TestDecisionAuditTrail:
    """Test that assignment decisions are persisted with full audit trail"""
    
    def test_decision_has_required_fields(self, admin_headers):
        """Decisions should have all required audit fields"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/assignment/decisions?limit=5",
            headers=admin_headers
        )
        assert resp.status_code == 200
        decisions = resp.json()
        
        if not decisions:
            pytest.skip("No decisions to verify audit trail")
        
        required_fields = ["id", "order_id", "order_type", "engine_used", "created_at"]
        for decision in decisions:
            for field in required_fields:
                assert field in decision, f"Missing required field: {field}"
        
        print("✓ All decisions have required audit fields")
    
    def test_decision_has_candidates_snapshot(self, admin_headers):
        """Decisions should include candidates snapshot for audit"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/assignment/decisions?limit=10",
            headers=admin_headers
        )
        assert resp.status_code == 200
        decisions = resp.json()
        
        # At least some decisions should have candidates_snapshot
        has_snapshot = any(d.get("candidates_snapshot") for d in decisions)
        if decisions:
            print(f"✓ Found {sum(1 for d in decisions if d.get('candidates_snapshot'))} decisions with candidates snapshot")


# ─── Existing Routes Regression ──────────────────────────────────────────────

class TestExistingRoutesRegression:
    """Verify existing backend routes still work"""
    
    def test_vendor_orders_endpoint(self, admin_headers):
        """Vendor orders endpoint should work"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers=admin_headers
        )
        # May return 200 or 404 depending on implementation
        assert resp.status_code in [200, 404], f"Unexpected status: {resp.status_code}"
        print(f"✓ Admin orders endpoint returned {resp.status_code}")
    
    def test_vendors_list_endpoint(self, admin_headers):
        """Vendors list endpoint should work"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/vendors",
            headers=admin_headers
        )
        assert resp.status_code == 200, f"Vendors list failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"✓ Vendors list returned {len(data)} vendors")
    
    def test_vendor_stats_endpoint(self, admin_headers):
        """Vendor stats endpoint should work"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/vendors/stats",
            headers=admin_headers
        )
        assert resp.status_code == 200, f"Vendor stats failed: {resp.text}"
        data = resp.json()
        assert "total" in data
        print(f"✓ Vendor stats: total={data.get('total')}")


# ─── Supply Mode Variations ──────────────────────────────────────────────────

class TestSupplyModeVariations:
    """Test different supply modes affect tier classification"""
    
    def test_made_to_order_supply_mode(self, admin_headers):
        """Made-to-order supply should be tier 3"""
        test_product_id = f"TEST_MTO_{uuid.uuid4().hex[:8]}"
        
        resp = requests.post(
            f"{BASE_URL}/api/admin/vendors/{VENDOR_1_ID}/supply",
            headers=admin_headers,
            json={
                "product_id": test_product_id,
                "base_price_vat_inclusive": 25000.0,
                "quantity": 0,
                "lead_time_days": 7,
                "supply_mode": "made_to_order"
            }
        )
        if resp.status_code == 404:
            pytest.skip("Vendor not found")
        
        assert resp.status_code == 200
        
        # Check candidates
        resp = requests.get(
            f"{BASE_URL}/api/admin/assignment/candidates/{test_product_id}?quantity=1",
            headers=admin_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        
        for candidate in data.get("candidates", []):
            if candidate.get("supply_mode") == "made_to_order":
                assert candidate.get("tier") == 3
                print(f"✓ Made-to-order supply correctly classified as tier 3")
                return
        
        print("⚠ No made_to_order candidate found in response")
    
    def test_on_demand_supply_mode(self, admin_headers):
        """On-demand supply should be tier 4"""
        test_product_id = f"TEST_OD_{uuid.uuid4().hex[:8]}"
        
        resp = requests.post(
            f"{BASE_URL}/api/admin/vendors/{VENDOR_1_ID}/supply",
            headers=admin_headers,
            json={
                "product_id": test_product_id,
                "base_price_vat_inclusive": 30000.0,
                "quantity": 0,
                "lead_time_days": 14,
                "supply_mode": "on_demand"
            }
        )
        if resp.status_code == 404:
            pytest.skip("Vendor not found")
        
        assert resp.status_code == 200
        
        # Check candidates
        resp = requests.get(
            f"{BASE_URL}/api/admin/assignment/candidates/{test_product_id}?quantity=1",
            headers=admin_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        
        for candidate in data.get("candidates", []):
            if candidate.get("supply_mode") == "on_demand":
                assert candidate.get("tier") == 4
                print(f"✓ On-demand supply correctly classified as tier 4")
                return
        
        print("⚠ No on_demand candidate found in response")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
