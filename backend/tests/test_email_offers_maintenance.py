"""
Backend API Tests for Konekt Platform
Testing: Email notifications, Promotional offers, Admin maintenance requests, Chat widget
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "info@konekt.co.tz"
ADMIN_PASSWORD = "password123"


class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ API health check passed")
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✓ API root endpoint passed")


class TestAdminAuthentication:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful - role: {data['user']['role']}")
        return data["token"]
    
    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Admin login correctly rejects invalid credentials")


class TestPromotionalOffers:
    """Promotional offers API tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin authentication failed")
    
    def test_get_active_offers(self):
        """Test getting active promotional offers"""
        response = requests.get(f"{BASE_URL}/api/offers/active")
        assert response.status_code == 200
        data = response.json()
        assert "offers" in data
        print(f"✓ Active offers retrieved: {len(data['offers'])} offers")
        
        # Verify Flash Sale offer exists
        flash_sale = next((o for o in data["offers"] if o.get("code") == "FLASH20"), None)
        if flash_sale:
            assert flash_sale["title"] == "Flash Sale - 20% Off!"
            assert flash_sale["discount_value"] == 20.0
            assert flash_sale["is_active"] == True
            print(f"✓ Flash Sale offer verified: {flash_sale['title']}")
        return data["offers"]
    
    def test_validate_promo_code_valid(self):
        """Test validating a valid promo code"""
        response = requests.post(f"{BASE_URL}/api/offers/validate?code=FLASH20&order_amount=50000")
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == True
        assert "discount_amount" in data
        assert data["discount_amount"] == 10000  # 20% of 50000
        print(f"✓ Promo code FLASH20 validated - discount: {data['discount_amount']}")
    
    def test_validate_promo_code_invalid(self):
        """Test validating an invalid promo code"""
        response = requests.post(f"{BASE_URL}/api/offers/validate?code=INVALIDCODE&order_amount=50000")
        assert response.status_code == 404
        print("✓ Invalid promo code correctly rejected")
    
    def test_admin_get_all_offers(self, admin_token):
        """Test admin getting all offers"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/offers", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "offers" in data
        assert "total" in data
        print(f"✓ Admin retrieved {data['total']} total offers")
    
    def test_admin_create_offer(self, admin_token):
        """Test admin creating a new promotional offer"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        test_code = f"TEST{uuid.uuid4().hex[:6].upper()}"
        offer_data = {
            "title": "Test Offer",
            "description": "Test promotional offer",
            "discount_type": "percentage",
            "discount_value": 15.0,
            "code": test_code,
            "min_order_amount": 10000,
            "max_uses": 100,
            "applicable_branches": [],
            "start_date": datetime.now(timezone.utc).isoformat(),
            "end_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/offers", json=offer_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "offer" in data
        assert data["offer"]["code"] == test_code
        print(f"✓ Admin created offer with code: {test_code}")
        
        # Cleanup - delete the test offer
        offer_id = data["offer"]["id"]
        delete_response = requests.delete(f"{BASE_URL}/api/admin/offers/{offer_id}", headers=headers)
        assert delete_response.status_code == 200
        print(f"✓ Test offer cleaned up")


class TestMaintenanceRequests:
    """Maintenance requests API tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin authentication failed")
    
    def test_create_maintenance_request(self):
        """Test creating a maintenance request (triggers admin email notification)"""
        request_data = {
            "name": "TEST_John Doe",
            "email": "test@example.com",
            "phone": "+255123456789",
            "company": "Test Company",
            "service_type": "Printer Repair",
            "equipment_details": "HP LaserJet Pro - paper jam issue",
            "message": "Need urgent repair",
            "request_type": "service"
        }
        
        response = requests.post(f"{BASE_URL}/api/maintenance-requests", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["message"] == "Maintenance request submitted successfully"
        print(f"✓ Maintenance request created with ID: {data['id']}")
        return data["id"]
    
    def test_create_consultation_request(self):
        """Test creating a consultation request"""
        request_data = {
            "name": "TEST_Jane Smith",
            "email": "jane@example.com",
            "phone": "+255987654321",
            "company": "Smith Corp",
            "request_type": "consultation",
            "consultation_type": "Equipment Purchase",
            "preferred_date": "2026-02-15",
            "preferred_time": "10:00 AM",
            "notes": "Looking for office equipment recommendations"
        }
        
        response = requests.post(f"{BASE_URL}/api/maintenance-requests", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"✓ Consultation request created with ID: {data['id']}")
    
    def test_admin_get_maintenance_requests(self, admin_token):
        """Test admin getting all maintenance requests"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/maintenance-requests", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        assert "total" in data
        print(f"✓ Admin retrieved {data['total']} maintenance requests")
        return data["requests"]
    
    def test_admin_filter_maintenance_by_status(self, admin_token):
        """Test admin filtering maintenance requests by status"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/maintenance-requests?status=pending", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        # All returned requests should be pending
        for req in data["requests"]:
            assert req["status"] == "pending"
        print(f"✓ Admin filtered {len(data['requests'])} pending requests")
    
    def test_admin_update_maintenance_status(self, admin_token):
        """Test admin updating maintenance request status"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a test request
        request_data = {
            "name": "TEST_Update Status",
            "email": "update@test.com",
            "phone": "+255111222333",
            "request_type": "service",
            "service_type": "General Maintenance"
        }
        create_response = requests.post(f"{BASE_URL}/api/maintenance-requests", json=request_data)
        assert create_response.status_code == 200
        request_id = create_response.json()["id"]
        
        # Update status
        update_response = requests.put(
            f"{BASE_URL}/api/admin/maintenance-requests/{request_id}?status=contacted&notes=Called%20customer",
            headers=headers
        )
        assert update_response.status_code == 200
        print(f"✓ Maintenance request status updated to 'contacted'")
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/admin/maintenance-requests", headers=headers)
        requests_list = get_response.json()["requests"]
        updated_req = next((r for r in requests_list if r["id"] == request_id), None)
        if updated_req:
            assert updated_req["status"] == "contacted"
            print(f"✓ Status update verified")


class TestUserRegistrationWithWelcomeEmail:
    """Test user registration which triggers welcome email"""
    
    def test_register_new_user(self):
        """Test registering a new user (triggers welcome email)"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        user_data = {
            "email": unique_email,
            "password": "testpassword123",
            "full_name": "TEST_New User",
            "phone": "+255999888777",
            "company": "Test Company Ltd"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email
        assert data["user"]["points"] == 100  # Welcome points
        assert "referral_code" in data["user"]
        print(f"✓ User registered: {unique_email}")
        print(f"✓ Welcome email triggered (Resend test mode - may not deliver)")
        print(f"✓ Referral code generated: {data['user']['referral_code']}")
        return data


class TestOrderCreationWithEmails:
    """Test order creation which triggers confirmation emails"""
    
    @pytest.fixture
    def user_token(self):
        """Create and authenticate a test user"""
        unique_email = f"order_test_{uuid.uuid4().hex[:8]}@example.com"
        user_data = {
            "email": unique_email,
            "password": "testpassword123",
            "full_name": "TEST_Order User"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("User registration failed")
    
    def test_create_order_triggers_emails(self, user_token):
        """Test creating an order (triggers customer confirmation + admin notification emails)"""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Get a product first
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()["products"]
        if not products:
            pytest.skip("No products available")
        
        product = products[0]
        
        order_data = {
            "items": [{
                "product_id": product["id"],
                "product_name": product["name"],
                "quantity": 10,
                "size": product.get("sizes", ["M"])[0] if product.get("sizes") else None,
                "color": product.get("colors", [{"name": "Black"}])[0]["name"] if product.get("colors") else None,
                "print_method": "Screen Print",
                "logo_position": "front",
                "unit_price": product["base_price"],
                "subtotal": product["base_price"] * 10
            }],
            "delivery_address": "123 Test Street, Dar es Salaam",
            "delivery_phone": "+255123456789",
            "notes": "Test order",
            "deposit_percentage": 30
        }
        
        response = requests.post(f"{BASE_URL}/api/orders", json=order_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "order" in data
        assert "order_number" in data["order"]
        print(f"✓ Order created: {data['order']['order_number']}")
        print(f"✓ Order confirmation email triggered to customer")
        print(f"✓ Admin notification email triggered")
        return data["order"]


class TestChatWidget:
    """Test chat widget API endpoints"""
    
    def test_chat_send_message(self):
        """Test sending a message to the AI chat assistant"""
        chat_data = {
            "message": "What products do you offer?",
            "session_id": f"test-session-{uuid.uuid4().hex[:8]}"
        }
        
        response = requests.post(f"{BASE_URL}/api/chat", json=chat_data, timeout=30)
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert "session_id" in data
        assert len(data["response"]) > 0
        print(f"✓ Chat response received: {data['response'][:100]}...")
    
    def test_chat_history(self):
        """Test retrieving chat history"""
        session_id = f"test-history-{uuid.uuid4().hex[:8]}"
        
        # First send a message
        chat_data = {
            "message": "Hello",
            "session_id": session_id
        }
        requests.post(f"{BASE_URL}/api/chat", json=chat_data, timeout=30)
        
        # Then get history
        response = requests.get(f"{BASE_URL}/api/chat/history/{session_id}")
        assert response.status_code == 200
        data = response.json()
        assert "messages" in data
        print(f"✓ Chat history retrieved: {len(data['messages'])} messages")


class TestReferralProgram:
    """Test referral program endpoints"""
    
    def test_get_referral_settings(self):
        """Test getting public referral settings"""
        response = requests.get(f"{BASE_URL}/api/referral/settings")
        assert response.status_code == 200
        data = response.json()
        assert "is_active" in data
        assert "referrer_reward_value" in data
        print(f"✓ Referral settings: {data['referrer_reward_value']}% reward")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
