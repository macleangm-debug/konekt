"""
Phase 45 — Platform Promotions Engine Tests

Tests for:
- CRUD operations on promotions (create, read, update, delete)
- Safety preview endpoint (safe=true for valid, safe=false for unsafe)
- Preview with system defaults
- Active promotions for checkout
- Margin safety validator blocking unsafe promotions
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Admin credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/admin/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def api_client(admin_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    })
    return session


class TestPromotionEngineBasics:
    """Basic API health and list tests"""

    def test_list_promotions_endpoint(self, api_client):
        """GET /api/promotion-engine/promotions returns list"""
        response = api_client.get(f"{BASE_URL}/api/promotion-engine/promotions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of promotions"
        print(f"Found {len(data)} existing promotions")

    def test_active_promotions_endpoint(self, api_client):
        """GET /api/promotion-engine/active returns active promotions"""
        response = api_client.get(f"{BASE_URL}/api/promotion-engine/active")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of active promotions"
        print(f"Found {len(data)} active promotions")


class TestPromotionCRUD:
    """CRUD operations for promotions"""

    def test_create_draft_promotion(self, api_client):
        """POST /api/promotion-engine/promotions creates a draft promotion"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Draft_Promo_{unique_id}",
            "scope": "global",
            "promo_type": "percentage",
            "promo_value": 5,
            "stacking_policy": "no_stack",
            "status": "draft"
        }
        response = api_client.post(f"{BASE_URL}/api/promotion-engine/promotions", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain promotion id"
        assert data["title"] == payload["title"], "Title should match"
        assert data["status"] == "draft", "Status should be draft"
        assert data["promo_type"] == "percentage", "Type should be percentage"
        assert data["promo_value"] == 5, "Value should be 5"
        assert data["stacking_policy"] == "no_stack", "Stacking policy should be no_stack"
        
        # Store for cleanup
        self.__class__.created_promo_id = data["id"]
        print(f"Created draft promotion: {data['id']}")

    def test_get_promotion_by_id(self, api_client):
        """GET /api/promotion-engine/promotions/{id} returns promotion details"""
        promo_id = getattr(self.__class__, "created_promo_id", None)
        if not promo_id:
            pytest.skip("No promotion created in previous test")
        
        response = api_client.get(f"{BASE_URL}/api/promotion-engine/promotions/{promo_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["id"] == promo_id, "ID should match"
        assert "title" in data, "Should have title"
        assert "status" in data, "Should have status"
        print(f"Retrieved promotion: {data['title']}")

    def test_update_promotion(self, api_client):
        """PUT /api/promotion-engine/promotions/{id} updates a promotion"""
        promo_id = getattr(self.__class__, "created_promo_id", None)
        if not promo_id:
            pytest.skip("No promotion created in previous test")
        
        update_payload = {
            "title": "TEST_Updated_Promo_Title",
            "promo_value": 3
        }
        response = api_client.put(f"{BASE_URL}/api/promotion-engine/promotions/{promo_id}", json=update_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["title"] == "TEST_Updated_Promo_Title", "Title should be updated"
        assert data["promo_value"] == 3, "Value should be updated to 3"
        
        # Verify with GET
        get_response = api_client.get(f"{BASE_URL}/api/promotion-engine/promotions/{promo_id}")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["title"] == "TEST_Updated_Promo_Title", "GET should return updated title"
        print(f"Updated promotion: {data['id']}")

    def test_delete_promotion(self, api_client):
        """DELETE /api/promotion-engine/promotions/{id} deletes a promotion"""
        promo_id = getattr(self.__class__, "created_promo_id", None)
        if not promo_id:
            pytest.skip("No promotion created in previous test")
        
        response = api_client.delete(f"{BASE_URL}/api/promotion-engine/promotions/{promo_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, "Should return ok: true"
        assert data.get("deleted") == promo_id, "Should return deleted id"
        
        # Verify deletion with GET
        get_response = api_client.get(f"{BASE_URL}/api/promotion-engine/promotions/{promo_id}")
        assert get_response.status_code == 404, "Deleted promotion should return 404"
        print(f"Deleted promotion: {promo_id}")


class TestSafetyPreview:
    """Safety preview endpoint tests"""

    def test_preview_safe_promotion(self, api_client):
        """POST /api/promotion-engine/preview returns safe=true for valid promotion"""
        # 5% off on 100k vendor price should be safe
        # Standard price = 100k + 20k (op) + 10k (dp) = 130k
        # 5% of 130k = 6.5k discount, which is less than 10k distributable pool
        payload = {
            "vendor_price": 100000,
            "operational_margin_pct": 20,
            "distributable_margin_pct": 10,
            "promo_type": "percentage",
            "promo_value": 5,
            "stacking_policy": "no_stack"
        }
        response = api_client.post(f"{BASE_URL}/api/promotion-engine/preview", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["safe"] == True, f"5% promo should be safe, got: {data}"
        assert data["vendor_price"] == 100000, "Vendor price should match"
        assert data["standard_price"] == 130000, f"Standard price should be 130k, got {data['standard_price']}"
        assert data["promo_discount"] == 6500, f"Promo discount should be 6.5k, got {data['promo_discount']}"
        assert data["promo_price"] == 123500, f"Promo price should be 123.5k, got {data['promo_price']}"
        assert data["distributable_pool_remaining"] >= 0, "Remaining pool should be >= 0"
        assert data["blocked_reason"] is None, "Should not have blocked reason"
        print(f"Safe preview: {data['promo_price']} (discount: {data['promo_discount']})")

    def test_preview_unsafe_promotion(self, api_client):
        """POST /api/promotion-engine/preview returns safe=false for unsafe promotion"""
        # 15% off on 100k vendor price should be UNSAFE
        # Standard price = 130k, 15% = 19.5k discount, exceeds 10k distributable pool
        payload = {
            "vendor_price": 100000,
            "operational_margin_pct": 20,
            "distributable_margin_pct": 10,
            "promo_type": "percentage",
            "promo_value": 15,
            "stacking_policy": "no_stack"
        }
        response = api_client.post(f"{BASE_URL}/api/promotion-engine/preview", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["safe"] == False, f"15% promo should be unsafe, got: {data}"
        assert data["distributable_pool_remaining"] < 0, "Remaining pool should be negative"
        assert data["blocked_reason"] is not None, "Should have blocked reason"
        assert "erode" in data["blocked_reason"].lower() or "exceeds" in data["blocked_reason"].lower(), \
            f"Blocked reason should mention margin erosion: {data['blocked_reason']}"
        print(f"Unsafe preview blocked: {data['blocked_reason']}")

    def test_preview_with_system_defaults(self, api_client):
        """POST /api/promotion-engine/preview-with-defaults uses system margin settings"""
        payload = {
            "vendor_price": 100000,
            "promo_type": "percentage",
            "promo_value": 5,
            "stacking_policy": "no_stack"
        }
        response = api_client.post(f"{BASE_URL}/api/promotion-engine/preview-with-defaults", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "safe" in data, "Should have safe field"
        assert "system_config" in data, "Should include system_config"
        assert "operational_margin_pct" in data["system_config"], "System config should have operational_margin_pct"
        assert "distributable_margin_pct" in data["system_config"], "System config should have distributable_margin_pct"
        print(f"Preview with defaults: safe={data['safe']}, config={data['system_config']}")


class TestMarginSafetyValidator:
    """Tests for margin safety validation on promotion activation"""

    def test_create_active_safe_promotion_succeeds(self, api_client):
        """Creating active promotion with safe value (5% off) succeeds"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Safe_Active_{unique_id}",
            "scope": "global",
            "promo_type": "percentage",
            "promo_value": 5,  # Safe: 5% is within distributable pool
            "stacking_policy": "no_stack",
            "status": "active"
        }
        response = api_client.post(f"{BASE_URL}/api/promotion-engine/promotions", json=payload)
        assert response.status_code == 200, f"Expected 200 for safe active promo, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "active", "Status should be active"
        
        # Cleanup
        self.__class__.safe_active_promo_id = data["id"]
        print(f"Created safe active promotion: {data['id']}")

    def test_create_active_unsafe_promotion_blocked(self, api_client):
        """Creating active promotion with unsafe value (50% off) returns 400 error"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Unsafe_Active_{unique_id}",
            "scope": "global",
            "promo_type": "percentage",
            "promo_value": 50,  # Unsafe: 50% exceeds distributable pool
            "stacking_policy": "no_stack",
            "status": "active"
        }
        response = api_client.post(f"{BASE_URL}/api/promotion-engine/promotions", json=payload)
        assert response.status_code == 400, f"Expected 400 for unsafe active promo, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Should have error detail"
        error_msg = data["detail"].lower()
        assert "unsafe" in error_msg or "erode" in error_msg or "exceeds" in error_msg, \
            f"Error should mention safety issue: {data['detail']}"
        print(f"Unsafe promotion blocked: {data['detail']}")

    def test_activate_unsafe_promotion_blocked(self, api_client):
        """Activating a draft promotion with unsafe value returns 400 error"""
        # First create a draft with unsafe value
        unique_id = str(uuid.uuid4())[:8]
        create_payload = {
            "title": f"TEST_Draft_To_Activate_{unique_id}",
            "scope": "global",
            "promo_type": "percentage",
            "promo_value": 50,  # Unsafe value
            "stacking_policy": "no_stack",
            "status": "draft"  # Create as draft first
        }
        create_response = api_client.post(f"{BASE_URL}/api/promotion-engine/promotions", json=create_payload)
        assert create_response.status_code == 200, f"Draft creation should succeed: {create_response.text}"
        
        promo_id = create_response.json()["id"]
        
        # Try to activate it
        update_payload = {"status": "active"}
        update_response = api_client.put(f"{BASE_URL}/api/promotion-engine/promotions/{promo_id}", json=update_payload)
        assert update_response.status_code == 400, f"Expected 400 when activating unsafe promo, got {update_response.status_code}: {update_response.text}"
        
        error_data = update_response.json()
        assert "detail" in error_data, "Should have error detail"
        print(f"Activation blocked: {error_data['detail']}")
        
        # Cleanup - delete the draft
        api_client.delete(f"{BASE_URL}/api/promotion-engine/promotions/{promo_id}")

    def test_cleanup_safe_active_promo(self, api_client):
        """Cleanup: delete safe active promotion created in earlier test"""
        promo_id = getattr(self.__class__, "safe_active_promo_id", None)
        if promo_id:
            response = api_client.delete(f"{BASE_URL}/api/promotion-engine/promotions/{promo_id}")
            print(f"Cleaned up safe active promo: {promo_id}")


class TestStackingPolicies:
    """Tests for different stacking policies"""

    def test_create_promo_with_cap_total_stacking(self, api_client):
        """Create promotion with cap_total stacking policy"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Cap_Total_{unique_id}",
            "scope": "global",
            "promo_type": "percentage",
            "promo_value": 3,
            "stacking_policy": "cap_total",
            "status": "draft"
        }
        response = api_client.post(f"{BASE_URL}/api/promotion-engine/promotions", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["stacking_policy"] == "cap_total", "Stacking policy should be cap_total"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/promotion-engine/promotions/{data['id']}")
        print(f"Created and cleaned up cap_total promo")

    def test_create_promo_with_reduce_affiliate_stacking(self, api_client):
        """Create promotion with reduce_affiliate stacking policy"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Reduce_Affiliate_{unique_id}",
            "scope": "global",
            "promo_type": "percentage",
            "promo_value": 3,
            "stacking_policy": "reduce_affiliate",
            "status": "draft"
        }
        response = api_client.post(f"{BASE_URL}/api/promotion-engine/promotions", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["stacking_policy"] == "reduce_affiliate", "Stacking policy should be reduce_affiliate"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/promotion-engine/promotions/{data['id']}")
        print(f"Created and cleaned up reduce_affiliate promo")

    def test_invalid_stacking_policy_rejected(self, api_client):
        """Invalid stacking policy returns 400 error"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Invalid_Stacking_{unique_id}",
            "scope": "global",
            "promo_type": "percentage",
            "promo_value": 5,
            "stacking_policy": "invalid_policy",
            "status": "draft"
        }
        response = api_client.post(f"{BASE_URL}/api/promotion-engine/promotions", json=payload)
        assert response.status_code == 400, f"Expected 400 for invalid stacking policy, got {response.status_code}"
        print("Invalid stacking policy correctly rejected")


class TestPromotionScopes:
    """Tests for different promotion scopes"""

    def test_create_category_scope_promotion(self, api_client):
        """Create promotion with category scope requires scope_target"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Category_Promo_{unique_id}",
            "scope": "category",
            "scope_target": "electronics",
            "promo_type": "percentage",
            "promo_value": 5,
            "stacking_policy": "no_stack",
            "status": "draft"
        }
        response = api_client.post(f"{BASE_URL}/api/promotion-engine/promotions", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["scope"] == "category", "Scope should be category"
        assert data["scope_target"] == "electronics", "Scope target should be electronics"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/promotion-engine/promotions/{data['id']}")
        print("Created and cleaned up category scope promo")

    def test_category_scope_without_target_rejected(self, api_client):
        """Category scope without scope_target returns 400 error"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Category_No_Target_{unique_id}",
            "scope": "category",
            # Missing scope_target
            "promo_type": "percentage",
            "promo_value": 5,
            "stacking_policy": "no_stack",
            "status": "draft"
        }
        response = api_client.post(f"{BASE_URL}/api/promotion-engine/promotions", json=payload)
        assert response.status_code == 400, f"Expected 400 for category without target, got {response.status_code}"
        print("Category scope without target correctly rejected")

    def test_create_product_scope_promotion(self, api_client):
        """Create promotion with product scope"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Product_Promo_{unique_id}",
            "scope": "product",
            "scope_target": "prod_12345",
            "promo_type": "fixed",
            "promo_value": 5000,
            "stacking_policy": "no_stack",
            "status": "draft"
        }
        response = api_client.post(f"{BASE_URL}/api/promotion-engine/promotions", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["scope"] == "product", "Scope should be product"
        assert data["promo_type"] == "fixed", "Type should be fixed"
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/promotion-engine/promotions/{data['id']}")
        print("Created and cleaned up product scope promo")


class TestFixedAmountPromotions:
    """Tests for fixed amount promotions"""

    def test_preview_fixed_amount_safe(self, api_client):
        """Fixed amount promotion within distributable pool is safe"""
        # 5000 TZS off on 100k vendor price
        # Distributable pool = 10k, so 5k is safe
        payload = {
            "vendor_price": 100000,
            "operational_margin_pct": 20,
            "distributable_margin_pct": 10,
            "promo_type": "fixed",
            "promo_value": 5000,
            "stacking_policy": "no_stack"
        }
        response = api_client.post(f"{BASE_URL}/api/promotion-engine/preview", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["safe"] == True, f"5k fixed discount should be safe: {data}"
        assert data["promo_discount"] == 5000, "Discount should be 5000"
        print(f"Fixed amount safe: discount={data['promo_discount']}")

    def test_preview_fixed_amount_unsafe(self, api_client):
        """Fixed amount promotion exceeding distributable pool is unsafe"""
        # 15000 TZS off on 100k vendor price
        # Distributable pool = 10k, so 15k exceeds it
        payload = {
            "vendor_price": 100000,
            "operational_margin_pct": 20,
            "distributable_margin_pct": 10,
            "promo_type": "fixed",
            "promo_value": 15000,
            "stacking_policy": "no_stack"
        }
        response = api_client.post(f"{BASE_URL}/api/promotion-engine/preview", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["safe"] == False, f"15k fixed discount should be unsafe: {data}"
        assert data["blocked_reason"] is not None, "Should have blocked reason"
        print(f"Fixed amount unsafe: {data['blocked_reason']}")
