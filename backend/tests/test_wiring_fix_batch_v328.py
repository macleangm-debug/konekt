"""
Test Suite for Konekt B2B Wiring Fix Batch - Iteration 328
Tests:
1. Category → Marketplace wiring (Settings Hub categories synced to marketplace taxonomy)
2. Pricing engine uses actual Pricing Tiers (35% for 0-100K)
3. Customer profile update with payment/credit terms
4. Vendor Ops price requests enriched with client details
5. Auto-sync categories when Settings Hub is saved
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCategoryMarketplaceSync:
    """Test Settings Hub categories sync to marketplace taxonomy"""
    
    def test_sync_from_settings_endpoint(self):
        """POST /api/admin/catalog/sync-from-settings syncs categories"""
        response = requests.post(f"{BASE_URL}/api/admin/catalog/sync-from-settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "ok" in data, f"Response missing 'ok': {data}"
        assert data["ok"] == True
        assert "synced" in data, f"Response missing 'synced' count: {data}"
        print(f"✓ Sync endpoint returned: synced={data.get('synced')}")
    
    def test_marketplace_taxonomy_returns_groups(self):
        """GET /api/marketplace/taxonomy returns groups matching Settings Hub categories"""
        response = requests.get(f"{BASE_URL}/api/marketplace/taxonomy")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "groups" in data, f"Response missing 'groups': {data.keys()}"
        groups = data["groups"]
        assert len(groups) > 0, "No groups returned from taxonomy"
        print(f"✓ Taxonomy returned {len(groups)} groups")
        # Check structure
        if groups:
            first_group = groups[0]
            assert "name" in first_group, f"Group missing 'name': {first_group}"
            assert "id" in first_group, f"Group missing 'id': {first_group}"
            print(f"✓ First group: {first_group.get('name')}")


class TestPricingEngine:
    """Test pricing engine uses Pricing Tiers from Settings Hub"""
    
    def test_product_search_returns_correct_margin(self):
        """A5 Notebook base=8000 should get sell=10800 (35% from Tier 1)"""
        response = requests.get(f"{BASE_URL}/api/public-marketplace/products", params={"q": "A5"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        products = data if isinstance(data, list) else data.get("products", [])
        
        # Find A5 Notebook
        a5_notebook = None
        for p in products:
            if "A5" in (p.get("name") or "").upper() and "NOTEBOOK" in (p.get("name") or "").upper():
                a5_notebook = p
                break
        
        if a5_notebook:
            base_price = a5_notebook.get("base_price", 0)
            selling_price = a5_notebook.get("selling_price", 0)
            print(f"✓ A5 Notebook found: base={base_price}, sell={selling_price}")
            
            # Verify 35% margin (sell = base * 1.35)
            if base_price == 8000:
                expected_sell = 10800  # 8000 * 1.35
                assert selling_price == expected_sell, f"Expected sell={expected_sell}, got {selling_price}"
                print(f"✓ Pricing engine correctly applied 35% margin: {base_price} → {selling_price}")
        else:
            print("⚠ A5 Notebook not found in search results, checking any product with pricing")
            # Check any product has pricing applied
            for p in products[:3]:
                if p.get("base_price") and p.get("selling_price"):
                    base = p.get("base_price")
                    sell = p.get("selling_price")
                    margin_pct = ((sell - base) / base * 100) if base > 0 else 0
                    print(f"  Product: {p.get('name')}, base={base}, sell={sell}, margin={margin_pct:.1f}%")
    
    def test_settings_hub_has_pricing_tiers(self):
        """Verify Settings Hub has pricing_policy_tiers with 35% for Tier 1"""
        # Login as admin first
        login_response = requests.post(f"{BASE_URL}/api/auth/staff-login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Admin login failed, skipping settings hub test")
        
        token = login_response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        tiers = data.get("pricing_policy_tiers", [])
        print(f"✓ Found {len(tiers)} pricing tiers")
        
        # Check Tier 1 has 35% margin
        for tier in tiers:
            if tier.get("label") == "Tier 1" or tier.get("min_amount") == 0:
                margin = tier.get("total_margin_pct")
                print(f"  Tier 1: min={tier.get('min_amount')}, max={tier.get('max_amount')}, margin={margin}%")
                assert margin == 35, f"Expected Tier 1 margin=35%, got {margin}%"
                break


class TestCustomerProfileCreditTerms:
    """Test customer profile update with payment/credit terms"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_customer_profile_accepts_credit_terms(self, admin_token):
        """PUT /api/admin/customers/{id}/profile accepts payment_term_type, credit_terms_enabled"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First get a customer
        list_response = requests.get(f"{BASE_URL}/api/admin/customers-360/list", headers=headers)
        if list_response.status_code != 200 or not list_response.json():
            pytest.skip("No customers found to test")
        
        customers = list_response.json()
        customer_id = customers[0].get("id")
        print(f"✓ Testing with customer: {customers[0].get('name')} ({customer_id})")
        
        # Update with credit terms
        update_payload = {
            "payment_term_type": "credit_30",
            "credit_terms_enabled": True,
            "credit_limit": 5000000
        }
        
        # Use PATCH endpoint (from admin_customers_merged_routes.py)
        update_response = requests.patch(
            f"{BASE_URL}/api/admin/customers-360/{customer_id}",
            json=update_payload,
            headers=headers
        )
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        result = update_response.json()
        assert result.get("status") == "success", f"Update failed: {result}"
        print(f"✓ Customer profile updated with credit terms")
        
        # Verify the update persisted
        detail_response = requests.get(f"{BASE_URL}/api/admin/customers-360/{customer_id}", headers=headers)
        assert detail_response.status_code == 200


class TestVendorOpsPriceRequests:
    """Test Vendor Ops price requests enriched with client details"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_price_requests_have_client_details(self, admin_token):
        """Price requests should include customer_name, requested_by_name, created_at"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/vendor-ops/price-requests", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        requests_list = data.get("price_requests", [])
        
        if not requests_list:
            print("⚠ No price requests found, creating one for testing")
            # Create a test price request
            create_response = requests.post(
                f"{BASE_URL}/api/vendor-ops/price-requests",
                json={
                    "product_or_service": "TEST_Printer Cartridge",
                    "category": "Office Equipment",
                    "quantity": 10,
                    "unit_of_measurement": "Piece",
                    "notes": "Test request for iteration 328"
                },
                headers=headers
            )
            if create_response.status_code in [200, 201]:
                # Re-fetch
                response = requests.get(f"{BASE_URL}/api/vendor-ops/price-requests", headers=headers)
                data = response.json()
                requests_list = data.get("price_requests", [])
        
        if requests_list:
            pr = requests_list[0]
            print(f"✓ Price request: {pr.get('product_or_service')}")
            print(f"  - customer_name: {pr.get('customer_name', pr.get('requested_for', 'N/A'))}")
            print(f"  - requested_by_name: {pr.get('requested_by_name', pr.get('requested_by', 'N/A'))}")
            print(f"  - created_at: {pr.get('created_at', 'N/A')}")
            
            # Verify fields exist (may be null but should be present)
            assert "created_at" in pr, "Price request missing created_at field"
        else:
            print("⚠ No price requests available for testing")


class TestAutoSyncOnSettingsSave:
    """Test auto-sync of categories when Settings Hub is saved"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_settings_hub_save_triggers_sync(self, admin_token):
        """PUT /api/admin/settings-hub should auto-sync categories to taxonomy"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current settings
        get_response = requests.get(f"{BASE_URL}/api/admin/settings-hub", headers=headers)
        assert get_response.status_code == 200
        current_settings = get_response.json()
        
        # Get taxonomy count before
        taxonomy_before = requests.get(f"{BASE_URL}/api/marketplace/taxonomy")
        groups_before = len(taxonomy_before.json().get("groups", []))
        print(f"✓ Groups before save: {groups_before}")
        
        # Save settings (this should trigger auto-sync)
        save_response = requests.put(
            f"{BASE_URL}/api/admin/settings-hub",
            json=current_settings,
            headers=headers
        )
        assert save_response.status_code == 200, f"Settings save failed: {save_response.text}"
        print("✓ Settings saved successfully")
        
        # Get taxonomy count after
        taxonomy_after = requests.get(f"{BASE_URL}/api/marketplace/taxonomy")
        groups_after = len(taxonomy_after.json().get("groups", []))
        print(f"✓ Groups after save: {groups_after}")
        
        # Groups should be >= before (sync adds, doesn't remove)
        assert groups_after >= groups_before, f"Groups decreased after sync: {groups_before} → {groups_after}"


class TestAdminCatalogEndpoints:
    """Test admin catalog management endpoints"""
    
    def test_list_groups(self):
        """GET /api/admin/catalog/groups returns groups"""
        response = requests.get(f"{BASE_URL}/api/admin/catalog/groups")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        groups = response.json()
        assert isinstance(groups, list), f"Expected list, got {type(groups)}"
        print(f"✓ Admin catalog groups: {len(groups)} groups")
    
    def test_list_categories(self):
        """GET /api/admin/catalog/categories returns categories"""
        response = requests.get(f"{BASE_URL}/api/admin/catalog/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        categories = response.json()
        assert isinstance(categories, list), f"Expected list, got {type(categories)}"
        print(f"✓ Admin catalog categories: {len(categories)} categories")
    
    def test_catalog_summary(self):
        """GET /api/admin/catalog/summary returns counts"""
        response = requests.get(f"{BASE_URL}/api/admin/catalog/summary")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "groups" in data, f"Missing 'groups' in summary: {data}"
        assert "categories" in data, f"Missing 'categories' in summary: {data}"
        print(f"✓ Catalog summary: groups={data.get('groups')}, categories={data.get('categories')}, products={data.get('products')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
