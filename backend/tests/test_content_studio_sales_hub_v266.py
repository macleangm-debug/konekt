"""
Content Studio & Sales Content Hub API Tests - v266
Tests for:
1. Content Template Data APIs (products, services, branding)
2. Staff login with sales role
3. Admin login for Content Studio access
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestContentTemplateAPIs:
    """Tests for /api/content-engine/template-data/* endpoints"""
    
    def test_get_template_products(self):
        """GET /api/content-engine/template-data/products returns enriched product data"""
        response = requests.get(f"{BASE_URL}/api/content-engine/template-data/products")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") == True
        assert "items" in data
        assert isinstance(data["items"], list)
        
        # Verify product structure if items exist
        if len(data["items"]) > 0:
            product = data["items"][0]
            assert "id" in product
            assert "name" in product
            assert "type" in product
            assert product["type"] == "product"
            assert "selling_price" in product
            assert "final_price" in product
            assert "has_promotion" in product
            assert "image_url" in product
            print(f"Products returned: {len(data['items'])}")
    
    def test_get_template_services(self):
        """GET /api/content-engine/template-data/services returns service data"""
        response = requests.get(f"{BASE_URL}/api/content-engine/template-data/services")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") == True
        assert "items" in data
        assert isinstance(data["items"], list)
        
        # Verify service structure if items exist
        if len(data["items"]) > 0:
            service = data["items"][0]
            assert "id" in service
            assert "name" in service
            assert "type" in service
            assert service["type"] == "service"
        print(f"Services returned: {len(data['items'])}")
    
    def test_get_template_branding(self):
        """GET /api/content-engine/template-data/branding returns branding info"""
        response = requests.get(f"{BASE_URL}/api/content-engine/template-data/branding")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("ok") == True
        assert "branding" in data
        
        branding = data["branding"]
        assert "company_name" in branding
        assert "trading_name" in branding
        assert "logo_url" in branding
        assert "phone" in branding
        assert "email" in branding
        assert "primary_color" in branding
        assert "accent_color" in branding
        print(f"Branding: {branding.get('trading_name')}")
    
    def test_products_have_promotion_data(self):
        """Products with promotions have promo_code and discount_amount"""
        response = requests.get(f"{BASE_URL}/api/content-engine/template-data/products")
        assert response.status_code == 200
        
        data = response.json()
        promo_products = [p for p in data["items"] if p.get("has_promotion")]
        
        if len(promo_products) > 0:
            promo = promo_products[0]
            assert "promo_code" in promo
            assert "discount_amount" in promo
            assert promo["promo_code"] != ""
            print(f"Found {len(promo_products)} products with promotions")
        else:
            print("No products with active promotions found")


class TestStaffAuth:
    """Tests for staff login (sales role) for Sales Content Hub access"""
    
    def test_staff_login_success(self):
        """Staff login with sales role succeeds"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": "staff@konekt.co.tz", "password": "Staff123!"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "sales"
        assert data["user"]["email"] == "staff@konekt.co.tz"
        print(f"Staff login successful: {data['user']['full_name']}")
    
    def test_staff_login_invalid_credentials(self):
        """Staff login with wrong password fails"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": "staff@konekt.co.tz", "password": "WrongPassword!"}
        )
        assert response.status_code in [401, 400]


class TestAdminAuth:
    """Tests for admin login for Content Studio access"""
    
    def test_admin_login_success(self):
        """Admin login succeeds"""
        response = requests.post(
            f"{BASE_URL}/api/admin/auth/login",
            json={"email": "admin@konekt.co.tz", "password": "KnktcKk_L-hw1wSyquvd!"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        print(f"Admin login successful: {data['user']['full_name']}")


class TestContentDataIntegrity:
    """Tests for data integrity in content template responses"""
    
    def test_products_have_required_fields_for_creative(self):
        """Products have all fields needed for branded creative generation"""
        response = requests.get(f"{BASE_URL}/api/content-engine/template-data/products")
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ["id", "name", "category", "image_url", "description", 
                          "selling_price", "final_price", "discount_amount", 
                          "has_promotion", "promo_code", "type"]
        
        for product in data["items"][:5]:  # Check first 5
            for field in required_fields:
                assert field in product, f"Missing field: {field} in product {product.get('name')}"
        
        print(f"All required fields present in products")
    
    def test_branding_has_required_fields_for_creative(self):
        """Branding has all fields needed for branded creative generation"""
        response = requests.get(f"{BASE_URL}/api/content-engine/template-data/branding")
        assert response.status_code == 200
        
        data = response.json()
        branding = data["branding"]
        
        required_fields = ["company_name", "trading_name", "tagline", "logo_url",
                          "phone", "email", "primary_color", "accent_color"]
        
        for field in required_fields:
            assert field in branding, f"Missing branding field: {field}"
        
        print(f"All required branding fields present")
    
    def test_products_with_images_for_sales_hub(self):
        """Products with images are available for Sales Content Hub"""
        response = requests.get(f"{BASE_URL}/api/content-engine/template-data/products")
        assert response.status_code == 200
        
        data = response.json()
        products_with_images = [p for p in data["items"] if p.get("image_url")]
        
        # Sales Content Hub filters to only show items with images
        assert len(products_with_images) > 0, "No products with images found for Sales Hub"
        print(f"Products with images for Sales Hub: {len(products_with_images)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
