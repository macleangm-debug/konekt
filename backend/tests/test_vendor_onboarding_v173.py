"""
Test Vendor Onboarding Pack v173 — Unified vendor onboarding with country-aware fields,
vendor role policy, marketplace permission enforcement, invite token flow, and catalog workspace.
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Admin auth failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestHealthAndRegression:
    """Regression tests for existing endpoints"""

    def test_health_endpoint(self):
        """GET /api/health — Should return healthy"""
        resp = requests.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("status") == "healthy"
        print("PASS: /api/health returns healthy")

    def test_dormant_clients_summary_regression(self, admin_headers):
        """GET /api/admin/dormant-clients/summary — Regression check"""
        resp = requests.get(f"{BASE_URL}/api/admin/dormant-clients/summary", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "at_risk" in data or "inactive" in data or "summary" in data
        print(f"PASS: /api/admin/dormant-clients/summary returns data")

    def test_assignment_candidates_regression(self, admin_headers):
        """GET /api/admin/assignment/candidates/{product_id} — Regression check"""
        # Use a known product ID or test with a dummy one
        resp = requests.get(f"{BASE_URL}/api/admin/assignment/candidates/test-product-id", headers=admin_headers)
        # Should return 200 with empty list or 404 if product not found
        assert resp.status_code in [200, 404]
        print(f"PASS: /api/admin/assignment/candidates regression check (status={resp.status_code})")


class TestMarketContextService:
    """Tests for market context endpoints"""

    def test_get_supported_markets(self, admin_headers):
        """GET /api/admin/vendor-onboarding/markets — Returns list of supported markets"""
        resp = requests.get(f"{BASE_URL}/api/admin/vendor-onboarding/markets", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "markets" in data
        markets = data["markets"]
        assert len(markets) >= 6  # TZ, KE, UG, RW, NG, ZA
        
        # Verify market structure
        codes = [m["code"] for m in markets]
        assert "TZ" in codes
        assert "KE" in codes
        assert "UG" in codes
        assert "RW" in codes
        assert "NG" in codes
        assert "ZA" in codes
        
        # Verify each market has required fields
        for m in markets:
            assert "code" in m
            assert "name" in m
            assert "phone_prefix" in m
            assert "currency" in m
        
        print(f"PASS: /api/admin/vendor-onboarding/markets returns {len(markets)} markets")

    def test_get_market_context_tz(self, admin_headers):
        """GET /api/admin/vendor-onboarding/market-context/TZ — Returns Tanzania defaults"""
        resp = requests.get(f"{BASE_URL}/api/admin/vendor-onboarding/market-context/TZ", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("phone_prefix") == "+255"
        assert data.get("currency_code") == "TZS"
        assert "support_email" in data
        assert "tax_id_label" in data
        print(f"PASS: /api/admin/vendor-onboarding/market-context/TZ returns correct defaults")

    def test_get_market_context_ke(self, admin_headers):
        """GET /api/admin/vendor-onboarding/market-context/KE — Returns Kenya defaults"""
        resp = requests.get(f"{BASE_URL}/api/admin/vendor-onboarding/market-context/KE", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("phone_prefix") == "+254"
        assert data.get("currency_code") == "KES"
        print(f"PASS: /api/admin/vendor-onboarding/market-context/KE returns correct defaults")

    def test_get_market_context_ng(self, admin_headers):
        """GET /api/admin/vendor-onboarding/market-context/NG — Returns Nigeria defaults"""
        resp = requests.get(f"{BASE_URL}/api/admin/vendor-onboarding/market-context/NG", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("phone_prefix") == "+234"
        assert data.get("currency_code") == "NGN"
        print(f"PASS: /api/admin/vendor-onboarding/market-context/NG returns correct defaults")


class TestVendorRolePolicy:
    """Tests for vendor role policy and permissions"""

    def test_role_preview_products(self, admin_headers):
        """GET /api/admin/vendor-onboarding/role-preview?capability_type=products — can_publish=true"""
        resp = requests.get(f"{BASE_URL}/api/admin/vendor-onboarding/role-preview?capability_type=products", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("vendor_role") == "product_vendor"
        assert data.get("can_access_marketplace_upload") == True
        assert data.get("can_publish_products") == True
        print(f"PASS: role-preview products → can_access_marketplace_upload=true")

    def test_role_preview_promo(self, admin_headers):
        """GET /api/admin/vendor-onboarding/role-preview?capability_type=promotional_materials — can_publish=true"""
        resp = requests.get(f"{BASE_URL}/api/admin/vendor-onboarding/role-preview?capability_type=promotional_materials", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("vendor_role") == "promo_vendor"
        assert data.get("can_access_marketplace_upload") == True
        assert data.get("can_publish_promo") == True
        print(f"PASS: role-preview promo → can_access_marketplace_upload=true")

    def test_role_preview_services(self, admin_headers):
        """GET /api/admin/vendor-onboarding/role-preview?capability_type=services — can_publish=false"""
        resp = requests.get(f"{BASE_URL}/api/admin/vendor-onboarding/role-preview?capability_type=services", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("vendor_role") == "service_vendor"
        assert data.get("can_access_marketplace_upload") == False
        assert data.get("can_receive_service_tasks") == True
        print(f"PASS: role-preview services → can_access_marketplace_upload=false (task-only)")

    def test_role_preview_multi(self, admin_headers):
        """GET /api/admin/vendor-onboarding/role-preview?capability_type=multi — can_publish=true"""
        resp = requests.get(f"{BASE_URL}/api/admin/vendor-onboarding/role-preview?capability_type=multi", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("vendor_role") == "hybrid_vendor"
        assert data.get("can_access_marketplace_upload") == True
        print(f"PASS: role-preview multi → can_access_marketplace_upload=true")


class TestVendorOnboarding:
    """Tests for vendor onboarding flow"""

    def test_create_vendor_product_type(self, admin_headers):
        """POST /api/admin/vendor-onboarding — Creates product vendor with invite"""
        unique_email = f"test.vendor.product.{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "Test Product Vendor",
            "business_name": "Test Products Ltd",
            "email": unique_email,
            "country_code": "TZ",
            "phone_number": "712345678",
            "region": "Dar es Salaam",
            "capability_type": "products",
            "taxonomy_ids": [],
            "notes": "Test vendor for iteration 173"
        }
        resp = requests.post(f"{BASE_URL}/api/admin/vendor-onboarding", json=payload, headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        
        # Verify vendor
        assert "vendor" in data
        vendor = data["vendor"]
        assert vendor.get("email") == unique_email
        assert vendor.get("vendor_role") == "product_vendor"
        assert vendor.get("vendor_status") == "invited"
        assert vendor.get("country_code") == "TZ"
        assert vendor.get("phone_prefix") == "+255"
        
        # Verify invite
        assert "invite" in data
        invite = data["invite"]
        assert "token" in invite
        assert invite.get("status") == "pending"
        assert invite.get("email_sent") == False  # MOCKED
        
        # Verify permissions
        assert "permissions" in data
        perms = data["permissions"]
        assert perms.get("can_access_marketplace_upload") == True
        
        # Verify market context
        assert "market_context" in data
        ctx = data["market_context"]
        assert ctx.get("currency_code") == "TZS"
        
        print(f"PASS: Created product vendor {unique_email} with invite token")
        return data

    def test_create_vendor_service_type(self, admin_headers):
        """POST /api/admin/vendor-onboarding — Creates service vendor (task-only)"""
        unique_email = f"test.vendor.service.{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "Test Service Vendor",
            "business_name": "Test Services Ltd",
            "email": unique_email,
            "country_code": "KE",
            "phone_number": "712345678",
            "capability_type": "services",
            "taxonomy_ids": [],
        }
        resp = requests.post(f"{BASE_URL}/api/admin/vendor-onboarding", json=payload, headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        
        vendor = data["vendor"]
        assert vendor.get("vendor_role") == "service_vendor"
        assert vendor.get("country_code") == "KE"
        assert vendor.get("phone_prefix") == "+254"
        
        perms = data["permissions"]
        assert perms.get("can_access_marketplace_upload") == False
        assert perms.get("can_receive_service_tasks") == True
        
        print(f"PASS: Created service vendor {unique_email} (task-only, no marketplace)")
        return data

    def test_create_vendor_duplicate_email(self, admin_headers):
        """POST /api/admin/vendor-onboarding with duplicate email → Returns 409"""
        # First create a vendor
        unique_email = f"test.vendor.dup.{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "Test Dup Vendor",
            "email": unique_email,
            "country_code": "TZ",
            "capability_type": "products",
        }
        resp1 = requests.post(f"{BASE_URL}/api/admin/vendor-onboarding", json=payload, headers=admin_headers)
        assert resp1.status_code == 200
        
        # Try to create again with same email
        resp2 = requests.post(f"{BASE_URL}/api/admin/vendor-onboarding", json=payload, headers=admin_headers)
        assert resp2.status_code == 409
        print(f"PASS: Duplicate email returns 409 Conflict")


class TestVendorInviteFlow:
    """Tests for vendor invite token validation and activation"""

    @pytest.fixture
    def created_vendor(self, admin_headers):
        """Create a vendor and return the data"""
        unique_email = f"test.invite.{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "Test Invite Vendor",
            "email": unique_email,
            "country_code": "TZ",
            "capability_type": "products",
        }
        resp = requests.post(f"{BASE_URL}/api/admin/vendor-onboarding", json=payload, headers=admin_headers)
        assert resp.status_code == 200
        return resp.json()

    def test_validate_invite_token(self, admin_headers, created_vendor):
        """GET /api/vendor-invite/validate/{token} — Validates invite token"""
        token = created_vendor["invite"]["token"]
        resp = requests.get(f"{BASE_URL}/api/vendor-invite/validate/{token}")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("valid") == True
        assert data.get("vendor_email") == created_vendor["vendor"]["email"]
        print(f"PASS: /api/vendor-invite/validate/{token[:10]}... returns valid=true")

    def test_validate_invalid_token(self):
        """GET /api/vendor-invite/validate/{invalid_token} — Returns valid=false"""
        resp = requests.get(f"{BASE_URL}/api/vendor-invite/validate/invalid-token-12345")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("valid") == False
        print(f"PASS: Invalid token returns valid=false")

    def test_activate_vendor(self, admin_headers, created_vendor):
        """POST /api/vendor-invite/activate — Activates vendor with password"""
        token = created_vendor["invite"]["token"]
        payload = {
            "token": token,
            "password": "SecurePass123!"
        }
        resp = requests.post(f"{BASE_URL}/api/vendor-invite/activate", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("success") == True
        assert data.get("vendor_id") == created_vendor["vendor"]["id"]
        print(f"PASS: Vendor activated successfully")

    def test_activate_short_password(self, admin_headers, created_vendor):
        """POST /api/vendor-invite/activate with short password → Returns 400"""
        # Create another vendor for this test
        unique_email = f"test.shortpw.{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "full_name": "Test Short PW",
            "email": unique_email,
            "country_code": "TZ",
            "capability_type": "products",
        }
        resp = requests.post(f"{BASE_URL}/api/admin/vendor-onboarding", json=payload, headers=admin_headers)
        token = resp.json()["invite"]["token"]
        
        # Try to activate with short password
        resp2 = requests.post(f"{BASE_URL}/api/vendor-invite/activate", json={
            "token": token,
            "password": "short"
        })
        assert resp2.status_code == 400
        print(f"PASS: Short password returns 400")


class TestVendorInvitesList:
    """Tests for listing vendor invites"""

    def test_list_invites(self, admin_headers):
        """GET /api/admin/vendor-onboarding/invites — Lists all vendor invites"""
        resp = requests.get(f"{BASE_URL}/api/admin/vendor-onboarding/invites", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "invites" in data
        invites = data["invites"]
        assert isinstance(invites, list)
        
        # If there are invites, verify structure
        if len(invites) > 0:
            inv = invites[0]
            assert "id" in inv
            assert "vendor_id" in inv
            assert "token" in inv
            assert "status" in inv
        
        print(f"PASS: /api/admin/vendor-onboarding/invites returns {len(invites)} invites")


class TestCatalogWorkspace:
    """Tests for catalog workspace stats endpoint"""

    def test_catalog_stats(self, admin_headers):
        """GET /api/admin/catalog-workspace/stats — Returns catalog overview stats"""
        resp = requests.get(f"{BASE_URL}/api/admin/catalog-workspace/stats", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        
        # Verify required fields
        assert "products" in data
        assert "services" in data
        assert "taxonomy_categories" in data
        assert "vendor_supply_records" in data
        assert "pending_submissions" in data
        assert "sections" in data
        
        # Verify counts are integers
        assert isinstance(data["products"], int)
        assert isinstance(data["services"], int)
        assert isinstance(data["taxonomy_categories"], int)
        
        print(f"PASS: /api/admin/catalog-workspace/stats returns products={data['products']}, services={data['services']}, taxonomy={data['taxonomy_categories']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
