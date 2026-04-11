"""
Content Center API Tests - v264
Testing the Content Creator Campaign System for Konekt B2B e-commerce platform.

Tests:
- GET /api/admin/content-center - Admin content list with filters
- GET /api/content-engine/campaigns - Campaign list
- GET /api/content-engine/suggestions - Smart suggestions
- POST /api/content-engine/generate-campaign - Generate campaign content
- GET /api/staff/content-feed - Sales content feed
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin authentication failed: {response.status_code}")


@pytest.fixture
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestContentCenterAPIs:
    """Content Center API endpoint tests"""

    def test_admin_content_center_list(self, admin_headers):
        """GET /api/admin/content-center - List content items"""
        response = requests.get(f"{BASE_URL}/api/admin/content-center", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True, "Response should have ok=True"
        assert "items" in data, "Response should have items array"
        assert "kpis" in data, "Response should have kpis object"
        
        # Verify KPIs structure
        kpis = data["kpis"]
        assert "active_campaigns" in kpis
        assert "total_content" in kpis
        assert "sales_content" in kpis
        assert "formats" in kpis
        
        print(f"Content Center: {len(data['items'])} items, {kpis['total_content']} total active")

    def test_admin_content_center_status_filter(self, admin_headers):
        """GET /api/admin/content-center?status=active - Filter by status"""
        response = requests.get(f"{BASE_URL}/api/admin/content-center?status=active", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") == True
        
        # All items should have active status
        for item in data.get("items", []):
            assert item.get("status") == "active", f"Item {item.get('id')} has status {item.get('status')}"
        
        print(f"Active content items: {len(data['items'])}")

    def test_admin_content_center_format_filter(self, admin_headers):
        """GET /api/admin/content-center?format=square - Filter by format"""
        response = requests.get(f"{BASE_URL}/api/admin/content-center?format=square", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") == True
        
        # All items should have square format
        for item in data.get("items", []):
            assert item.get("format") == "square", f"Item {item.get('id')} has format {item.get('format')}"
        
        print(f"Square format items: {len(data['items'])}")

    def test_campaigns_list(self, admin_headers):
        """GET /api/content-engine/campaigns - List active campaigns"""
        response = requests.get(f"{BASE_URL}/api/content-engine/campaigns", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        assert "campaigns" in data
        
        campaigns = data["campaigns"]
        print(f"Active campaigns: {len(campaigns)}")
        
        # Verify campaign structure
        for camp in campaigns:
            assert "id" in camp, "Campaign should have id"
            assert "name" in camp, "Campaign should have name"
            assert "code" in camp, "Campaign should have code"
            assert "content_count" in camp, "Campaign should have content_count"
            print(f"  - {camp.get('code')}: {camp.get('name')} ({camp.get('content_count')} assets)")

    def test_content_suggestions(self, admin_headers):
        """GET /api/content-engine/suggestions - Get smart suggestions"""
        response = requests.get(f"{BASE_URL}/api/content-engine/suggestions", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        assert "suggestions" in data
        
        suggestions = data["suggestions"]
        print(f"Content suggestions: {len(suggestions)}")
        
        # Verify suggestion structure if any exist
        for sug in suggestions[:3]:
            assert "type" in sug, "Suggestion should have type"
            assert "title" in sug, "Suggestion should have title"
            assert "action_type" in sug, "Suggestion should have action_type"
            print(f"  - {sug.get('type')}: {sug.get('title')}")

    def test_staff_content_feed(self, admin_headers):
        """GET /api/staff/content-feed - Sales content feed"""
        response = requests.get(f"{BASE_URL}/api/staff/content-feed", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        assert "items" in data
        
        items = data["items"]
        print(f"Staff content feed: {len(items)} items")
        
        # Verify items have sales role
        for item in items[:5]:
            assert item.get("role") == "sales", f"Item should have role=sales, got {item.get('role')}"

    def test_content_item_structure(self, admin_headers):
        """Verify content item has all required fields"""
        response = requests.get(f"{BASE_URL}/api/admin/content-center?status=active", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        items = data.get("items", [])
        
        if not items:
            pytest.skip("No content items to verify structure")
        
        # Check first item with image
        item_with_image = next((i for i in items if i.get("image_url")), None)
        if item_with_image:
            # Required fields for content card display
            assert "id" in item_with_image
            assert "image_url" in item_with_image
            assert "status" in item_with_image
            print(f"Item with image: {item_with_image.get('id')}")
            print(f"  - image_url: {item_with_image.get('image_url')[:50]}...")
            print(f"  - format: {item_with_image.get('format', 'N/A')}")
            print(f"  - has_promotion: {item_with_image.get('has_promotion', False)}")
            print(f"  - promotion_code: {item_with_image.get('promotion_code', 'N/A')}")

    def test_content_captions_structure(self, admin_headers):
        """Verify content items have captions"""
        response = requests.get(f"{BASE_URL}/api/admin/content-center?status=active", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        items = data.get("items", [])
        
        # Find item with captions
        item_with_captions = next((i for i in items if i.get("captions")), None)
        if item_with_captions:
            captions = item_with_captions.get("captions", {})
            print(f"Item captions structure:")
            print(f"  - short: {'Yes' if captions.get('short') or captions.get('short_social') else 'No'}")
            print(f"  - medium: {'Yes' if captions.get('medium') or captions.get('professional') else 'No'}")
            print(f"  - whatsapp_sales: {'Yes' if captions.get('whatsapp_sales') or captions.get('closing_script') else 'No'}")
            print(f"  - story: {'Yes' if captions.get('story') else 'No'}")
        else:
            print("No items with captions found")


class TestCampaignGeneration:
    """Campaign content generation tests"""

    def test_generate_campaign_requires_promotion_id(self, admin_headers):
        """POST /api/content-engine/generate-campaign - Requires promotion_id"""
        response = requests.post(
            f"{BASE_URL}/api/content-engine/generate-campaign",
            json={},
            headers=admin_headers
        )
        # Should fail validation without promotion_id
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"

    def test_generate_campaign_with_valid_promotion(self, admin_headers):
        """POST /api/content-engine/generate-campaign - Generate from promotion"""
        # First get a valid promotion ID
        campaigns_response = requests.get(f"{BASE_URL}/api/content-engine/campaigns", headers=admin_headers)
        if campaigns_response.status_code != 200:
            pytest.skip("Could not get campaigns list")
        
        campaigns = campaigns_response.json().get("campaigns", [])
        if not campaigns:
            pytest.skip("No campaigns available for testing")
        
        # Use first campaign
        promotion_id = campaigns[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/content-engine/generate-campaign",
            json={"promotion_id": promotion_id},
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("ok") == True
        assert "count" in data
        assert "assets" in data
        
        print(f"Generated {data['count']} assets for promotion {promotion_id}")


class TestContentArchive:
    """Content archive functionality tests"""

    def test_archive_content_item(self, admin_headers):
        """POST /api/admin/content-center/{id}/archive - Archive content"""
        # First get a content item
        response = requests.get(f"{BASE_URL}/api/admin/content-center?status=active", headers=admin_headers)
        if response.status_code != 200:
            pytest.skip("Could not get content list")
        
        items = response.json().get("items", [])
        if not items:
            pytest.skip("No content items to archive")
        
        # Archive the first item
        item_id = items[0]["id"]
        archive_response = requests.post(
            f"{BASE_URL}/api/admin/content-center/{item_id}/archive",
            json={},
            headers=admin_headers
        )
        assert archive_response.status_code == 200, f"Expected 200, got {archive_response.status_code}"
        
        data = archive_response.json()
        assert data.get("ok") == True
        
        print(f"Archived content item: {item_id}")


class TestContentEngineEndpoints:
    """Additional content engine endpoint tests"""

    def test_get_single_content_item(self, admin_headers):
        """GET /api/content-engine/{content_id} - Get single item"""
        # First get a content item ID
        response = requests.get(f"{BASE_URL}/api/admin/content-center", headers=admin_headers)
        if response.status_code != 200:
            pytest.skip("Could not get content list")
        
        items = response.json().get("items", [])
        if not items:
            pytest.skip("No content items available")
        
        content_id = items[0]["id"]
        
        item_response = requests.get(
            f"{BASE_URL}/api/content-engine/{content_id}",
            headers=admin_headers
        )
        assert item_response.status_code == 200, f"Expected 200, got {item_response.status_code}"
        
        data = item_response.json()
        assert data.get("ok") == True
        assert "item" in data
        assert data["item"]["id"] == content_id
        
        print(f"Retrieved content item: {content_id}")

    def test_get_share_data(self, admin_headers):
        """GET /api/content-engine/{content_id}/share-data - Get shareable data"""
        # First get a content item ID
        response = requests.get(f"{BASE_URL}/api/admin/content-center", headers=admin_headers)
        if response.status_code != 200:
            pytest.skip("Could not get content list")
        
        items = response.json().get("items", [])
        if not items:
            pytest.skip("No content items available")
        
        content_id = items[0]["id"]
        
        share_response = requests.get(
            f"{BASE_URL}/api/content-engine/{content_id}/share-data",
            headers=admin_headers
        )
        assert share_response.status_code == 200, f"Expected 200, got {share_response.status_code}"
        
        data = share_response.json()
        assert data.get("ok") == True
        
        # Verify share data structure
        assert "image_url" in data
        assert "captions" in data
        assert "headline" in data
        assert "format" in data
        
        print(f"Share data for {content_id}:")
        print(f"  - format: {data.get('format')}")
        print(f"  - promotion_code: {data.get('promotion_code', 'N/A')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
