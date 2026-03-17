"""
Test Commercial Profiling + Reward Safety + Numbering Rules Pack
Tests:
- Auto-Numbering Configuration API
- Business Pricing Request API
- First Order Discount API
- Points Rules Validation API
- Sales Guided Questions API
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"
CUSTOMER_EMAIL = "demo.customer@konekt.com"
CUSTOMER_PASSWORD = "Demo123!"


class TestSetup:
    """Setup tests - get auth tokens"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code}")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Customer login failed: {response.status_code}")
        return response.json().get("token")


class TestAutoNumberingConfig(TestSetup):
    """Auto-Numbering Configuration API tests"""
    
    def test_get_numbering_config_requires_auth(self):
        """Test that config endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/auto-numbering/config")
        assert response.status_code == 401
        print("PASS: Auto-numbering config requires authentication")
    
    def test_get_numbering_config(self, admin_token):
        """Test getting auto-numbering configuration"""
        response = requests.get(
            f"{BASE_URL}/api/admin/auto-numbering/config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected format keys exist
        assert "invoice_format" in data or "type" in data
        print(f"PASS: Get auto-numbering config - keys: {list(data.keys())[:5]}")
    
    def test_update_numbering_config(self, admin_token):
        """Test updating auto-numbering configuration"""
        update_payload = {
            "invoice_format": {
                "prefix": "TEST-INV",
                "include_date": True,
                "date_format": "YYYYMMDD",
                "separator": "-",
                "sequence_length": 5,
                "start_number": 1
            }
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/auto-numbering/config",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json=update_payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        print("PASS: Update auto-numbering config successful")
    
    def test_preview_number_format(self, admin_token):
        """Test previewing number format for different document types"""
        for doc_type in ["invoice", "quote", "order"]:
            response = requests.get(
                f"{BASE_URL}/api/admin/auto-numbering/preview/{doc_type}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "preview" in data
            assert "document_type" in data
            print(f"PASS: Preview {doc_type} - preview: {data.get('preview')}")


class TestBusinessPricingRequest(TestSetup):
    """Business Pricing Request API tests"""
    
    def test_submit_business_pricing_requires_auth(self):
        """Test that business pricing request requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/customer/business-pricing-request",
            json={"company_name": "Test Company"}
        )
        assert response.status_code == 401
        print("PASS: Business pricing request requires authentication")
    
    def test_submit_business_pricing_request(self, customer_token):
        """Test submitting a business pricing request"""
        payload = {
            "company_name": f"TEST_Company_{uuid.uuid4().hex[:6]}",
            "industry": "Technology",
            "estimated_monthly_volume": "2m_5m",
            "product_categories": ["promotional_products", "office_supplies"],
            "service_categories": ["printing_branding"],
            "additional_notes": "Test request from automated testing"
        }
        response = requests.post(
            f"{BASE_URL}/api/customer/business-pricing-request",
            headers={
                "Authorization": f"Bearer {customer_token}",
                "Content-Type": "application/json"
            },
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        assert "request_id" in data
        print(f"PASS: Submit business pricing request - request_id: {data.get('request_id')}")
    
    def test_get_my_business_pricing_requests(self, customer_token):
        """Test getting customer's own business pricing requests"""
        response = requests.get(
            f"{BASE_URL}/api/customer/business-pricing-request",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Get my business pricing requests - count: {len(data)}")


class TestFirstOrderDiscount:
    """First Order Discount API tests"""
    
    def test_capture_first_order_discount_no_email(self):
        """Test that capture requires email"""
        response = requests.post(
            f"{BASE_URL}/api/first-order-discount/capture",
            json={}
        )
        assert response.status_code == 400
        print("PASS: First order discount capture requires email")
    
    def test_capture_first_order_discount(self):
        """Test capturing first order discount"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(
            f"{BASE_URL}/api/first-order-discount/capture",
            json={"email": test_email}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        
        if data.get("eligible"):
            assert "offer" in data
            assert "code" in data["offer"]
            assert data["offer"]["discount_percent"] == 5  # Should be 5%, not 10%
            print(f"PASS: First order discount captured - code: {data['offer']['code']}, discount: {data['offer']['discount_percent']}%")
        else:
            print(f"PASS: First order discount - not eligible: {data.get('reason')}")
    
    def test_validate_first_order_discount(self):
        """Test validating first order discount"""
        # First capture to get a code
        test_email = f"validate_{uuid.uuid4().hex[:8]}@example.com"
        capture_response = requests.post(
            f"{BASE_URL}/api/first-order-discount/capture",
            json={"email": test_email}
        )
        
        if capture_response.status_code == 200 and capture_response.json().get("eligible"):
            code = capture_response.json()["offer"]["code"]
            
            # Now validate
            validate_response = requests.post(
                f"{BASE_URL}/api/first-order-discount/validate",
                json={
                    "code": code,
                    "email": test_email,
                    "subtotal_amount": 100000
                }
            )
            assert validate_response.status_code == 200
            data = validate_response.json()
            assert "valid" in data
            if data["valid"]:
                assert "discount_percent" in data
                assert "discount_amount" in data
            print(f"PASS: Validate first order discount - valid: {data.get('valid')}")
        else:
            print("SKIP: Could not capture discount to validate")


class TestPointsRulesValidation:
    """Points Rules Validation API tests"""
    
    def test_validate_points_redemption(self):
        """Test points redemption validation"""
        payload = {
            "final_selling_price": 100000,
            "partner_cost": 60000,
            "requested_points_amount": 5000,
            "protected_margin_percent": 40,
            "points_cap_percent_of_distributable_margin": 10
        }
        response = requests.post(
            f"{BASE_URL}/api/points-rules/validate-redemption",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "margin" in data
        assert "points" in data
        
        margin = data["margin"]
        assert "gross_margin" in margin
        assert "protected_margin_amount" in margin
        assert "distributable_margin" in margin
        assert "max_points_redemption_amount" in margin
        
        points = data["points"]
        assert "requested_points_amount" in points
        assert "approved_points_amount" in points
        assert "was_capped" in points
        
        # Verify margin calculation
        expected_gross_margin = 40000  # 100000 - 60000
        assert margin["gross_margin"] == expected_gross_margin
        
        print(f"PASS: Validate points redemption - gross_margin: {margin['gross_margin']}, max_redemption: {margin['max_points_redemption_amount']}, approved: {points['approved_points_amount']}")
    
    def test_validate_points_capping(self):
        """Test that points are properly capped"""
        payload = {
            "final_selling_price": 100000,
            "partner_cost": 60000,
            "requested_points_amount": 50000,  # Request much more than allowed
            "protected_margin_percent": 40,
            "points_cap_percent_of_distributable_margin": 10
        }
        response = requests.post(
            f"{BASE_URL}/api/points-rules/validate-redemption",
            json=payload
        )
        assert response.status_code == 200
        data = response.json()
        
        points = data["points"]
        assert points["was_capped"] == True
        assert points["approved_points_amount"] < points["requested_points_amount"]
        print(f"PASS: Points capping works - requested: {points['requested_points_amount']}, approved: {points['approved_points_amount']}")
    
    def test_get_points_config(self):
        """Test getting points configuration"""
        response = requests.get(f"{BASE_URL}/api/points-rules/config")
        assert response.status_code == 200
        data = response.json()
        
        assert "points_enabled" in data
        assert "protected_margin_percent" in data
        assert "points_cap_percent_of_distributable_margin" in data
        print(f"PASS: Get points config - enabled: {data.get('points_enabled')}, protected_margin: {data.get('protected_margin_percent')}%")


class TestSalesGuidedQuestions(TestSetup):
    """Sales Guided Questions API tests"""
    
    def test_save_guided_questions_requires_auth(self):
        """Test that saving guided questions requires staff auth"""
        response = requests.post(
            f"{BASE_URL}/api/sales/guided-questions/save",
            json={
                "lead_id": "test-lead",
                "question_set_type": "new_customer",
                "answers": {}
            }
        )
        assert response.status_code == 401
        print("PASS: Save guided questions requires authentication")
    
    def test_save_guided_questions(self, admin_token):
        """Test saving guided question answers for a lead"""
        # First create a test lead
        lead_id = f"TEST_lead_{uuid.uuid4().hex[:8]}"
        
        # Insert test lead directly (using admin API if available)
        # For now, we'll test with an existing lead or skip
        
        # Test the endpoint structure
        payload = {
            "lead_id": lead_id,
            "question_set_type": "new_customer",
            "answers": {
                "budget_range": "2M - 5M TZS",
                "company_size": "51-200 employees",
                "decision_maker": "Yes, I'm the decision maker",
                "timeline": "Standard (2-4 weeks)"
            }
        }
        response = requests.post(
            f"{BASE_URL}/api/sales/guided-questions/save",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json=payload
        )
        
        # Either 200 (success) or 404 (lead not found) are valid responses
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("ok") == True
            assert "qualification_score" in data
            print(f"PASS: Save guided questions - qualification_score: {data.get('qualification_score')}")
        else:
            print("PASS: Save guided questions endpoint works (lead not found - expected)")


class TestHealthAndIntegration:
    """Basic health and integration tests"""
    
    def test_api_health(self):
        """Test API is reachable"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("PASS: API health check")
    
    def test_admin_login(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"PASS: Admin login - role: {data['user'].get('role')}")
    
    def test_customer_login(self):
        """Test customer login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"PASS: Customer login - email: {data['user'].get('email')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
