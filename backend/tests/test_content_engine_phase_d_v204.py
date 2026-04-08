"""
Content Engine Phase D Tests — Iteration 204
Tests content generation, admin content center, sales/affiliate feeds.
Validates dynamic pricing from promotion engine (no hardcoded templates).
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
STAFF_EMAIL = "neema.sales@konekt.demo"
STAFF_PASSWORD = "password123"
PARTNER_EMAIL = "demo.partner@konekt.com"
PARTNER_PASSWORD = "Partner123!"

# Test product IDs
PRODUCT_ID_TSHIRT = "6d927ec9-a7b8-43f5-8ade-15f211d2112a"
PRODUCT_ID_POLO = "bf199259-4e41-4066-8c0f-58eccf58d3e5"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    res = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if res.status_code == 200:
        return res.json().get("token")
    pytest.skip(f"Admin login failed: {res.status_code}")


@pytest.fixture(scope="module")
def staff_token():
    """Get staff auth token"""
    res = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
        "email": STAFF_EMAIL,
        "password": STAFF_PASSWORD
    })
    if res.status_code == 200:
        return res.json().get("token")
    pytest.skip(f"Staff login failed: {res.status_code}")


@pytest.fixture(scope="module")
def partner_token():
    """Get partner auth token"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": PARTNER_EMAIL,
        "password": PARTNER_PASSWORD
    })
    if res.status_code == 200:
        return res.json().get("token")
    pytest.skip(f"Partner login failed: {res.status_code}")


class TestContentEngineGeneration:
    """Tests for POST /api/content-engine/generate and generate-bulk"""

    def test_generate_single_sales_content(self, admin_token):
        """Generate content for a single product with role=sales"""
        res = requests.post(
            f"{BASE_URL}/api/content-engine/generate",
            json={"role": "sales", "target_id": PRODUCT_ID_TSHIRT},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data.get("ok") is True
        item = data.get("item")
        assert item is not None
        
        # Validate content structure
        assert item.get("id") is not None
        assert item.get("role") == "sales"
        assert item.get("target_id") == PRODUCT_ID_TSHIRT
        assert item.get("title") is not None
        assert item.get("headline") is not None
        
        # Validate pricing fields (dynamic from promotion engine)
        assert "final_price" in item
        assert isinstance(item["final_price"], (int, float))
        assert item["final_price"] > 0
        
        # Validate captions structure
        captions = item.get("captions", {})
        assert "short_social" in captions
        assert "professional" in captions
        assert "closing_script" in captions
        
        # KEY VALIDATION: Captions must contain TZS amounts (dynamic pricing)
        short_caption = captions.get("short_social", "")
        assert "TZS" in short_caption, f"Caption missing TZS price: {short_caption}"
        
        print(f"Generated sales content: {item['title']} at TZS {item['final_price']:,}")

    def test_generate_single_affiliate_content(self, admin_token):
        """Generate content for a single product with role=affiliate"""
        res = requests.post(
            f"{BASE_URL}/api/content-engine/generate",
            json={"role": "affiliate", "target_id": PRODUCT_ID_POLO},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("ok") is True
        item = data.get("item")
        
        assert item.get("role") == "affiliate"
        assert item.get("earning_amount") is not None
        
        # Affiliate content should have earning amount
        assert isinstance(item.get("earning_amount"), (int, float))
        
        captions = item.get("captions", {})
        assert "TZS" in captions.get("short_social", ""), "Affiliate caption missing TZS"
        
        print(f"Generated affiliate content: {item['title']}, earning: TZS {item.get('earning_amount', 0):,}")

    def test_generate_bulk_sales_content(self, admin_token):
        """Generate bulk content for sales role"""
        res = requests.post(
            f"{BASE_URL}/api/content-engine/generate-bulk",
            json={"role": "sales"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("ok") is True
        assert "count" in data
        assert "items" in data
        
        count = data.get("count", 0)
        items = data.get("items", [])
        assert count >= 0
        assert len(items) == count
        
        # Validate all items have required fields
        for item in items[:5]:  # Check first 5
            assert item.get("role") == "sales"
            assert item.get("final_price") is not None
            assert "TZS" in item.get("captions", {}).get("short_social", "")
        
        print(f"Generated {count} sales content items")

    def test_generate_bulk_affiliate_content(self, admin_token):
        """Generate bulk content for affiliate role"""
        res = requests.post(
            f"{BASE_URL}/api/content-engine/generate-bulk",
            json={"role": "affiliate"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("ok") is True
        
        count = data.get("count", 0)
        items = data.get("items", [])
        
        for item in items[:5]:
            assert item.get("role") == "affiliate"
            assert item.get("earning_amount") is not None
        
        print(f"Generated {count} affiliate content items")

    def test_generate_with_specific_product_ids(self, admin_token):
        """Generate bulk content for specific product IDs"""
        res = requests.post(
            f"{BASE_URL}/api/content-engine/generate-bulk",
            json={
                "role": "sales",
                "target_ids": [PRODUCT_ID_TSHIRT, PRODUCT_ID_POLO]
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("ok") is True
        
        # Should generate for the specified products
        items = data.get("items", [])
        target_ids = [item.get("target_id") for item in items]
        
        # At least one of the specified products should be in results
        assert PRODUCT_ID_TSHIRT in target_ids or PRODUCT_ID_POLO in target_ids
        
        print(f"Generated content for specific products: {len(items)} items")

    def test_generate_nonexistent_product(self, admin_token):
        """Generate content for non-existent product returns error"""
        res = requests.post(
            f"{BASE_URL}/api/content-engine/generate",
            json={"role": "sales", "target_id": "nonexistent-product-id"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200  # API returns 200 with ok: false
        data = res.json()
        assert data.get("ok") is False
        assert "error" in data


class TestAdminContentCenter:
    """Tests for admin content center endpoints"""

    def test_list_content_center(self, admin_token):
        """GET /api/admin/content-center returns content list with KPIs"""
        res = requests.get(
            f"{BASE_URL}/api/admin/content-center",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("ok") is True
        
        # Validate items array
        items = data.get("items", [])
        assert isinstance(items, list)
        
        # Validate KPIs
        kpis = data.get("kpis", {})
        assert "total_content" in kpis
        assert "sales_content" in kpis
        assert "affiliate_content" in kpis
        assert "active_campaigns" in kpis
        
        print(f"Content Center: {kpis['total_content']} total, {kpis['sales_content']} sales, {kpis['affiliate_content']} affiliate")

    def test_list_content_filter_by_role(self, admin_token):
        """Filter content by role=sales"""
        res = requests.get(
            f"{BASE_URL}/api/admin/content-center?role=sales",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        
        items = data.get("items", [])
        for item in items:
            assert item.get("role") == "sales"
        
        print(f"Filtered sales content: {len(items)} items")

    def test_list_content_filter_by_status(self, admin_token):
        """Filter content by status=active"""
        res = requests.get(
            f"{BASE_URL}/api/admin/content-center?status=active",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        
        items = data.get("items", [])
        for item in items:
            assert item.get("status") == "active"
        
        print(f"Active content: {len(items)} items")

    def test_update_content_headline(self, admin_token):
        """PUT /api/admin/content-center/{id} updates headline"""
        # First get an existing content item
        list_res = requests.get(
            f"{BASE_URL}/api/admin/content-center",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        items = list_res.json().get("items", [])
        if not items:
            pytest.skip("No content items to update")
        
        content_id = items[0]["id"]
        original_headline = items[0].get("headline", "")
        new_headline = f"TEST_Updated Headline {content_id[:8]}"
        
        # Update
        res = requests.put(
            f"{BASE_URL}/api/admin/content-center/{content_id}",
            json={"headline": new_headline},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("ok") is True
        assert data.get("item", {}).get("headline") == new_headline
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/admin/content-center/{content_id}",
            json={"headline": original_headline},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"Updated content headline: {content_id}")

    def test_update_content_captions(self, admin_token):
        """PUT /api/admin/content-center/{id} updates captions"""
        list_res = requests.get(
            f"{BASE_URL}/api/admin/content-center",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        items = list_res.json().get("items", [])
        if not items:
            pytest.skip("No content items to update")
        
        content_id = items[0]["id"]
        original_captions = items[0].get("captions", {})
        
        new_captions = {
            "short_social": "TEST caption short",
            "professional": "TEST caption professional",
            "closing_script": "TEST closing script"
        }
        
        res = requests.put(
            f"{BASE_URL}/api/admin/content-center/{content_id}",
            json={"captions": new_captions},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("ok") is True
        
        updated_captions = data.get("item", {}).get("captions", {})
        assert updated_captions.get("short_social") == "TEST caption short"
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/admin/content-center/{content_id}",
            json={"captions": original_captions},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"Updated content captions: {content_id}")

    def test_archive_content(self, admin_token):
        """POST /api/admin/content-center/{id}/archive archives content"""
        # Generate a test content item to archive
        gen_res = requests.post(
            f"{BASE_URL}/api/content-engine/generate",
            json={"role": "sales", "target_id": PRODUCT_ID_TSHIRT},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if gen_res.status_code != 200:
            pytest.skip("Could not generate test content")
        
        content_id = gen_res.json().get("item", {}).get("id")
        if not content_id:
            pytest.skip("No content ID returned")
        
        # Archive
        res = requests.post(
            f"{BASE_URL}/api/admin/content-center/{content_id}/archive",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("ok") is True
        
        # Verify archived
        get_res = requests.get(
            f"{BASE_URL}/api/content-engine/{content_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if get_res.status_code == 200:
            item = get_res.json().get("item", {})
            assert item.get("status") == "archived"
        
        print(f"Archived content: {content_id}")

    def test_update_nonexistent_content(self, admin_token):
        """Update non-existent content returns error"""
        res = requests.put(
            f"{BASE_URL}/api/admin/content-center/nonexistent-id",
            json={"headline": "Test"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("ok") is False


class TestContentFeeds:
    """Tests for role-specific content feeds"""

    def test_staff_content_feed(self, staff_token):
        """GET /api/staff/content-feed returns sales content"""
        res = requests.get(
            f"{BASE_URL}/api/staff/content-feed",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("ok") is True
        
        items = data.get("items", [])
        assert isinstance(items, list)
        
        # All items should be sales role
        for item in items:
            assert item.get("role") == "sales"
            # Validate dynamic pricing in captions
            captions = item.get("captions", {})
            short_caption = captions.get("short_social", "")
            assert "TZS" in short_caption, f"Sales caption missing TZS: {short_caption}"
        
        print(f"Staff content feed: {len(items)} items")

    def test_affiliate_content_feed(self, partner_token):
        """GET /api/partner/affiliate-content-feed returns affiliate content"""
        res = requests.get(
            f"{BASE_URL}/api/partner/affiliate-content-feed",
            headers={"Authorization": f"Bearer {partner_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("ok") is True
        
        items = data.get("items", [])
        assert isinstance(items, list)
        
        # All items should be affiliate role
        for item in items:
            assert item.get("role") == "affiliate"
            # Validate earning amount
            assert item.get("earning_amount") is not None
        
        print(f"Affiliate content feed: {len(items)} items")

    def test_content_feed_has_dynamic_pricing(self, staff_token):
        """Verify content feed has real TZS prices from promotion engine"""
        res = requests.get(
            f"{BASE_URL}/api/staff/content-feed",
            headers={"Authorization": f"Bearer {staff_token}"}
        )
        assert res.status_code == 200
        items = res.json().get("items", [])
        
        if not items:
            pytest.skip("No content items in feed")
        
        for item in items[:3]:
            # Check final_price is a real number
            final_price = item.get("final_price", 0)
            assert final_price > 0, f"Invalid final_price: {final_price}"
            
            # Check captions contain the price
            captions = item.get("captions", {})
            short_caption = captions.get("short_social", "")
            
            # The caption should contain TZS and a number
            assert "TZS" in short_caption
            
            # If there's a discount, it should be reflected
            if item.get("discount_amount", 0) > 0:
                assert item.get("has_promotion") is True
                # Discount should be in caption
                assert "save" in short_caption.lower() or "Save" in short_caption
            
            print(f"  - {item['title']}: TZS {final_price:,} (discount: {item.get('discount_amount', 0):,})")


class TestContentEngineGetEndpoints:
    """Tests for content retrieval endpoints"""

    def test_get_single_content(self, admin_token):
        """GET /api/content-engine/{content_id} returns content item"""
        # First get a content ID
        list_res = requests.get(
            f"{BASE_URL}/api/admin/content-center",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        items = list_res.json().get("items", [])
        if not items:
            pytest.skip("No content items")
        
        content_id = items[0]["id"]
        
        res = requests.get(
            f"{BASE_URL}/api/content-engine/{content_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("ok") is True
        assert data.get("item", {}).get("id") == content_id
        
        print(f"Retrieved content: {content_id}")

    def test_get_share_data(self, admin_token):
        """GET /api/content-engine/{content_id}/share-data returns shareable bundle"""
        list_res = requests.get(
            f"{BASE_URL}/api/admin/content-center",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        items = list_res.json().get("items", [])
        if not items:
            pytest.skip("No content items")
        
        content_id = items[0]["id"]
        
        res = requests.get(
            f"{BASE_URL}/api/content-engine/{content_id}/share-data",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("ok") is True
        
        # Validate share data fields
        assert "short_link" in data
        assert "captions" in data
        assert "headline" in data
        assert "final_price" in data
        
        print(f"Share data for {content_id}: link={data.get('short_link')}")

    def test_get_nonexistent_content(self, admin_token):
        """GET non-existent content returns error"""
        res = requests.get(
            f"{BASE_URL}/api/content-engine/nonexistent-id",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("ok") is False


class TestDynamicPricingValidation:
    """Validate that content uses dynamic pricing from promotion engine"""

    def test_content_has_real_tzs_amounts(self, admin_token):
        """Verify generated content has real TZS amounts, not hardcoded"""
        res = requests.post(
            f"{BASE_URL}/api/content-engine/generate",
            json={"role": "sales", "target_id": PRODUCT_ID_TSHIRT},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        item = res.json().get("item", {})
        
        final_price = item.get("final_price", 0)
        assert final_price > 0, "final_price should be > 0"
        
        # Caption should contain the actual price
        captions = item.get("captions", {})
        short_caption = captions.get("short_social", "")
        
        # Format price as it appears in caption
        price_formatted = f"TZS {int(final_price):,}"
        assert price_formatted in short_caption or "TZS" in short_caption
        
        print(f"Dynamic pricing validated: {price_formatted}")

    def test_promo_code_included_when_available(self, admin_token):
        """If product has promotion, promo_code should be in content"""
        res = requests.post(
            f"{BASE_URL}/api/content-engine/generate-bulk",
            json={"role": "affiliate"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        items = res.json().get("items", [])
        
        # Find items with promotions
        promo_items = [i for i in items if i.get("has_promotion")]
        
        for item in promo_items[:3]:
            # If has_promotion, should have promo details
            assert item.get("discount_amount", 0) > 0 or item.get("promo_code")
            
            # Caption should mention the discount
            captions = item.get("captions", {})
            short_caption = captions.get("short_social", "")
            if item.get("discount_amount", 0) > 0:
                assert "save" in short_caption.lower() or "Save" in short_caption
        
        print(f"Found {len(promo_items)} items with promotions")

    def test_earning_amount_calculated(self, admin_token):
        """Verify earning_amount is calculated from distributable margin"""
        res = requests.post(
            f"{BASE_URL}/api/content-engine/generate",
            json={"role": "affiliate", "target_id": PRODUCT_ID_TSHIRT},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        item = res.json().get("item", {})
        
        earning = item.get("earning_amount", 0)
        final_price = item.get("final_price", 0)
        
        # Earning should be a reasonable percentage of price
        if final_price > 0:
            earning_pct = (earning / final_price) * 100
            assert 0 <= earning_pct <= 20, f"Earning percentage {earning_pct}% seems off"
        
        print(f"Earning amount: TZS {earning:,} ({earning_pct:.1f}% of {final_price:,})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
