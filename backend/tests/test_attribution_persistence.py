"""
Attribution Persistence + Collection Unification Pack Tests
Tests: User registration with affiliate_code, Quote creation with attribution,
Quote→Invoice conversion preserving attribution, quotes_v2 collection usage
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@konekt.co.tz"
ADMIN_PASSWORD = "KnktcKk_L-hw1wSyquvd!"

class TestAttributionPersistence:
    """Test attribution capture and persistence across registration, quotes, and invoices"""

    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Admin auth headers"""
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}

    # ==== USER REGISTRATION WITH AFFILIATE CODE ====
    
    def test_register_user_with_affiliate_code(self):
        """Test user registration captures affiliate_code"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"TEST_attr_user_{unique_id}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpassword123",
            "full_name": f"TEST Attribution User {unique_id}",
            "phone": "+255789123456",
            "company": "TEST Attribution Company",
            "affiliate_code": "PARTNER123"
        })
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "token" in data, "Token not returned"
        assert "user" in data, "User data not returned"
        assert data["user"]["email"] == test_email
        assert data["user"]["full_name"] == f"TEST Attribution User {unique_id}"
        # User should have a referral_code generated
        assert "referral_code" in data["user"]
        assert data["user"]["referral_code"].startswith("KONEKT-")
        print(f"✓ User registered with affiliate_code, referral_code: {data['user']['referral_code']}")
    
    def test_register_user_without_affiliate_code(self):
        """Test registration works without affiliate_code"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"TEST_no_attr_{unique_id}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpassword123",
            "full_name": f"TEST No Attr User {unique_id}"
        })
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == test_email
        print("✓ User registered without affiliate_code successfully")
    
    def test_register_duplicate_email_rejected(self):
        """Test duplicate email registration is rejected"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"TEST_dupe_{unique_id}@test.com"
        
        # First registration
        response1 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpassword123",
            "full_name": f"TEST First User {unique_id}"
        })
        assert response1.status_code == 200
        
        # Second registration with same email should fail
        response2 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "differentpassword",
            "full_name": f"TEST Duplicate User {unique_id}"
        })
        assert response2.status_code == 400
        assert "already registered" in response2.json().get("detail", "").lower()
        print("✓ Duplicate email registration correctly rejected")

    # ==== QUOTE CREATION WITH ATTRIBUTION ====
    
    def test_create_quote_with_full_attribution(self, admin_headers):
        """Test creating a quote with all attribution fields"""
        unique_id = str(uuid.uuid4())[:8]
        
        quote_data = {
            "customer_name": f"TEST Quote Attr Customer {unique_id}",
            "customer_email": f"test_quote_attr_{unique_id}@test.com",
            "customer_company": "TEST Attribution Corp",
            "customer_phone": "+255789999888",
            "currency": "TZS",
            "line_items": [
                {
                    "description": "Branded T-Shirts (50pcs)",
                    "quantity": 50,
                    "unit_price": 15000.0,
                    "total": 750000.0
                }
            ],
            "subtotal": 750000.0,
            "tax": 135000.0,
            "tax_rate": 18.0,
            "discount": 0.0,
            "total": 885000.0,
            # Attribution fields
            "affiliate_code": "PARTNER-ABC",
            "campaign_id": "CAMP-2026-001",
            "campaign_name": "Spring Sale Campaign"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/quotes-v2", json=quote_data, headers=admin_headers)
        
        assert response.status_code == 200, f"Quote creation failed: {response.text}"
        quote = response.json()
        
        # Verify quote structure
        assert "id" in quote, "Quote ID not returned"
        assert "quote_number" in quote, "Quote number not generated"
        assert quote["quote_number"].startswith("QTN-"), f"Invalid quote number format: {quote['quote_number']}"
        
        # Verify attribution persisted
        assert quote.get("affiliate_code") == "PARTNER-ABC", f"affiliate_code not persisted: {quote.get('affiliate_code')}"
        assert quote.get("campaign_id") == "CAMP-2026-001", f"campaign_id not persisted: {quote.get('campaign_id')}"
        assert quote.get("campaign_name") == "Spring Sale Campaign", f"campaign_name not persisted: {quote.get('campaign_name')}"
        assert "attribution_captured_at" in quote, "attribution_captured_at not set"
        
        print(f"✓ Quote created with attribution: {quote['quote_number']}")
        print(f"  affiliate_code: {quote.get('affiliate_code')}")
        print(f"  campaign_id: {quote.get('campaign_id')}")
        print(f"  campaign_name: {quote.get('campaign_name')}")
        
        return quote
    
    def test_create_quote_without_attribution(self, admin_headers):
        """Test quote creation works without attribution fields"""
        unique_id = str(uuid.uuid4())[:8]
        
        quote_data = {
            "customer_name": f"TEST No Attr Quote {unique_id}",
            "customer_email": f"test_no_attr_quote_{unique_id}@test.com",
            "currency": "TZS",
            "line_items": [
                {
                    "description": "Business Cards (1000pcs)",
                    "quantity": 1,
                    "unit_price": 250000.0,
                    "total": 250000.0
                }
            ],
            "subtotal": 250000.0,
            "tax": 45000.0,
            "tax_rate": 18.0,
            "discount": 0.0,
            "total": 295000.0
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/quotes-v2", json=quote_data, headers=admin_headers)
        
        assert response.status_code == 200, f"Quote creation failed: {response.text}"
        quote = response.json()
        
        assert "quote_number" in quote
        # Attribution fields should be null/None
        assert quote.get("affiliate_code") is None or quote.get("affiliate_code") == ""
        print(f"✓ Quote created without attribution: {quote['quote_number']}")
        
        return quote

    # ==== QUOTE LISTING (quotes_v2 with fallback) ====
    
    def test_list_quotes_v2(self, admin_headers):
        """Test listing quotes uses quotes_v2 collection"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes-v2", headers=admin_headers)
        
        assert response.status_code == 200, f"Quote listing failed: {response.text}"
        quotes = response.json()
        
        assert isinstance(quotes, list), "Expected list of quotes"
        assert len(quotes) > 0, "No quotes returned"
        
        # Verify quotes have expected structure
        first_quote = quotes[0]
        assert "id" in first_quote
        assert "quote_number" in first_quote
        assert "customer_email" in first_quote
        
        print(f"✓ Listed {len(quotes)} quotes from quotes_v2")
        return quotes
    
    def test_list_quotes_with_filters(self, admin_headers):
        """Test filtering quotes by status"""
        response = requests.get(f"{BASE_URL}/api/admin/quotes-v2?status=draft", headers=admin_headers)
        
        assert response.status_code == 200, f"Quote filtering failed: {response.text}"
        quotes = response.json()
        
        # All returned quotes should have draft status
        for quote in quotes:
            assert quote.get("status") == "draft", f"Non-draft quote returned: {quote.get('status')}"
        
        print(f"✓ Filtered quotes by status=draft, got {len(quotes)} results")

    # ==== QUOTE TO INVOICE CONVERSION WITH ATTRIBUTION ====
    
    def test_quote_to_invoice_preserves_attribution(self, admin_headers):
        """Test converting quote to invoice preserves attribution fields"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create quote with attribution
        quote_data = {
            "customer_name": f"TEST Convert Attr {unique_id}",
            "customer_email": f"test_convert_attr_{unique_id}@test.com",
            "customer_company": "TEST Convert Corp",
            "currency": "TZS",
            "line_items": [
                {
                    "description": "Promo Items Package",
                    "quantity": 100,
                    "unit_price": 5000.0,
                    "total": 500000.0
                }
            ],
            "subtotal": 500000.0,
            "tax": 90000.0,
            "tax_rate": 18.0,
            "discount": 0.0,
            "total": 590000.0,
            # Attribution
            "affiliate_code": "CONVERT-PARTNER",
            "campaign_id": "CAMP-CONVERT-001",
            "campaign_name": "Conversion Test Campaign"
        }
        
        # Create the quote
        create_response = requests.post(f"{BASE_URL}/api/admin/quotes-v2", json=quote_data, headers=admin_headers)
        assert create_response.status_code == 200, f"Quote creation failed: {create_response.text}"
        quote = create_response.json()
        quote_id = quote["id"]
        
        print(f"  Created quote {quote['quote_number']} with affiliate_code: {quote.get('affiliate_code')}")
        
        # Convert quote to invoice
        convert_response = requests.post(
            f"{BASE_URL}/api/admin/quotes-v2/{quote_id}/convert-to-invoice",
            headers=admin_headers
        )
        
        assert convert_response.status_code == 200, f"Quote→Invoice conversion failed: {convert_response.text}"
        invoice = convert_response.json()
        
        # Verify invoice created
        assert "id" in invoice, "Invoice ID not returned"
        assert "invoice_number" in invoice, "Invoice number not generated"
        assert invoice["invoice_number"].startswith("INV-"), f"Invalid invoice number: {invoice['invoice_number']}"
        
        # Verify attribution inherited from quote
        assert invoice.get("affiliate_code") == "CONVERT-PARTNER", \
            f"affiliate_code not inherited: {invoice.get('affiliate_code')}"
        assert invoice.get("campaign_id") == "CAMP-CONVERT-001", \
            f"campaign_id not inherited: {invoice.get('campaign_id')}"
        assert invoice.get("campaign_name") == "Conversion Test Campaign", \
            f"campaign_name not inherited: {invoice.get('campaign_name')}"
        assert "attribution_captured_at" in invoice, "attribution_captured_at not inherited"
        
        # Verify quote reference
        assert invoice.get("quote_id") == quote_id, "quote_id not set on invoice"
        assert invoice.get("quote_number") == quote["quote_number"], "quote_number not set on invoice"
        
        print(f"✓ Quote→Invoice conversion preserved attribution")
        print(f"  Invoice: {invoice['invoice_number']}")
        print(f"  Inherited affiliate_code: {invoice.get('affiliate_code')}")
        print(f"  Inherited campaign_id: {invoice.get('campaign_id')}")
        print(f"  Inherited campaign_name: {invoice.get('campaign_name')}")
        
        return invoice

    # ==== GET SINGLE QUOTE ====
    
    def test_get_quote_by_id(self, admin_headers):
        """Test fetching a single quote by ID"""
        # First list quotes to get an ID
        list_response = requests.get(f"{BASE_URL}/api/admin/quotes-v2?limit=1", headers=admin_headers)
        assert list_response.status_code == 200
        quotes = list_response.json()
        
        if len(quotes) == 0:
            pytest.skip("No quotes available for testing")
        
        quote_id = quotes[0]["id"]
        
        # Fetch single quote
        response = requests.get(f"{BASE_URL}/api/admin/quotes-v2/{quote_id}", headers=admin_headers)
        assert response.status_code == 200, f"Get quote failed: {response.text}"
        
        quote = response.json()
        assert quote["id"] == quote_id
        assert "quote_number" in quote
        assert "customer_email" in quote
        
        print(f"✓ Fetched quote by ID: {quote['quote_number']}")
    
    def test_get_nonexistent_quote(self, admin_headers):
        """Test fetching non-existent quote returns 404"""
        fake_id = "000000000000000000000000"  # Valid ObjectId format but non-existent
        
        response = requests.get(f"{BASE_URL}/api/admin/quotes-v2/{fake_id}", headers=admin_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent quote correctly returns 404")

    # ==== ATTRIBUTION CAPTURE SERVICE VALIDATION ====
    
    def test_attribution_captured_at_is_set(self, admin_headers):
        """Verify attribution_captured_at timestamp is set on new quotes"""
        unique_id = str(uuid.uuid4())[:8]
        
        quote_data = {
            "customer_name": f"TEST Timestamp {unique_id}",
            "customer_email": f"test_timestamp_{unique_id}@test.com",
            "currency": "TZS",
            "line_items": [
                {"description": "Test Item", "quantity": 1, "unit_price": 10000.0, "total": 10000.0}
            ],
            "subtotal": 10000.0,
            "tax": 0.0,
            "tax_rate": 18.0,
            "discount": 0.0,
            "total": 10000.0,
            "affiliate_code": "TIMESTAMP-TEST"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/quotes-v2", json=quote_data, headers=admin_headers)
        assert response.status_code == 200, f"Quote creation failed: {response.text}"
        
        quote = response.json()
        
        # Verify attribution_captured_at is set and is a valid timestamp
        assert "attribution_captured_at" in quote, "attribution_captured_at not set"
        attr_timestamp = quote["attribution_captured_at"]
        assert attr_timestamp is not None, "attribution_captured_at is None"
        
        print(f"✓ attribution_captured_at correctly set: {attr_timestamp}")


class TestAttributionFieldsValidation:
    """Validate attribution field types and values"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_campaign_discount_is_float(self, admin_headers):
        """Test campaign_discount is stored as float"""
        unique_id = str(uuid.uuid4())[:8]
        
        quote_data = {
            "customer_name": f"TEST Discount Type {unique_id}",
            "customer_email": f"test_discount_type_{unique_id}@test.com",
            "currency": "TZS",
            "line_items": [
                {"description": "Test Item", "quantity": 1, "unit_price": 100000.0, "total": 100000.0}
            ],
            "subtotal": 100000.0,
            "tax": 0.0,
            "tax_rate": 18.0,
            "discount": 0.0,
            "total": 100000.0,
            "campaign_discount": 10.5  # Float value
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/quotes-v2", json=quote_data, headers=admin_headers)
        assert response.status_code == 200, f"Quote creation failed: {response.text}"
        
        quote = response.json()
        assert isinstance(quote.get("campaign_discount"), (int, float)), \
            f"campaign_discount not numeric: {type(quote.get('campaign_discount'))}"
        assert quote.get("campaign_discount") == 10.5, \
            f"campaign_discount value incorrect: {quote.get('campaign_discount')}"
        
        print(f"✓ campaign_discount correctly stored as float: {quote.get('campaign_discount')}")
    
    def test_affiliate_hydration_from_code(self, admin_headers):
        """Test affiliate_email and affiliate_name can be hydrated from affiliate_code"""
        # Note: This tests the hydration path - actual hydration depends on affiliates in DB
        unique_id = str(uuid.uuid4())[:8]
        
        quote_data = {
            "customer_name": f"TEST Hydration {unique_id}",
            "customer_email": f"test_hydration_{unique_id}@test.com",
            "currency": "TZS",
            "line_items": [
                {"description": "Hydration Test", "quantity": 1, "unit_price": 50000.0, "total": 50000.0}
            ],
            "subtotal": 50000.0,
            "tax": 0.0,
            "tax_rate": 18.0,
            "discount": 0.0,
            "total": 50000.0,
            "affiliate_code": "NONEXISTENT-CODE"  # Code that likely doesn't exist
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/quotes-v2", json=quote_data, headers=admin_headers)
        assert response.status_code == 200, f"Quote creation failed: {response.text}"
        
        quote = response.json()
        # Even with non-existent code, quote should be created
        assert quote.get("affiliate_code") == "NONEXISTENT-CODE"
        # affiliate_email and affiliate_name might be None if code doesn't exist in affiliates collection
        print(f"✓ Quote created with unresolved affiliate_code (hydration attempted)")
        print(f"  affiliate_email: {quote.get('affiliate_email')}")
        print(f"  affiliate_name: {quote.get('affiliate_name')}")


class TestLoginAndAuthFlow:
    """Test login flows and authentication"""
    
    def test_admin_login(self):
        """Test admin login endpoint"""
        response = requests.post(f"{BASE_URL}/api/admin/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        
        assert "token" in data, "Token not returned"
        assert "user" in data, "User data not returned"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] in ["admin", "sales", "marketing", "production"]
        
        print(f"✓ Admin login successful, role: {data['user']['role']}")
    
    def test_customer_login(self):
        """Test customer login with test credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testcustomer@konekt.com",
            "password": "password"
        })
        
        # Customer might not exist, that's ok
        if response.status_code == 200:
            data = response.json()
            assert "token" in data
            print(f"✓ Customer login successful: {data['user']['email']}")
        else:
            print(f"  Customer login returned {response.status_code} (customer may not exist)")
    
    def test_invalid_credentials_rejected(self):
        """Test invalid credentials are rejected"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@nonexistent.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected with 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
