"""
Backend tests for Hero Banner and Referral features
- Hero Banner CRUD (public and admin endpoints)
- Referral public endpoint and customer referral stats
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestHeroBannersPublic:
    """Test public hero banner endpoints"""
    
    def test_get_active_banners(self):
        """GET /api/hero-banners/active - returns active banners"""
        response = requests.get(f"{BASE_URL}/api/hero-banners/active")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "banners" in data, "Response should contain 'banners' key"
        assert isinstance(data["banners"], list), "Banners should be a list"
        
        # Check that we have seeded banners (3 were seeded per main agent note)
        if len(data["banners"]) > 0:
            banner = data["banners"][0]
            assert "id" in banner, "Banner should have 'id'"
            assert "title" in banner, "Banner should have 'title'"
            assert "image_url" in banner, "Banner should have 'image_url'"
            assert "is_active" in banner, "Banner should have 'is_active'"
            print(f"Found {len(data['banners'])} active banners")
    
    def test_active_banners_sorted_by_position(self):
        """Verify banners are sorted by position"""
        response = requests.get(f"{BASE_URL}/api/hero-banners/active")
        assert response.status_code == 200
        
        data = response.json()
        banners = data.get("banners", [])
        
        if len(banners) >= 2:
            positions = [b.get("position", 0) for b in banners]
            assert positions == sorted(positions), "Banners should be sorted by position"


class TestHeroBannersAdmin:
    """Test admin hero banner endpoints (require authentication)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        if response.status_code != 200:
            pytest.skip("Admin authentication failed")
        return response.json().get("token")
    
    def test_get_admin_banners_requires_auth(self):
        """GET /api/hero-banners/admin requires authentication"""
        response = requests.get(f"{BASE_URL}/api/hero-banners/admin")
        assert response.status_code == 401, "Should require authentication"
    
    def test_get_admin_banners_with_auth(self, admin_token):
        """GET /api/hero-banners/admin - returns all banners for admin"""
        response = requests.get(
            f"{BASE_URL}/api/hero-banners/admin",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "banners" in data
        assert isinstance(data["banners"], list)
        print(f"Admin view: {len(data['banners'])} total banners")
    
    def test_create_banner(self, admin_token):
        """POST /api/hero-banners/admin - create new banner"""
        test_banner = {
            "title": f"TEST_Banner_{uuid.uuid4().hex[:8]}",
            "subtitle": "Test Subtitle",
            "description": "Test Description",
            "image_url": "https://via.placeholder.com/1600x900",
            "primary_cta_label": "Test CTA",
            "primary_cta_url": "/test",
            "badge_text": "Test",
            "theme": "dark",
            "position": 99,
            "is_active": False  # Create inactive so it doesn't show on landing page
        }
        
        response = requests.post(
            f"{BASE_URL}/api/hero-banners/admin",
            json=test_banner,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "banner" in data
        created_banner = data["banner"]
        assert created_banner["title"] == test_banner["title"]
        assert created_banner["is_active"] == False
        assert "id" in created_banner
        
        # Store for cleanup
        print(f"Created test banner: {created_banner['id']}")
        
        # Cleanup - delete the test banner
        delete_response = requests.delete(
            f"{BASE_URL}/api/hero-banners/admin/{created_banner['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200
    
    def test_create_banner_requires_title_and_image(self, admin_token):
        """POST /api/hero-banners/admin validates required fields"""
        # Missing title
        response = requests.post(
            f"{BASE_URL}/api/hero-banners/admin",
            json={"image_url": "https://test.com/img.jpg"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 422, "Should require title"
        
        # Missing image_url  
        response = requests.post(
            f"{BASE_URL}/api/hero-banners/admin",
            json={"title": "Test Title"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 422, "Should require image_url"
    
    def test_delete_banner_requires_auth(self):
        """DELETE /api/hero-banners/admin/{id} requires authentication"""
        response = requests.delete(f"{BASE_URL}/api/hero-banners/admin/fake-id")
        assert response.status_code == 401
    
    def test_delete_nonexistent_banner(self, admin_token):
        """DELETE /api/hero-banners/admin/{id} returns 404 for unknown id"""
        response = requests.delete(
            f"{BASE_URL}/api/hero-banners/admin/nonexistent-id-12345",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404


class TestReferralPublic:
    """Test public referral endpoints"""
    
    def test_get_referral_by_code(self):
        """GET /api/referrals/code/{code} - returns referrer info"""
        response = requests.get(f"{BASE_URL}/api/referrals/code/KONEKT-164F71")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "referral_code" in data
        assert data["referral_code"] == "KONEKT-164F71"
        assert "referrer_name" in data
        assert "discount_percent" in data
        assert "message" in data
        
        print(f"Referral code {data['referral_code']} belongs to {data['referrer_name']}")
    
    def test_get_referral_by_invalid_code(self):
        """GET /api/referrals/code/{code} - returns 404 for invalid code"""
        response = requests.get(f"{BASE_URL}/api/referrals/code/INVALID-CODE-12345")
        assert response.status_code == 404
        
        data = response.json()
        assert "detail" in data
    
    def test_get_public_referral_settings(self):
        """GET /api/referrals/settings/public - returns program settings"""
        response = requests.get(f"{BASE_URL}/api/referrals/settings/public")
        assert response.status_code == 200
        
        data = response.json()
        assert "is_active" in data
        assert "referee_discount_type" in data
        assert "referee_discount_value" in data
        assert "share_message" in data
        assert "whatsapp_message" in data
        
        print(f"Referral program active: {data['is_active']}, discount: {data['referee_discount_value']}%")


class TestCustomerReferrals:
    """Test customer referral endpoints (require authentication)"""
    
    @pytest.fixture
    def customer_token(self):
        """Get customer/admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@konekt.co.tz",
            "password": "KnktcKk_L-hw1wSyquvd!"
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json().get("token")
    
    def test_get_my_referrals_requires_auth(self):
        """GET /api/customer/referrals/me requires authentication"""
        response = requests.get(f"{BASE_URL}/api/customer/referrals/me")
        assert response.status_code == 401
    
    def test_get_my_referrals_with_auth(self, customer_token):
        """GET /api/customer/referrals/me - returns user's referral data"""
        response = requests.get(
            f"{BASE_URL}/api/customer/referrals/me",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "referral_code" in data
        assert "referral_transactions" in data
        assert "total_referrals" in data
        assert "successful_referrals" in data
        assert "total_earned" in data
        assert "pending_rewards" in data
        assert "share_message" in data
        assert "whatsapp_message" in data
        
        print(f"User referral code: {data['referral_code']}, total referrals: {data['total_referrals']}")
    
    def test_get_referral_stats(self, customer_token):
        """GET /api/customer/referrals/stats - returns summary stats"""
        response = requests.get(
            f"{BASE_URL}/api/customer/referrals/stats",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "referral_code" in data
        assert "total_referrals" in data
        assert "successful_referrals" in data
        assert "pending_referrals" in data
        assert "total_earned" in data
        
        print(f"Stats - Total: {data['total_referrals']}, Successful: {data['successful_referrals']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
